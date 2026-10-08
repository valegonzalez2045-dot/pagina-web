import { useEffect, useState } from 'react'
import { Seccion } from '../ui/Seccion'
import { Lightbox } from '../ui/Lightbox'
import type { FotoGaleria } from '../../types'

interface GaleriaProps {
  fotos: FotoGaleria[]
  mensaje: string
}

export function Galeria({ fotos, mensaje }: GaleriaProps) {
  const [indice, setIndice] = useState<number | null>(null)

  const irAnterior = () =>
    setIndice((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length))

  const irSiguiente = () =>
    setIndice((i) => (i === null ? i : (i + 1) % fotos.length))

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
    }

    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [fotos.length])

  // Mientras la foto está ampliada, la página no se desplaza
  useEffect(() => {
    document.body.style.overflow = indice === null ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [indice])

  const fotoActual = indice === null ? undefined : fotos[indice]

  return (
    <Seccion
      id="galeria"
      subtitulo="MIRA Y ANTOJATE"
      titulo="Galería de antojos 📸"
    >
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
    </Seccion>
  )
}
