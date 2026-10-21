import { Seccion } from '../ui/Seccion'
import { titulos } from '../../data/titulos'

interface NosotrosProps {
  nombreMarca: string
  parrafos: string[]
}

export function Nosotros({ nombreMarca, parrafos }: NosotrosProps) {
  const seccion = titulos.nosotros

  return (
    <Seccion
      id="nosotros"
      subtitulo={seccion?.subtitulo ?? 'HECHO A MANO, HECHO CON AMOR'}
      titulo={seccion?.titulo ?? 'Detrás de cada antojo 🎀'}
      variante="color"
    >
      <div className="nosotros">
        <h3>{nombreMarca}</h3>
        {parrafos.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
      </div>
    </Seccion>
  )
}
