// Pequeños detalles cálidos que flotan en el fondo de la página.
// Están detrás de todo el contenido (z-index bajo) y no interceptan clics.

const DETALLES = [
  { clase: 'fd-1', emoji: '🧁' },
  { clase: 'fd-2', emoji: '🍪' },
  { clase: 'fd-3', emoji: '🍫' },
  { clase: 'fd-4', emoji: '✨' },
  { clase: 'fd-5', emoji: '🎀' },
  { clase: 'fd-6', emoji: '🍓' },
  { clase: 'fd-7', emoji: '💛' },
  { clase: 'fd-8', emoji: '🍒' },
]

export function FondoDecorativo() {
  return (
    <div className="fondo-decorativo" aria-hidden="true">
      {DETALLES.map((detalle) => (
        <span key={detalle.clase} className={detalle.clase}>
          {detalle.emoji}
        </span>
      ))}
    </div>
  )
}