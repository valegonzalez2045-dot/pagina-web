import sharp from 'sharp'
import fs from 'node:fs'

/**
 * Convierte la imagen de la mascota (portada de la página 1: portada-01-2.png)
 * en la imagen ligera que se muestra en la portada de la web (public/mascota.webp).
 *
 * Ejecutar: node scripts/generar-mascota.mjs
 */

const ORIGEN = 'imagenes-extraidas/portada-01-2.png'
const SALIDA = 'public/mascota.webp'

if (!fs.existsSync(ORIGEN)) {
  console.error(`No se encontró ${ORIGEN}`)
  process.exit(1)
}

await sharp(ORIGEN)
  .resize({ width: 640, withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(SALIDA)

console.log(`Mascota lista: ${SALIDA}`)