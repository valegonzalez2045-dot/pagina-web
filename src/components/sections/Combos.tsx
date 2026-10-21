import { Seccion } from '../ui/Seccion'
import { TarjetaCombo } from './TarjetaCombo'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'
import { titulos } from '../../data/titulos'

interface CombosProps {
  combos: ComboProducto[]
  onAgregar?: (item: ItemCarrito) => void
  onVerCombo?: (combo: ComboProducto) => void
}

export function Combos({ combos, onAgregar, onVerCombo }: CombosProps) {
  const seccion = titulos.combos

  return (
    <Seccion
      id="combos"
      subtitulo={seccion?.subtitulo ?? 'REGALA DULZURA'}
      titulo={seccion?.titulo ?? 'Combos para enamorar 🎁'}
      variante="color"
    >
      <p className="combos-intro">
        Combos armados para regalar, celebrar o consentirte 💕 Toca un combo
        para ver todo lo que incluye y agrégarlo directo a tu carrito.
      </p>
      <div className="productos">
        {combos.map((combo) => (
          <TarjetaCombo
            key={combo.id}
            combo={combo}
            onAgregar={onAgregar}
            onVerCombo={onVerCombo}
          />
        ))}
      </div>
    </Seccion>
  )
}