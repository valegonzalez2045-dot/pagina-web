import { useRef, useState } from 'react'
import { Tarjeta } from '../ui/Tarjeta'
import { FotoPlaceholder } from '../ui/FotoPlaceholder'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'
import { precioANumero } from '../../utils/precio'

interface TarjetaComboProps {
  combo: ComboProducto
  onAgregar?: (item: ItemCarrito) => void
}

export function TarjetaCombo({ combo, onAgregar }: TarjetaComboProps) {
  const [agregado, setAgregado] = useState(false)
  const temporizador = useRef<number | null>(null)

  const agregarAlCarrito = () => {
    if (!onAgregar) return
    onAgregar({
      id: `combo::${combo.id}`,
      seccion: 'Combos',
      nombre: combo.nombre,
      src: combo.foto,
      precio: precioANumero(combo.precio),
      precioTexto: combo.precio || '💬 Por confirmar',
      cantidad: 1,
    })
    setAgregado(true)
    if (temporizador.current) window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setAgregado(false), 1400)
  }

  return (
    <Tarjeta>
      {combo.foto ? (
        <img
          className="foto-producto"
          src={combo.foto}
          alt={combo.nombre}
          loading="lazy"
        />
      ) : (
        <FotoPlaceholder etiqueta={`Foto ${combo.nombre}`} />
      )}
      <h3>{combo.nombre}</h3>
      {combo.descripcion && <p className="producto-descripcion">{combo.descripcion}</p>}
      <p className="combo-precio">{combo.precio || 'Precio por confirmar'}</p>
      <button
        type="button"
        className="boton-producto"
        onClick={agregarAlCarrito}
        aria-label={`Agregar ${combo.nombre} al carrito`}
      >
        {agregado ? '✓ Agregado' : 'Agregar al carrito 🛒'}
      </button>
    </Tarjeta>
  )
}