import { Tarjeta } from '../ui/Tarjeta'
import { FotoPlaceholder } from '../ui/FotoPlaceholder'
import type { Producto } from '../../types'

interface TarjetaProductoProps {
  producto: Producto
  onVerProducto?: (producto: Producto) => void
}

export function TarjetaProducto({
  producto,
  onVerProducto,
}: TarjetaProductoProps) {
  return (
    <Tarjeta>
      {producto.fotos.length > 0 ? (
        <img
          className="foto-producto"
          src={producto.fotos[0]}
          alt={producto.nombre}
          loading="lazy"
        />
      ) : (
        <FotoPlaceholder etiqueta={`Foto ${producto.nombre}`} />
      )}
      <h3>{producto.nombre}</h3>
      <p>{producto.descripcion}</p>
      <button
        className="boton-producto"
        onClick={() => onVerProducto?.(producto)}
      >
        Ver producto
      </button>
    </Tarjeta>
  )
}
