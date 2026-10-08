// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/info.json (o el panel de la web).

export interface ListaOpciones {
  titulo: string
  opciones: string[]
}

export interface InfoCatalogo {
  /** Texto que se muestra arriba de las fotos en el modal. */
  nota?: string
  /** Si es false, no se muestra precio debajo de cada foto. Por defecto: true. */
  mostrarPrecios?: boolean
  /** Listas de opciones (sabores, rellenos, etc.). */
  listas?: ListaOpciones[]
}

export const catalogoInfo: Record<string, InfoCatalogo> = {
  "artecookies": {
    "nota": "Tenemos 3 tamaños 🍪 · 6 cm $4.500 · 8 cm $5.200 · 10 cm $6.000",
    "mostrarPrecios": false
  },
  "sweetcakes": {
    "nota": "Cada pastel se cotiza según el diseño y el tamaño 🎂",
    "mostrarPrecios": false,
    "listas": [
      {
        "titulo": "Escoge el sabor de tu pastel:",
        "opciones": [
          "Naranja 🍊",
          "Maracuya",
          "Banano 🍌",
          "Vainilla",
          "Coco 🥥",
          "Mora",
          "Chocolate del diablo 🍫",
          "Red velvet",
          "Café ☕",
          "Zanahoria 🥕",
          "Yogurt con moras u arándanos 🫐",
          "Yogurt y Limón 🍋",
          "Yogurt y Frambuesa",
          "Milo"
        ]
      },
      {
        "titulo": "Escoge el sabor de tu relleno:",
        "opciones": [
          "Ganache de chocolate blanco",
          "Ganache de chocolate negro",
          "Buttercream de mora",
          "Buttercream de oreo",
          "Buttercream de milo",
          "Glaseado de maracuya",
          "Glaseado de limón",
          "Glaseado de naranja",
          "Frosting de queso crema",
          "Dulce de leche / Arequipe",
          "Brigadeiro",
          "Mermelada de mora",
          "Mermelada de fresa",
          "Fruta (fresa, cereza, mora, arándano, durazno, mango, manzana verde, piña, banano)"
        ]
      }
    ]
  }
}
