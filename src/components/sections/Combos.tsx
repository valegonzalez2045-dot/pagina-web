import { Seccion } from '../ui/Seccion'
import { Tarjeta } from '../ui/Tarjeta'
import type { Combo } from '../../types'

interface CombosProps {
  combos: Combo[]
  onSeleccionarCombo?: (combo: Combo) => void
}

export function Combos({ combos, onSeleccionarCombo }: CombosProps) {
  return (
    <Seccion
      id="combos"
      subtitulo="REGALA DULZURA"
      titulo="Combos para enamorar 🎁"
      variante="color"
    >
      <div className="dos-columnas">
        {combos.map((combo) => (
          <Tarjeta key={combo.id} className="especial">
            <h3>{combo.titulo}</h3>
            <p>{combo.descripcion}</p>
            {combo.href ? (
              <a href={combo.href} target="_blank" rel="noreferrer">
                {combo.textoBoton}
              </a>
            ) : (
              <button onClick={() => onSeleccionarCombo?.(combo)}>
                {combo.textoBoton}
              </button>
            )}
          </Tarjeta>
        ))}
      </div>
    </Seccion>
  )
}
