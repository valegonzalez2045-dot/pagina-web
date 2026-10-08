import { Seccion } from '../ui/Seccion'

interface NosotrosProps {
  nombreMarca: string
  parrafos: string[]
}

export function Nosotros({ nombreMarca, parrafos }: NosotrosProps) {
  return (
    <Seccion
      id="nosotros"
      subtitulo="HECHO A MANO, HECHO CON AMOR"
      titulo="Detrás de cada antojo 🎀"
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
