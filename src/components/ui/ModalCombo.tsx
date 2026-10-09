import { useEffect, useRef, useState } from 'react'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'
import { precioANumero } from '../../utils/precio'
import { Lightbox } from './Lightbox'

interface ModalComboProps {
  combo: ComboProducto
  onCerrar: () => void
  onAgregar?: (item: ItemCarrito) => void
}

export function ModalCombo({ combo, onCerrar, onAgregar }: ModalComboProps) {
  const fotos = combo.fotos
  const [ampliada, setAmpliada] = useState<number | null>(null)
  const [agregado, setAgregado] = useState(false)
  const temporizador = useRef<number | null>(null)

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

  // Escape cierra la foto ampliada o el modal
  useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return
      if (ampliada !== null) setAmpliada(null)
      else onCerrar()
    }
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [onCerrar, ampliada])

  // La página no se desplaza mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const fotoActual = ampliada === null ? undefined : fotos[ampliada]

  return (
    <>
      <div
        className="modal-producto"
        role="dialog"
        aria-modal="true"
        aria-label={`Combo ${combo.nombre}`}
        onClick={onCerrar}
      >
        <div
          className="modal-producto-caja"
          onClick={(evento) => evento.stopPropagation()}
        >
          <header className="modal-producto-cabecera">
            <div>
              <h2>{combo.nombre}</h2>
              <p>
                {fotos.length > 0
                  ? `${combo.fotos.length} ${combo.fotos.length === 1 ? 'foto' : 'fotos'}`
                  : 'Muy pronto más fotos'}
              </p>
            </div>
            <button
              type="button"
              className="modal-producto-cerrar"
              onClick={onCerrar}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </header>

          <div className="modal-producto-cuerpo">
            {combo.descripcion && (
              <div className="modal-descripcion">
                <p>{combo.descripcion}</p>
              </div>
            )}

            <div className="combo-modal-precio">
              {combo.precio || 'Precio por confirmar'}
            </div>

            {fotos.length > 0 ? (
              <ul className="catalogo-lista">
                {fotos.map((src, i) => (
                  <li key={src}>
                    <button
                      type="button"
                      className="catalogo-foto"
                      onClick={() => setAmpliada(i)}
                      aria-label={`Ampliar foto ${i + 1} del combo ${combo.nombre}`}
                    >
                      <img src={src} alt={`${combo.nombre} ${i + 1}`} loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="catalogo-vacio">
                Aún no tengo fotos de este combo. Vuelve pronto 💕
              </p>
            )}

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

      {fotoActual && ampliada !== null && (
        <Lightbox
          foto={{ id: fotoActual, etiqueta: combo.nombre, src: fotoActual }}
          posicion={`${ampliada + 1} de ${fotos.length}`}
          onCerrar={() => setAmpliada(null)}
          onAnterior={() =>
            setAmpliada((i) =>
              i === null ? i : (i - 1 + fotos.length) % fotos.length,
            )
          }
          onSiguiente={() =>
            setAmpliada((i) => (i === null ? i : (i + 1) % fotos.length))
          }
        />
      )}
    </>
  )
}