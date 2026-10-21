import { useState } from 'react'
import { Seccion } from '../ui/Seccion'
import { TarjetaCombo } from './TarjetaCombo'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'
import { titulos } from '../../data/titulos'

interface CombosProps {
  combos: ComboProducto[]
  /** Foto principal que sale al lado del botón. */
  destacada?: string
  /** Texto del botón que despliega los combos. */
  tituloBoton?: string
  onAgregar?: (item: ItemCarrito) => void
  onVerCombo?: (combo: ComboProducto) => void
}

export function Combos({
  combos,
  destacada = '',
  tituloBoton = 'Encuentra el detalle perfecto para regalar',
  onAgregar,
  onVerCombo,
}: CombosProps) {
  const [abierto, setAbierto] = useState(false)
  const seccion = titulos.combos

  return (
    <Seccion
      id="combos"
      subtitulo={seccion?.subtitulo ?? ''}
      titulo={seccion?.titulo ?? 'Combos para enamorar 🎁'}
      variante="color"
    >
      <p className="combos-intro">
        Combos armados para regalar, celebrar o consentirte 💕 Toca un combo
        para ver todo lo que incluye y agrégalo directo a tu carrito.
      </p>

      {/* Botón + foto principal: al tocarlo se despliegan los combos */}
      <div className="combos-cta">
        <button
          type="button"
          className="combos-cta-boton"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="combos-lista"
        >
          <span className="combos-cta-texto">{tituloBoton}</span>
          <span className="combos-cta-flecha" aria-hidden="true">
            {abierto ? '▲' : '▼'}
          </span>
        </button>

        {destacada && (
          <img
            className="combos-cta-foto"
            src={destacada}
            alt="Combo de regalo"
            loading="lazy"
          />
        )}
      </div>

      {abierto && (
        <div className="combos-desplegado" id="combos-lista">
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
        </div>
      )}
    </Seccion>
  )
}
