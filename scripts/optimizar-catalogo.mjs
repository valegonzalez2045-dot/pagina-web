import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Convierte los recortes del catálogo (imagenes-extraidas/*.png) en imágenes
 * web ligeras (public/catalogo/<seccion>/*.webp) y genera src/data/catalogo.ts
 * con la lista de fotos por producto.
 *
 * Los PRECIOS se leen de contenido/precios.json (si existe). Estructura:
 *   {
 *     "porArchivo": { "fresas-con-crema/fresas-con-crema-41-1": "$5.000" },
 *     "porSeccion": { "chocomellows-sencillos": "$3.000" },
 *     "porProducto":{ "cookie-fusion": "$10.000" }
 *   }
 * Prioridad: porArchivo > porSeccion > porProducto.
 * (El precio de cada foto vive en contenido/fotos.json.)
 */

const ORIGEN = 'imagenes-extraidas'
const DESTINO = path.join('public', 'catalogo')
const DATOS = path.join('src', 'data', 'catalogo.ts')
const PRECIOS_JSON = path.join('contenido', 'precios.json')
const SECCIONES_JSON = path.join('contenido', 'secciones.json')

// Sección del catálogo -> producto de la web (editable en contenido/secciones.json).
const PRODUCTO = fs.existsSync(SECCIONES_JSON)
  ? JSON.parse(fs.readFileSync(SECCIONES_JSON, 'utf8'))
  : {}

const precios = fs.existsSync(PRECIOS_JSON)
  ? JSON.parse(fs.readFileSync(PRECIOS_JSON, 'utf8'))
  : {}
const porArchivo = precios.porArchivo ?? {}
const porSeccion = precios.porSeccion ?? {}
const porProducto = precios.porProducto ?? {}

function precioDe(seccion, producto, pagina, base) {
  return (
    porArchivo[`${seccion}/${base}`] ??
    porSeccion[seccion] ??
    porProducto[producto] ??
    ''
  )
}

const manifiesto = JSON.parse(
  fs.readFileSync(path.join(ORIGEN, 'manifest.json'), 'utf8'),
)

const porProductoRecortes = {}
for (const recorte of manifiesto.recortes) {
  const producto = PRODUCTO[recorte.seccion]
  if (!producto) continue
  ;(porProductoRecortes[producto] ??= []).push(recorte)
}

fs.rmSync(DESTINO, { recursive: true, force: true })
fs.mkdirSync(DESTINO, { recursive: true })

const catalogoFinal = {}
let total = 0

for (const [producto, recortes] of Object.entries(porProductoRecortes)) {
  const items = []
  for (const recorte of recortes) {
    const base = recorte.recorte.replace(/\.png$/, '')
    const carpeta = path.join(DESTINO, recorte.seccion)
    fs.mkdirSync(carpeta, { recursive: true })

    const archivoWebp = path.join(carpeta, `${base}.webp`)
    await sharp(path.join(ORIGEN, recorte.recorte))
      .resize({ width: 700, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(archivoWebp)

    const src = `/${path
      .relative('public', archivoWebp)
      .split(path.sep)
      .join('/')}`

    items.push({
      src,
      precio: precioDe(recorte.seccion, producto, recorte.pagina, base),
    })
    total++
    if (total % 50 === 0) console.log(`  ... ${total} imágenes`)
  }
  catalogoFinal[producto] = items
}

const filas = Object.entries(catalogoFinal)
  .map(
    ([producto, items]) =>
      `  ${JSON.stringify(producto)}: [\n` +
      items
        .map(
          (i) =>
            `    { src: ${JSON.stringify(i.src)}, precio: ${JSON.stringify(i.precio)} },`,
        )
        .join('\n') +
      `\n  ],`,
  )
  .join('\n')

fs.writeFileSync(
  DATOS,
  `// ARCHIVO GENERADO por scripts/optimizar-catalogo.mjs — no editar a mano.
// Vuelve a ejecutarlo cuando cambien las fotos o los precios:
//   node scripts/optimizar-catalogo.mjs

export interface FotoCatalogo {
  src: string
  /** Precio a mostrar debajo de la foto (ej: "$9.000"). Vacío = por confirmar. */
  precio: string
}

export const catalogo: Record<string, FotoCatalogo[]> = {
${filas}
}
`,
)

console.log(`\nListo: ${total} imágenes web + ${DATOS}`)
for (const [producto, items] of Object.entries(catalogoFinal)) {
  console.log(`  ${producto}: ${items.length}`)
}
