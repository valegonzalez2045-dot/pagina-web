import { useRef, useState } from 'react'
import { Tarjeta } from '../ui/Tarjeta'
import { FotoPlaceholder } from '../ui/FotoPlaceholder'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'
import { precioANumero } from '../../utils/precio'

interface TarjetaComboProps {
  combo: ComboProducto
  onAgregar?: (item: ItemCarrito) => void
  onVerCombo?: (combo: ComboProducto) => void
}

export function TarjetaCombo({
  combo,
  onAgregar,
  onVerCombo,
}: TarjetaComboProps) {
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

  // En la tarjeta solo se ve la foto, el nombre y el precio; la
  // descripción y todas las fotos se abren en el modal de "Ver combo".
  const primeraFoto = combo.fotos[0]

  return (
    <Tarjeta>
      {primeraFoto ? (
        <img
          className="foto-producto"
          src={primeraFoto}
          alt={combo.nombre}
          loading="lazy"
        />
      ) : (
        <FotoPlaceholder etiqueta={`Foto ${combo.nombre}`} />
      )}
      <h3>{combo.nombre}</h3>
      <p className="combo-precio">{combo.precio || 'Precio por confirmar'}</p>
      <div className="combo-acciones">
        <button
          type="button"
          className="boton-ver-combo"
          onClick={() => onVerCombo?.(combo)}
          aria-label={`Ver ${combo.nombre}`}
        >
          Ver combo 👀
        </button>
        <button
          type="button"
          className="boton-producto boton-producto-agregar"
          onClick={agregarAlCarrito}
          aria-label={`Agregar ${combo.nombre} al carrito`}
        >
          {agregado ? '✓ Agregado' : 'Agregar al carrito 🛒'}
        </button>
      </div>
    </Tarjeta>
  )
}