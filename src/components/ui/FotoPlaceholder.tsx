interface FotoPlaceholderProps {
  etiqueta: string
  /** Emoji que se muestra en el espacio vacío de la foto. */
  emoji?: string
  className?: string
}

export function FotoPlaceholder({
  etiqueta,
  emoji = '📷',
  className = 'espacio-foto',
}: FotoPlaceholderProps) {
  return (
    <div className={className}>
      <span>{emoji}</span>
      <p>{etiqueta}</p>
    </div>
  )
}
