/**
 * Genera contenido/fotos.json: el ORDEN en que se ven las fotos de cada producto.
 *
 * Es el archivo que edita el panel de la web (pestaña "Fotos"):
 *   {
 *     "producto": [
 *       { "seccion": "chocogalletas", "foto": "chocogalletas-04-1.webp" },
 *       { "seccion": "chocogalletas", "foto": "chocogalletas-04-2.webp", "precio": "$4.500" }
 *     ]
 *   }
 *
 * - El orden del arreglo es el orden en que se ven las fotos en la web.
 * - "precio" es opcional: solo aparece cuando la foto tiene un precio propio
 *   (diferente al general de página/sección de contenido/precios.json).
 *
 * Uso: node scripts/generar-fotos-json.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const RAIZ = process.cwd()
const CONTENIDO = path.join(RAIZ, 'contenido')
const CATALOGO = path.join(RAIZ, 'public', 'catalogo')

const secciones = JSON.parse(
  fs.readFileSync(path.join(CONTENIDO, 'secciones.json'), 'utf8'),
)

const salida = {}
let total = 0

for (const seccion of fs.readdirSync(CATALOGO).sort()) {
  const carpeta = path.join(CATALOGO, seccion)
  if (!fs.statSync(carpeta).isDirectory()) continue
  const producto = secciones[seccion]
  if (!producto) continue

  const archivos = fs
    .readdirSync(carpeta)
    .filter((a) => a.toLowerCase().endsWith('.webp'))
    .sort((a, b) => {
      const na = a.match(/-(\d+)-(\d+)\.webp$/)
      const nb = b.match(/-(\d+)-(\d+)\.webp$/)
      const pa = na ? Number(na[1]) : 0
      const pb = nb ? Number(nb[1]) : 0
      const oa = na ? Number(na[2]) : 0
      const ob = nb ? Number(nb[2]) : 0
      return pa - pb || oa - ob
    })

  for (const archivo of archivos) {
    ;(salida[producto] ??= []).push({ seccion, foto: archivo })
    total++
  }
}

fs.writeFileSync(
  path.join(CONTENIDO, 'fotos.json'),
  `${JSON.stringify(salida, null, 2)}\n`,
)

const resumen = Object.entries(salida)
  .map(([p, f]) => `${p}: ${f.length}`)
  .join(' | ')
console.log(`contenido/fotos.json escrito (${total} fotos)`)
console.log(resumen)
