import type { ReactNode } from 'react'

interface BotonEnlaceProps {
  href: string
  className?: string
  children: ReactNode
}

export function BotonEnlace({
  href,
  className = 'boton-principal',
  children,
}: BotonEnlaceProps) {
  return (
    <a className={className} href={href}>
      {children}
    </a>
  )
}
