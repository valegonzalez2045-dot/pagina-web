/**
 * Convierte las fotos de la carpeta "fotos web/combos" a WebP y las deja en
 * public/combos/ como "muestra" de combos (la tira de fotos reales que sale
 * arriba en la sección Combos).
 *
 * También deja la lista en contenido/combos.json (campo "muestra"), que es lo
 * que edita el panel de la web.
 *
 * Uso: node scripts/fotos-combos.mjs
 */

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const RAIZ = process.cwd()
const ORIGEN = path.join(RAIZ, 'fotos web', 'combos')
const DESTINO = path.join(RAIZ, 'public', 'combos')
const ARCHIVO_CONTENIDO = path.join(RAIZ, 'contenido', 'combos.json')

const ANCHO = 1200
const CALIDAD = 82

function fechaDesdeNombre(nombre) {
  let m
  // 1756308967964_083218.png (milisegundos desde 1970)
  m = nombre.match(/^(\d{13})/)
  if (m) return Number(m[1])
  // "Imagen de WhatsApp 2025-01-17 a las 18.40.23_xxx.jpg"
  m = nombre.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return validar(m[1], m[2], m[3])
  // IMG_20240716_105558 / IMG20250320203330 / MVIMG_20260618_125443
  m = nombre.match(/(\d{4})(\d{2})(\d{2})(?:[_-]?(\d{2})(\d{2})(\d{2}))?/)
  if (m) return validar(m[1], m[2], m[3], m[4], m[5], m[6])
  return null
}

function validar(anio, mes, dia, hora = '00', min = '00', seg = '00') {
  const t = Date.parse(`${anio}-${mes}-${dia}T${hora}:${min}:${seg}Z`)
  return Number.isNaN(t) ? null : t
}

if (!fs.existsSync(ORIGEN)) {
  console.log('No existe la carpeta "fotos web/combos". No hay nada que hacer.')
  process.exit(0)
}

fs.mkdirSync(DESTINO, { recursive: true })

const archivos = fs
  .readdirSync(ORIGEN)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .map((f) => {
    const stat = fs.statSync(path.join(ORIGEN, f))
    return { f, orden: fechaDesdeNombre(f) ?? stat.mtimeMs }
  })
  .sort((a, b) => a.orden - b.orden || a.f.localeCompare(b.f))

const rutas = []

for (const [i, { f }] of archivos.entries()) {
  const nombre = `muestra-${i + 1}.webp`
  const destino = path.join(DESTINO, nombre)
  await sharp(path.join(ORIGEN, f))
    .rotate()
    .resize({ width: ANCHO, withoutEnlargement: true })
    .webp({ quality: CALIDAD })
    .toFile(destino)
  rutas.push(`/combos/${nombre}`)
  console.log(`${f} -> public/combos/${nombre}`)
}

// --- actualizar contenido/combos.json (sin pisar lo que edite la usuaria) ---

if (fs.existsSync(ARCHIVO_CONTENIDO)) {
  const contenido = JSON.parse(fs.readFileSync(ARCHIVO_CONTENIDO, 'utf8'))
  const actuales = Array.isArray(contenido.muestra) ? contenido.muestra.map(String) : []
  const finales = [...actuales]
  for (const ruta of rutas) if (!finales.includes(ruta)) finales.push(ruta)
  contenido.muestra = finales
  fs.writeFileSync(ARCHIVO_CONTENIDO, `${JSON.stringify(contenido, null, 2)}\n`)
  console.log(`contenido/combos.json actualizado (${finales.length} fotos de muestra)`)
}
