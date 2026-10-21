import { BotonEnlace } from '../ui/BotonEnlace'
import type { AccionEnlace, EnlaceNavegacion } from '../../types'

interface EncabezadoProps {
  nombreMarca: string
  enlaces: EnlaceNavegacion[]
  accion: AccionEnlace
}

export function Encabezado({
  nombreMarca,
  enlaces,
  accion,
}: EncabezadoProps) {
  return (
    <header className="encabezado">
      <div className="logo">{nombreMarca}</div>

      <nav>
        {enlaces.map((enlace) => (
          <a key={enlace.href} href={enlace.href}>
            {enlace.etiqueta}
          </a>
        ))}
      </nav>

      <BotonEnlace className="boton-pedido" href={accion.href}>
        {accion.etiqueta}
      </BotonEnlace>
    </header>
  )
}
