import { Seccion } from '../ui/Seccion'
import { BotonEnlace } from '../ui/BotonEnlace'
import type { AccionEnlace } from '../../types'

interface MayoreoProps {
  beneficios: string[]
  accion: AccionEnlace
}

export function Mayoreo({ beneficios, accion }: MayoreoProps) {
  return (
    <Seccion
      id="mayoreo"
      subtitulo="PARA GRANDES ANTOS"
      titulo="Mayoreo 📦"
    >
      <div className="mayoreo">
        <div>
          <h3>¿Preparas un evento o vendes dulces?</h3>

          <p>
            Lleva nuestras creaciones a tus fiestas, empresas o tienda con
            precios especiales por cantidad… y el mismo sabor artesanal de
            siempre.
          </p>

          <BotonEnlace href={accion.href}>{accion.etiqueta}</BotonEnlace>
        </div>

        <ul>
          {beneficios.map((beneficio) => (
            <li key={beneficio}>{beneficio}</li>
          ))}
        </ul>
      </div>
    </Seccion>
  )
}
