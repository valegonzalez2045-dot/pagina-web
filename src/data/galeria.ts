import type { FotoGaleria } from '../types'
import { productos } from './productos'

/**
 * La galería se genera a partir de las fotos de cada producto:
 * así no hay que mantener dos listas de imágenes.
 */
export const fotosGaleria: FotoGaleria[] = productos.flatMap((producto) =>
  producto.fotos.map((src, i) => ({
    id: `${producto.id}-${i}`,
    etiqueta: producto.nombre,
    src,
  })),
)
