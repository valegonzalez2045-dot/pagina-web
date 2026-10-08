import type { EnlaceContacto } from '../types'

/** Número de WhatsApp al que llegan los pedidos (formato internacional, sin signo +). */
export const WHATSAPP_NUMERO = '573052271456'

/** Arma un enlace de WhatsApp con mensaje ya escrito. */
export const whatsappUrl = (texto: string): string =>
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`

export const enlacesContacto: EnlaceContacto[] = [
  {
    id: 'whatsapp',
    etiqueta: '📱 WhatsApp',
    href: whatsappUrl('¡Hola Petite Princesse 💕! Quiero hacer un pedido.'),
  },
  {
    id: 'instagram',
    etiqueta: '📸 Instagram',
    href: 'https://www.instagram.com/petite_princesse_reposteria',
  },
  {
    id: 'ubicacion',
    etiqueta: '📍 Manizales, Colombia',
    href: 'https://www.google.com/maps/search/?api=1&query=Manizales%2C%20Colombia',
  },
]