import { Seccion } from '../ui/Seccion'
import { TarjetaCombo } from './TarjetaCombo'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'

interface CombosProps {
  combos: ComboProducto[]
  onAgregar?: (item: ItemCarrito) => void
}

export function Combos({ combos, onAgregar }: CombosProps) {
  return (
    <Seccion
      id="combos"
      subtitulo="REGALA DULZURA"
      titulo="Combos para enamorar 🎁"
      variante="color"
    >
      <p className="combos-intro">
        Combos armados para regalar, celebrar o consentirte 💕 Cada uno se agrega
        directo a tu carrito.
      </p>
      <div className="productos">
        {combos.map((combo) => (
          <TarjetaCombo
            key={combo.id}
            combo={combo}
            onAgregar={onAgregar}
          />
        ))}
      </div>
    </Seccion>
  )
}