import { Seccion } from '../ui/Seccion'
import type { EnlaceContacto } from '../../types'
import { titulos } from '../../data/titulos'

interface ContactoProps {
  enlaces: EnlaceContacto[]
  /** Párrafo de la sección. Si no se pasa, sale el del panel (contenido/titulos.json). */
  pregunta?: string
  /** Nota de abajo. Si no se pasa, sale la del panel (contenido/titulos.json). */
  notaEnvios?: string
}

export function Contacto({ enlaces, pregunta, notaEnvios }: ContactoProps) {
  const seccion = titulos.contacto
  const textoPregunta =
    pregunta ?? seccion?.texto ?? 'Escríbenos y arma tu pedido o pide tu cotización hoy mismo.'
  const textoNota = notaEnvios ?? seccion?.nota ?? '🚚 Domicilios locales y envíos nacionales.'

  return (
    <Seccion
      id="contacto"
      subtitulo={seccion?.subtitulo ?? '¿YA TE ANTOJASTE?'}
      titulo={seccion?.titulo ?? 'Haz tu pedido 💕'}
      variante="contacto"
    >
      <p>{textoPregunta}</p>

      <div className="contactos">
        {enlaces.map((enlace) => (
          <a key={enlace.id} href={enlace.href}>
            {enlace.etiqueta}
          </a>
        ))}
      </div>

      <p className="domicilios">{textoNota}</p>
    </Seccion>
  )
}
