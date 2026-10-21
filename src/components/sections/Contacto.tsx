import { Seccion } from '../ui/Seccion'
import type { EnlaceContacto } from '../../types'
import { titulos } from '../../data/titulos'

interface ContactoProps {
  enlaces: EnlaceContacto[]
  pregunta: string
  notaEnvios: string
}

export function Contacto({ enlaces, pregunta, notaEnvios }: ContactoProps) {
  const seccion = titulos.contacto

  return (
    <Seccion
      id="contacto"
      subtitulo={seccion?.subtitulo ?? '¿YA TE ANTOJASTE?'}
      titulo={seccion?.titulo ?? 'Haz tu pedido 💕'}
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
