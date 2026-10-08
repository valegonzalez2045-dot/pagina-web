import { Fragment } from 'react'
import { BotonEnlace } from '../ui/BotonEnlace'
import type { AccionEnlace } from '../../types'

interface InicioProps {
  etiqueta: string
  lineasTitulo: string[]
  descripcion: string
  accion: AccionEnlace
}

export function Inicio({
  etiqueta,
  lineasTitulo,
  descripcion,
  accion,
}: InicioProps) {
  return (
    <section id="inicio" className="inicio">
      <div className="inicio-texto">
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
