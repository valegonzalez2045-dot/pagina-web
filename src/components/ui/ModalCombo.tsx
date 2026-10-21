import { useEffect, useRef, useState } from 'react'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'
import { precioANumero } from '../../utils/precio'
import { FotoPlaceholder } from './FotoPlaceholder'

interface ModalComboProps {
  combo: ComboProducto
  onCerrar: () => void
  onAgregar?: (item: ItemCarrito) => void
}

export function ModalCombo({ combo, onCerrar, onAgregar }: ModalComboProps) {
  const [agregado, setAgregado] = useState(false)
  const temporizador = useRef<number | null>(null)

  // Solo se muestra una foto: la principal del combo.
  const fotoPrincipal = combo.fotos[0]

  const agregarAlCarrito = () => {
    if (!onAgregar) return
    onAgregar({
      id: `combo::${combo.id}`,
      seccion: 'Combos',
      nombre: combo.nombre,
      src: combo.fotos[0] ?? '',
      precio: precioANumero(combo.precio),
      precioTexto: combo.precio || '💬 Por confirmar',
      cantidad: 1,
    })
    setAgregado(true)
    if (temporizador.current) window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setAgregado(false), 1400)
  }

  // Escape cierra el modal
  useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [onCerrar])

  // La página no se desplaza mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="modal-producto"
      role="dialog"
      aria-modal="true"
      aria-label={`Combo ${combo.nombre}`}
      onClick={onCerrar}
    >
      <div
        className="modal-producto-caja modal-combo-caja"
        onClick={(evento) => evento.stopPropagation()}
      >
        <button
          type="button"
          className="modal-producto-cerrar modal-combo-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="modal-producto-cuerpo combo-modal-cuerpo">
          {fotoPrincipal ? (
            <img
              className="combo-modal-foto"
              src={fotoPrincipal}
              alt={combo.nombre}
            />
          ) : (
            <div className="combo-modal-foto combo-modal-foto-vacia">
              <FotoPlaceholder
                etiqueta={`Foto ${combo.nombre}`}
                emoji={combo.emoji}
              />
            </div>
          )}

          <h2 className="combo-modal-titulo">{combo.nombre}</h2>

          {combo.descripcion && (
            <div className="modal-descripcion">
              <p>{combo.descripcion}</p>
            </div>
          )}

          <div className="combo-modal-precio">
            {combo.precio || 'Precio por confirmar'}
          </div>

          <div className="combo-modal-agregar">
            <button
              type="button"
              className="catalogo-cotizar-boton"
              onClick={agregarAlCarrito}
              aria-label={`Agregar ${combo.nombre} al carrito`}
            >
              {agregado ? '✓ Agregado al carrito' : 'Agregar al carrito 🛒'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
