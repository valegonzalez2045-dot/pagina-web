/**
 * Revisa qué imágenes de public/ se están usando y cuáles quedan sin usar.
 * Solo informa: no borra nada.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const RAIZ = process.cwd()

// 1) Todas las imágenes que hay en public/
const imagenes = []
const recorrer = (dir) => {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completa = path.join(dir, entrada.name)
    if (entrada.isDirectory()) recorrer(completa)
    else if (/\.(webp|png|jpe?g|avif|gif)$/i.test(entrada.name)) {
      const ruta = '/' + path
        .relative(path.join(RAIZ, 'public'), completa)
        .split(path.sep)
        .join('/')
      imagenes.push({ ruta, completa, nombre: entrada.name })
    }
  }
}
recorrer(path.join(RAIZ, 'public'))

// 2) Todo lo que se referencia (datos generados + contenido editable)
const referencias = new Set()

const leerDatos = (archivo) => {
  if (!fs.existsSync(archivo)) return ''
  return fs.readFileSync(archivo, 'utf8')
}

// Los archivos generados en src/data (contienen las rutas que usa la web)
for (const archivo of fs.readdirSync(path.join(RAIZ, 'src', 'data'))) {
  const texto = leerDatos(path.join(RAIZ, 'src', 'data', archivo))
  for (const m of texto.matchAll(/["'`](\/[A-Za-z0-9_\-./]+\.(?:webp|png|jpe?g|avif|gif))["'`]/gi)) {
    referencias.add(m[1])
  }
}

// Los archivos de contenido (editables desde el panel)
for (const archivo of fs.readdirSync(path.join(RAIZ, 'contenido'))) {
  const texto = leerDatos(path.join(RAIZ, 'contenido', archivo))
  for (const m of texto.matchAll(/["'`](\/[A-Za-z0-9_\-./]+\.(?:webp|png|jpe?g|avif|gif))["'`]/gi)) {
    referencias.add(m[1])
  }
}

// 3) Imágenes sin usar
const sinUsar = imagenes.filter((i) => !referencias.has(i.ruta))

// 4) Duplicados exactos (mismo contenido, distinto nombre)
const porHash = new Map()
for (const imagen of imagenes) {
  const hash = crypto
    .createHash('sha1')
    .update(fs.readFileSync(imagen.completa))
    .digest('hex')
  if (!porHash.has(hash)) porHash.set(hash, [])
  porHash.get(hash).push(imagen)
}
const duplicados = [...porHash.values()].filter((grupo) => grupo.length > 1)

console.log('=== IMÁGENES EN public/ ===')
console.log('total:', imagenes.length)
console.log('referenciadas:', imagenes.length - sinUsar.length)
console.log('sin usar:', sinUsar.length)
for (const i of sinUsar) console.log('  -', i.ruta)

console.log('\n=== DUPLICADOS EXACTOS (misma foto, distinto archivo) ===')
console.log('grupos:', duplicados.length)
for (const grupo of duplicados) {
  console.log(
    '  *',
    grupo.map((g) => g.ruta + (referencias.has(g.ruta) ? ' [usada]' : ' [sin usar]')).join('  =  '),
  )
}

// 5) Resumen por carpeta
console.log('\n=== POR CARPETA ===')
const resumen = {}
for (const imagen of imagenes) {
  const carpeta = imagen.ruta.split('/')[1] ?? '(raíz)'
  resumen[carpeta] ??= { total: 0, sinUsar: 0 }
  resumen[carpeta].total++
  if (!referencias.has(imagen.ruta)) resumen[carpeta].sinUsar++
}
for (const [carpeta, datos] of Object.entries(resumen)) {
  console.log(`  ${carpeta}: ${datos.total} fotos, ${datos.sinUsar} sin usar`)
}
