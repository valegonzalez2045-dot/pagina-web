import { Fragment, useState } from 'react'
import { BotonEnlace } from '../ui/BotonEnlace'
import type { AccionEnlace } from '../../types'

interface InicioProps {
  etiqueta: string
  lineasTitulo: string[]
  descripcion: string
  accion: AccionEnlace
  /** Logo de la marca (imagen) que se muestra arriba del mensaje. */
  logo?: { src: string; alt: string }
}

export function Inicio({
  etiqueta,
  lineasTitulo,
  descripcion,
  accion,
  logo,
}: InicioProps) {
  // Si la imagen del logo no existe, se oculta para no mostrar un ícono roto.
  const [logoVisible, setLogoVisible] = useState(true)

  return (
    <section id="inicio" className="inicio">
      <div className="inicio-texto">
        {logo && logoVisible && (
          <img
            className="inicio-logo"
            src={logo.src}
            alt={logo.alt}
            onError={() => setLogoVisible(false)}
          />
        )}

        <p className="pequeno">{etiqueta}</p>

        <h1>
          {lineasTitulo.map((linea, i) => (
            <Fragment key={linea}>
              {linea}
              {i < lineasTitulo.length - 1 && <br />}
            </Fragment>
          ))}
        </h1>

        <p>{descripcion}</p>

        <BotonEnlace href={accion.href}>{accion.etiqueta}</BotonEnlace>
      </div>
    </section>
  )
}
