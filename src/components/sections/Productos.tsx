import { Seccion } from '../ui/Seccion'
import { TarjetaProducto } from './TarjetaProducto'
import type { Producto } from '../../types'
import { titulos } from '../../data/titulos'

interface ProductosProps {
  productos: Producto[]
  onVerProducto?: (producto: Producto) => void
}

export function Productos({ productos, onVerProducto }: ProductosProps) {
  const seccion = titulos.productos

  return (
    <Seccion
      id="productos"
      subtitulo={seccion?.subtitulo ?? 'ELIGE TU ANTOJO'}
      titulo={seccion?.titulo ?? 'Nuestros productos'}
    >
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
