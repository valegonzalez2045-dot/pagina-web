import { Seccion } from '../ui/Seccion'
import type { EnlaceContacto } from '../../types'

interface ContactoProps {
  enlaces: EnlaceContacto[]
  pregunta: string
  notaEnvios: string
}

export function Contacto({ enlaces, pregunta, notaEnvios }: ContactoProps) {
  return (
    <Seccion
      id="contacto"
      subtitulo="¿YA TE ANTOJASTE?"
      titulo="Haz tu pedido 💕"
      variante="contacto"
    >
      <p>{pregunta}</p>

      <div className="contactos">
        {enlaces.map((enlace) => (
          <a key={enlace.id} href={enlace.href}>
            {enlace.etiqueta}
          </a>
        ))}
      </div>

      <p className="domicilios">{notaEnvios}</p>
    </Seccion>
  )
}
