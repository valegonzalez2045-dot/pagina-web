import { useEffect, useState } from 'react'
import { Seccion } from '../ui/Seccion'
import { Lightbox } from '../ui/Lightbox'
import type { FotoGaleria } from '../../types'
import { titulos } from '../../data/titulos'

interface GaleriaProps {
  fotos: FotoGaleria[]
  mensaje: string
  /** Fotos que salen en la tira horizontal de arriba (combos). */
  tira?: string[]
  /** Título de la tira horizontal. */
  tituloTira?: string
}

export function Galeria({
  fotos,
  mensaje,
  tira = [],
  tituloTira = '',
}: GaleriaProps) {
  const [indice, setIndice] = useState<number | null>(null)
  const [indiceTira, setIndiceTira] = useState<number | null>(null)

  const irAnterior = () =>
    setIndice((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length))

  const irSiguiente = () =>
    setIndice((i) => (i === null ? i : (i + 1) % fotos.length))

  const irAnteriorTira = () =>
    setIndiceTira((i) =>
      i === null ? i : (i - 1 + tira.length) % tira.length,
    )

  const irSiguienteTira = () =>
    setIndiceTira((i) => (i === null ? i : (i + 1) % tira.length))

  // Teclado: Escape cierra, flechas navegan (solo actúan si hay una foto abierta)
  useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      setIndice((i) => {
        if (i === null) return i
        if (evento.key === 'Escape') return null
        if (evento.key === 'ArrowLeft') return (i - 1 + fotos.length) % fotos.length
        if (evento.key === 'ArrowRight') return (i + 1) % fotos.length
        return i
      })
      setIndiceTira((i) => {
        if (i === null) return i
        if (evento.key === 'Escape') return null
        if (evento.key === 'ArrowLeft') return (i - 1 + tira.length) % tira.length
        if (evento.key === 'ArrowRight') return (i + 1) % tira.length
        return i
      })
    }

    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [fotos.length, tira.length])

  // Mientras la foto está ampliada, la página no se desplaza
  useEffect(() => {
    document.body.style.overflow =
      indice === null && indiceTira === null ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [indice, indiceTira])

  const fotoActual = indice === null ? undefined : fotos[indice]
  const fotoTira = indiceTira === null ? undefined : tira[indiceTira]
  const seccion = titulos.galeria

  return (
    <Seccion
      id="galeria"
      subtitulo={seccion?.subtitulo ?? 'MIRA Y ANTOJATE'}
      titulo={seccion?.titulo ?? 'Galería de antojos 📸'}
    >
      {tira.length > 0 && (
        <>
          {tituloTira.trim() && (
            <h3 className="galeria-tira-titulo">{tituloTira}</h3>
          )}
          <div className="galeria-tira">
            {tira.map((src, i) => (
              <button
                key={src}
                type="button"
                className="galeria-tira-foto"
                onClick={() => setIndiceTira(i)}
                aria-label={`Ampliar foto ${i + 1}`}
              >
                <img src={src} alt={`Foto ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="galeria">
        {fotos.map((foto, i) => (
          <figure
            key={foto.id}
            className="foto-galeria"
            role="button"
            tabIndex={0}
            aria-label={`Ampliar foto de ${foto.etiqueta}`}
            onClick={() => setIndice(i)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault()
                setIndice(i)
              }
            }}
          >
            <img src={foto.src} alt={foto.etiqueta} loading="lazy" />
            <figcaption>{foto.etiqueta}</figcaption>
          </figure>
        ))}
      </div>

      <p className="texto-centro">{mensaje}</p>

      {fotoActual && indice !== null && (
        <Lightbox
          foto={fotoActual}
          posicion={`${indice + 1} de ${fotos.length}`}
          onCerrar={() => setIndice(null)}
          onAnterior={irAnterior}
          onSiguiente={irSiguiente}
        />
      )}

      {fotoTira && indiceTira !== null && (
        <Lightbox
          foto={{ id: fotoTira, etiqueta: 'Foto', src: fotoTira }}
          posicion={`${indiceTira + 1} de ${tira.length}`}
          onCerrar={() => setIndiceTira(null)}
          onAnterior={irAnteriorTira}
          onSiguiente={irSiguienteTira}
        />
      )}
    </Seccion>
  )
}
