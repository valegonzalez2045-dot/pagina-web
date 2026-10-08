import fs from 'node:fs'
import path from 'node:path'

/**
 * Renombra los recortes del catálogo según la sección a la que pertenecen
 * (detectada con OCR de las páginas) y regenera la página de revisión
 * agrupada por sección.
 *
 * Si un rango de páginas está mal, solo cambia aquí el slug y vuelve a
 * ejecutar: node scripts/renombrar.mjs
 */

const SALIDA = 'imagenes-extraidas'
const PREVIA = path.join('public', 'catalogo-preview')

const SECCIONES = [
  { desde: 1, hasta: 1, slug: 'portada' },
  { desde: 2, hasta: 2, slug: 'informacion' },
  { desde: 3, hasta: 7, slug: 'chocogalletas' },
  { desde: 8, hasta: 8, slug: 'chocoreo' },
  { desde: 9, hasta: 23, slug: 'chocogalletas' },
  { desde: 24, hasta: 28, slug: 'chocomellows-sencillos' },
  { desde: 29, hasta: 34, slug: 'chocomellows-dobles' },
  { desde: 35, hasta: 35, slug: 'cakepops' },
  { desde: 36, hasta: 39, slug: 'artecookies' },
  { desde: 40, hasta: 40, slug: 'cookies' },
  { desde: 41, hasta: 41, slug: 'fresas-con-crema' },
  { desde: 42, hasta: 42, slug: 'cupcakes' },
  { desde: 43, hasta: 45, slug: 'sweetcakes' },
  { desde: 46, hasta: 46, slug: 'cookie-fusion' },
  { desde: 47, hasta: 47, slug: 'precios-mayoreo' },
  { desde: 48, hasta: 48, slug: 'formas-pago' },
]

// Recortes puntuales que van a una sección distinta a la de su página.
// Clave = página, valor = números de recorte (o 'todas' para toda la página).
// El primer slug que coincida gana.
const POR_RECORTE = {
  chocodelicias: {
    3: 'todas',
    4: [1, 11, 2, 6, 8, 9, 10],
    5: [1, 10, 12, 13, 14, 15, 4, 8, 9],
    6: [1, 12, 13, 3, 2, 9, 6],
    7: [1, 11, 15, 2, 12, 6],
    10: [1, 14],
    11: [10],
    15: [11],
    16: [9],
    17: [14],
    20: [4],
    22: [1, 3, 5],
    23: [1],
  },
  chocoreo: {
    4: [3, 5, 4],
    5: [6],
    10: [12, 13, 3, 4],
    12: [7],
    14: [3, 4],
    15: [10, 9],
    16: [10],
    17: [15, 13, 8],
    18: [10, 11, 12, 13, 14, 15, 4, 5, 6, 7, 8],
    19: [1],
    20: [11, 7, 6, 8, 9],
    21: [3, 4],
    22: [2, 4],
    23: [2],
  },
}

function seccionDePagina(pagina) {
  const regla = SECCIONES.find((s) => pagina >= s.desde && pagina <= s.hasta)
  return regla ? regla.slug : `pagina-${pagina}`
}

function slugDeRecorte(pagina, n) {
  for (const [slug, mapa] of Object.entries(POR_RECORTE)) {
    const excepcion = mapa[pagina]
    if (excepcion === 'todas' || (Array.isArray(excepcion) && excepcion.includes(Number(n)))) {
      return slug
    }
  }
  return seccionDePagina(pagina)
}

function mover(carpeta, desde, hasta) {
  const origen = path.join(carpeta, desde)
  const destino = path.join(carpeta, hasta)
  if (desde === hasta) return
  if (fs.existsSync(origen)) fs.renameSync(origen, destino)
  else if (!fs.existsSync(destino)) {
    console.warn(`  ! no encontré "${desde}" en ${carpeta}`)
  }
}

const manifiesto = JSON.parse(
  fs.readFileSync(path.join(SALIDA, 'manifest.json'), 'utf8'),
)

let cambios = 0
for (const recorte of manifiesto.recortes) {
  const pagina = parseInt(recorte.pagina, 10)
  const n = recorte.recorte.match(/-(\d+)\.png$/)?.[1] ?? '1'
  const slug = slugDeRecorte(pagina, n)
  const nuevo = `${slug}-${recorte.pagina.padStart(2, '0')}-${n}.png`

  mover(SALIDA, recorte.recorte, nuevo)
  mover(PREVIA, recorte.recorte.replace('.png', '.jpg'), nuevo.replace('.png', '.jpg'))

  if (recorte.recorte !== nuevo) cambios++
  recorte.recorte = nuevo
  recorte.seccion = slug
}

manifiesto.recortes.sort(
  (a, b) => parseInt(a.pagina, 10) - parseInt(b.pagina, 10) || a.recorte.localeCompare(b.recorte),
)

fs.writeFileSync(
  path.join(SALIDA, 'manifest.json'),
  JSON.stringify(manifiesto, null, 2),
)

// Regenerar la vista de revisión agrupada por sección
const porSeccion = new Map()
for (const r of manifiesto.recortes) {
  if (!porSeccion.has(r.seccion)) porSeccion.set(r.seccion, [])
  porSeccion.get(r.seccion).push(r)
}

const bloques = [...porSeccion.entries()]
  .map(
    ([seccion, items]) => `
  <section>
    <h2>${seccion} <span>(${items.length})</span></h2>
    <div class="grid">
      ${items
        .map(
          (m) => `
      <figure>
        <img src="${m.recorte.replace('.png', '.jpg')}" loading="lazy" alt="">
        <figcaption>${m.recorte}</figcaption>
      </figure>`,
        )
        .join('')}
    </div>
  </section>`,
  )
  .join('')

fs.writeFileSync(
  path.join(PREVIA, 'preview.html'),
  `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Revisión de fotos extraídas del catálogo</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1c1520; color: #fff; margin: 24px; }
  h1 { font-size: 20px; } p { color: #c9b8cf; }
  h2 { font-size: 16px; margin: 28px 0 10px; text-transform: capitalize; color: #f0c9a8; }
  h2 span { color: #9c8aa5; font-weight: normal; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
  figure { margin: 0; background: #2a2030; border-radius: 10px; overflow: hidden; }
  img { width: 100%; height: 170px; object-fit: cover; display: block; }
  figcaption { font-size: 12px; padding: 7px 9px; color: #e6c9d6; }
</style>
</head>
<body>
<h1>${manifiesto.recortes.length} fotos · ${porSeccion.size} secciones</h1>
<p>Corrige los rangos en scripts/renombrar.mjs si alguna sección quedó mal.</p>
${bloques}
</body>
</html>
`,
)

console.log(`Listo: ${cambios} archivos renombrados, ${porSeccion.size} secciones`)
for (const [seccion, items] of porSeccion) {
  console.log(`  ${seccion}: ${items.length}`)
}
