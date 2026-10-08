import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Convierte las fotos de public/productos a WebP (máx. 800 px de ancho) y borra
 * los originales pesados. Actualiza las referencias en src/data/productos.ts
 * al nuevo formato .webp. Es seguro volver a ejecutarlo.
 */
const CARPETA = path.join('public', 'productos')
const ARCHIVO_PRODUCTOS = path.join('src', 'data', 'productos.ts')

const crudo = fs.readFileSync(ARCHIVO_PRODUCTOS, 'utf8')
const referenciados = new Set(
  [...crudo.matchAll(/\/productos\/([^'")\s]+)/g)].map((m) => m[1]),
)

const convertidos = []
for (const nombre of fs.readdirSync(CARPETA)) {
  const ruta = path.join(CARPETA, nombre)
  if (!fs.statSync(ruta).isFile() || nombre.includes('.tmp')) continue
  const base = nombre.replace(/\.(png|jpe?g|webp)$/i, '')
  const destino = path.join(CARPETA, `${base}.webp`)

  const enUso = referenciados.has(nombre) || referenciados.has(`${base}.webp`)
  if (!enUso) {
    console.log(`  (sin usar en la web, se elimina) ${nombre}`)
    fs.rmSync(ruta, { force: true })
    continue
  }

  const rutaTmp = path.join(CARPETA, `${nombre}.tmp`)
  await sharp(ruta).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 82 }).toFile(rutaTmp)
  if (destino !== ruta) fs.rmSync(destino, { force: true })
  fs.renameSync(rutaTmp, destino)
  if (destino !== ruta) fs.rmSync(ruta, { force: true })
  convertidos.push(nombre)
  console.log(`  ${nombre} -> ${base}.webp (${(fs.statSync(destino).size / 1024).toFixed(0)} KB)`)
}

const nuevo = crudo.replace(/(\/productos\/[^'")\s]+)\.(png|jpe?g)/g, '$1.webp')
if (nuevo !== crudo) fs.writeFileSync(ARCHIVO_PRODUCTOS, nuevo)

let total = 0
for (const f of fs.readdirSync(CARPETA)) total += fs.statSync(path.join(CARPETA, f)).size
console.log(`\nListo: ${convertidos.length} fotos convertidas. La carpeta ahora pesa ${(total / 1024).toFixed(0)} KB.`)