import type { ReactNode } from 'react'

interface TarjetaProps {
  className?: string
  children: ReactNode
}

export function Tarjeta({ className = '', children }: TarjetaProps) {
  return <div className={`tarjeta ${className}`.trim()}>{children}</div>
}
