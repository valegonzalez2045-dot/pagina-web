import { BotonEnlace } from '../ui/BotonEnlace'
import type { AccionEnlace, EnlaceNavegacion } from '../../types'

interface EncabezadoProps {
  nombreMarca: string
  enlaces: EnlaceNavegacion[]
  accion: AccionEnlace
  /** Logo de la marca. Si no hay logo, se muestra el nombre escrito. */
  logo?: { src: string; alt: string }
}

export function Encabezado({
  nombreMarca,
  enlaces,
  accion,
  logo,
}: EncabezadoProps) {
  return (
    <header className="encabezado">
      {logo ? (
        <a className="logo logo-imagen" href="#inicio" aria-label={logo.alt}>
          <img src={logo.src} alt={logo.alt} />
        </a>
      ) : (
        <div className="logo">{nombreMarca}</div>
      )}

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
