interface FotoPlaceholderProps {
  etiqueta: string
  className?: string
}

export function FotoPlaceholder({
  etiqueta,
  className = 'espacio-foto',
}: FotoPlaceholderProps) {
  return (
    <div className={className}>
      <span>📷</span>
      <p>{etiqueta}</p>
    </div>
  )
}
