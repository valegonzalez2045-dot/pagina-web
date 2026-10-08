import { bytesABase64 } from './github'

export interface ImagenComprimida {
  base64: string
  ancho: number
  alto: number
}

/**
 * Reduce y convierte una foto a WebP en el navegador, antes de subirla a GitHub.
 * Así el repositorio y la página se mantienen ligeros.
 */
export async function comprimirImagen(
  archivo: File,
  maxAncho = 1000,
  calidad = 0.82,
): Promise<ImagenComprimida> {
  const mapa = await createImageBitmap(archivo)
  try {
    const escala = Math.min(1, maxAncho / mapa.width)
    const ancho = Math.max(1, Math.round(mapa.width * escala))
    const alto = Math.max(1, Math.round(mapa.height * escala))
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const contexto = lienzo.getContext('2d')
    if (!contexto) throw new Error('Este navegador no permite procesar la imagen.')
    contexto.drawImage(mapa, 0, 0, ancho, alto)

    const blob = await new Promise<Blob>((resolver, rechazar) => {
      lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo convertir la imagen.'))), 'image/webp', calidad)
    })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    return { base64: bytesABase64(bytes), ancho, alto }
  } finally {
    mapa.close()
  }
}