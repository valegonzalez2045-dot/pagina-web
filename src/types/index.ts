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

export interface Combo {
  id: string
  titulo: string
  descripcion: string
  textoBoton: string
}

export interface EnlaceContacto {
  id: string
  etiqueta: string
  href: string
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
