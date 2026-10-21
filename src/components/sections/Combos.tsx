import { useEffect, useState } from 'react'
import { Seccion } from '../ui/Seccion'
import { Lightbox } from '../ui/Lightbox'
import { TarjetaCombo } from './TarjetaCombo'
import type { ItemCarrito } from '../../types'
import type { ComboProducto } from '../../data/combos'
import { titulos } from '../../data/titulos'

interface CombosProps {
  combos: ComboProducto[]
  /** Fotos reales de combos que se muestran en la tira de arriba. */
  muestra?: string[]
  onAgregar?: (item: ItemCarrito) => void
  onVerCombo?: (combo: ComboProducto) => void
}

export function Combos({ combos, muestra = [], onAgregar, onVerCombo }: CombosProps) {
  const [indice, setIndice] = useState<number | null>(null)
  const seccion = titulos.combos

  const irAnterior = () =>
    setIndice((i) => (i === null ? i : (i - 1 + muestra.length) % muestra.length))

  const irSiguiente = () =>
    setIndice((i) => (i === null ? i : (i + 1) % muestra.length))

  // Teclado: Escape cierra, flechas navegan (solo actúan si hay una foto abierta)
  useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      setIndice((i) => {
        if (i === null) return i
        if (evento.key === 'Escape') return null
        if (evento.key === 'ArrowLeft') return (i - 1 + muestra.length) % muestra.length
        if (evento.key === 'ArrowRight') return (i + 1) % muestra.length
        return i
      })
    }

    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [muestra.length])

  // Mientras la foto está ampliada, la página no se desplaza
  useEffect(() => {
    document.body.style.overflow = indice === null ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [indice])

  const fotoActual = indice === null ? undefined : muestra[indice]

  return (
    <Seccion
      id="combos"
      subtitulo={seccion?.subtitulo ?? 'REGALA DULZURA'}
      titulo={seccion?.titulo ?? 'Combos para enamorar 🎁'}
      variante="color"
    >
      <p className="combos-intro">
        Combos armados para regalar, celebrar o consentirte 💕 Toca un combo
        para ver todo lo que incluye y agrégalo directo a tu carrito.
      </p>

      {muestra.length > 0 && (
        <>
          <h3 className="combos-muestra-titulo">Así se ven nuestros combos 📸</h3>
          <div className="combos-muestra">
            {muestra.map((src, i) => (
              <button
                key={src}
                type="button"
                className="combos-muestra-foto"
                onClick={() => setIndice(i)}
                aria-label={`Ampliar foto de combo ${i + 1}`}
              >
                <img src={src} alt={`Combo ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}

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

      {fotoActual && indice !== null && (
        <Lightbox
          foto={{ id: fotoActual, etiqueta: 'Combo', src: fotoActual }}
          posicion={`${indice + 1} de ${muestra.length}`}
          onCerrar={() => setIndice(null)}
          onAnterior={irAnterior}
          onSiguiente={irSiguiente}
        />
      )}
    </Seccion>
  )
}
