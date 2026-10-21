import { Tarjeta } from '../ui/Tarjeta'
import { FotoPlaceholder } from '../ui/FotoPlaceholder'
import type { Producto } from '../../types'
import { catalogo } from '../../data/catalogo'
import { portadas } from '../../data/portadas'
import { separarDescripcion } from '../../utils/descripcion'

interface TarjetaProductoProps {
  producto: Producto
  onVerProducto?: (producto: Producto) => void
}

export function TarjetaProducto({
  producto,
  onVerProducto,
}: TarjetaProductoProps) {
  // La foto de la tarjeta es la portada que se haya elegido en el panel;
  // si no hay, usa la primera del producto o la del catálogo.
  const primeraFoto =
    portadas[producto.id] ??
    producto.fotos[0] ??
    catalogo[producto.id]?.[0]?.src
  const { cuerpo } = separarDescripcion(producto.descripcion)

  return (
    <Tarjeta>
      {primeraFoto ? (
        <img
          className="foto-producto"
          src={primeraFoto}
          alt={producto.nombre}
          loading="lazy"
        />
      ) : (
        <FotoPlaceholder etiqueta={`Foto ${producto.nombre}`} />
      )}
      <h3>{producto.nombre}</h3>
      {cuerpo && <p className="producto-descripcion">{cuerpo}</p>}
      <button
        className="boton-producto"
        onClick={() => onVerProducto?.(producto)}
      >
        Ver producto
      </button>
    </Tarjeta>
  )
}
