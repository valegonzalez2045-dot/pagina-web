import type { ReactNode } from 'react'

type VarianteSeccion = 'normal' | 'color' | 'contacto'

const clasesPorVariante: Record<VarianteSeccion, string> = {
  normal: 'seccion',
  color: 'seccion seccion-color',
  contacto: 'contacto',
}

interface SeccionProps {
  id: string
  subtitulo: string
  titulo: string
  variante?: VarianteSeccion
  children: ReactNode
}

export function Seccion({
  id,
  subtitulo,
  titulo,
  variante = 'normal',
  children,
}: SeccionProps) {
  return (
    <section id={id} className={clasesPorVariante[variante]}>
      {subtitulo.trim() && <p className="titulo-pequeno">{subtitulo}</p>}
      <h2>{titulo}</h2>
      {children}
    </section>
  )
}
