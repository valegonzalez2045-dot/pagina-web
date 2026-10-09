export interface EnlaceNavegacion {
  etiqueta: string
  href: string
}

export interface Producto {
  id: string
  nombre: string
  descripcion: string
  /** Rutas de las fotos en public/productos/ (la primera se muestra en la tarjeta) */
  fotos: string[]
}

export interface ComboProducto {
  id: string
  nombre: string
  descripcion: string
  /** Precio a mostrar; vacío = por confirmar. */
  precio: string
  /** Ruta de la foto; vacío = sin foto todavía. */
  foto: string
}

export interface EnlaceContacto {
  id: string
  etiqueta: string
  href: string
}

export interface ItemCarrito {
  /** Id único del artículo (sección + foto) */
  id: string
  /** Nombre de la sección/producto, ej "Chocomellows" */
  seccion: string
  /** Nombre legible del artículo, ej "Chocomellows · diseño 3" */
  nombre: string
  src: string
  /** Precio unitario en pesos; null = a cotizar */
  precio: number | null
  /** Texto a mostrar del precio, ej "$4.500" o "Precio por confirmar" */
  precioTexto: string
  cantidad: number
}

export interface FotoGaleria {
  id: string
  etiqueta: string
  src: string
}

export interface AccionEnlace {
  etiqueta: string
  href: string
}
