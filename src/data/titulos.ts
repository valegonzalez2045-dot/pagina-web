// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/titulos.json (o el panel de la web).

export interface TituloSeccion {
  /** Texto chiquito de arriba. */
  subtitulo: string
  /** Título grande de la sección. */
  titulo: string
  /** Párrafo de la sección (solo en Contacto). */
  texto?: string
  /** Nota de abajo de la sección (solo en Contacto). */
  nota?: string
}

export const titulos: Record<string, TituloSeccion> = {
  "inicio": {
    "subtitulo": "",
    "titulo": "DULCERÍA ARTESANAL\nHECHA CON AMOR"
  },
  "productos": {
    "subtitulo": "",
    "titulo": "Elige tu antojo"
  },
  "combos": {
    "subtitulo": "",
    "titulo": "Combos para enamorar 🎁"
  },
  "mayoreo": {
    "subtitulo": "",
    "titulo": "Mayoreo 📦"
  },
  "nosotros": {
    "subtitulo": "HECHO A MANO, HECHO CON AMOR",
    "titulo": "Detrás de cada antojo 🎀"
  },
  "galeria": {
    "subtitulo": "MIRA Y ANTOJATE",
    "titulo": "Lo más vendido"
  },
  "contacto": {
    "subtitulo": "¿YA TE ANTOJASTE?",
    "titulo": "Haz tu pedido 💕",
    "texto": "Escríbenos y arma tu pedido o pide tu cotización hoy mismo.",
    "nota": "🚚 Domicilios locales y envíos nacionales."
  }
}
