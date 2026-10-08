import type { FotoGaleria } from '../../types'

interface LightboxProps {
  foto: FotoGaleria
  posicion: string
  onCerrar: () => void
  onAnterior: () => void
  onSiguiente: () => void
}

export function Lightbox({
  foto,
  posicion,
  onCerrar,
  onAnterior,
  onSiguiente,
}: LightboxProps) {
  return (
    <div
      className="lightbox"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ampliada: ${foto.etiqueta}`}
    >
      <button
        type="button"
        className="lightbox-cerrar"
        onClick={onCerrar}
        aria-label="Cerrar"
      >
        ✕
      </button>

      <button
        type="button"
        className="lightbox-nav izquierda"
        onClick={(evento) => {
          evento.stopPropagation()
          onAnterior()
        }}
        aria-label="Foto anterior"
      >
        ‹
      </button>

      <figure onClick={(evento) => evento.stopPropagation()}>
        <img src={foto.src} alt={foto.etiqueta} />
        <figcaption>
          {foto.etiqueta} · {posicion}
        </figcaption>
      </figure>

      <button
        type="button"
        className="lightbox-nav derecha"
        onClick={(evento) => {
          evento.stopPropagation()
          onSiguiente()
        }}
        aria-label="Foto siguiente"
      >
        ›
      </button>
    </div>
  )
}
