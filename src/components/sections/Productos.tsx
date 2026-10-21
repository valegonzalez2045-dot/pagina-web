import { Seccion } from '../ui/Seccion'
import { TarjetaProducto } from './TarjetaProducto'
import type { Producto } from '../../types'

interface ProductosProps {
  productos: Producto[]
  onVerProducto?: (producto: Producto) => void
}

export function Productos({ productos, onVerProducto }: ProductosProps) {
  return (
    <Seccion id="productos" subtitulo="ELIGE TU ANTOJO" titulo="Nuestros productos">
      <div className="productos">
        {productos.map((producto) => (
          <TarjetaProducto
            key={producto.id}
            producto={producto}
            onVerProducto={onVerProducto}
          />
        ))}
      </div>
    </Seccion>
  )
}
