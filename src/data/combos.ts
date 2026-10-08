import type { Combo } from '../types'

// El pedido se hace por WhatsApp, así que cada botón abre un chat con mensaje listo.
const BASE_WHATSAPP = 'https://wa.me/573052271456'
const whatsapp = (texto: string) =>
  `${BASE_WHATSAPP}?text=${encodeURIComponent(texto)}`

export const combos: Combo[] = [
  {
    id: 'combos-regalar',
    titulo: 'Combos para regalar',
    descripcion:
      'Chocolates, galletas y dulces listos para sorprender: el detalle que dice "pensé en ti" mejor que ninguna carta.',
    textoBoton: 'Ver combos',
    href: whatsapp(
      'Hola Petite Princesse 💕 ¡Quiero ver los combos para regalar!',
    ),
  },
  {
    id: 'combos-fechas-especiales',
    titulo: 'Combos para fechas especiales',
    descripcion:
      'Cumpleaños, celebraciones y brindis con sabor: convierte cada momento especial en un recuerdo delicioso.',
    textoBoton: 'Ver opciones',
    href: whatsapp(
      'Hola Petite Princesse 💕 ¡Quiero ver las opciones para fechas especiales!',
    ),
  },
]
