import fs from 'node:fs'
import path from 'node:path'

/**
 * Genera el catálogo que usa la web a partir de:
 *   - public/catalogo/<seccion>/*.webp   (las fotos ya optimizadas)
 *   - contenido/secciones.json           (qué sección pertenece a qué producto)
 *   - contenido/precios.json             (los precios editables)
 *   - contenido/info.json                (notas, listas de sabores, etc.)
 *   - contenido/combos.json              (los combos editables)
 *
 * Escribe:
 *   - src/data/catalogo.ts
 *   - src/data/catalogoInfo.ts
 *   - src/data/combos.ts
 *
 * Este script NO usa sharp ni las imágenes originales: solo mira los nombres
 * de archivo (que incluyen la página: <seccion>-<pagina>-<n>.webp).
 *
 * Se ejecuta solo antes de `npm run dev` y `npm run build`.
 */

const RAIZ = process.cwd()
const CONTENIDO = path.join(RAIZ, 'contenido')
const PUBLIC_CATALOGO = path.join(RAIZ, 'public', 'catalogo')
const SALIDA_CATALOGO = path.join(RAIZ, 'src', 'data', 'catalogo.ts')
const SALIDA_INFO = path.join(RAIZ, 'src', 'data', 'catalogoInfo.ts')
const SALIDA_COMBOS = path.join(RAIZ, 'src', 'data', 'combos.ts')

function leerJson(ruta, respaldo) {
  if (!fs.existsSync(ruta)) return respaldo
  return JSON.parse(fs.readFileSync(ruta, 'utf8'))
}

/** <seccion>-<pagina>-<orden>.webp -> { pagina, orden } */
function analizarNombre(archivo) {
  const coincidencia = archivo.match(/-(\d+)-(\d+)\.webp$/)
  if (!coincidencia) return { pagina: 0, orden: 0 }
  return { pagina: Number(coincidencia[1]), orden: Number(coincidencia[2]) }
}

const secciones = leerJson(path.join(CONTENIDO, 'secciones.json'), {})
const precios = leerJson(path.join(CONTENIDO, 'precios.json'), {})
const info = leerJson(path.join(CONTENIDO, 'info.json'), {})

const porArchivo = precios.porArchivo ?? {}
const porPagina = precios.porPagina ?? {}
const porSeccion = precios.porSeccion ?? {}
const porProducto = precios.porProducto ?? {}

function precioDe(seccion, producto, pagina, base) {
  return (
    porArchivo[`${seccion}/${base}`] ??
    porPagina[String(pagina)] ??
    porSeccion[seccion] ??
    porProducto[producto] ??
    ''
  )
}

const fotosPorProducto = {}
let total = 0

if (fs.existsSync(PUBLIC_CATALOGO)) {
  for (const seccion of fs.readdirSync(PUBLIC_CATALOGO).sort()) {
    const carpeta = path.join(PUBLIC_CATALOGO, seccion)
    if (!fs.statSync(carpeta).isDirectory()) continue
    const producto = secciones[seccion]
    if (!producto) {
      console.warn(`  (aviso) sección sin producto asignado: ${seccion}`)
      continue
    }

    const archivos = fs
      .readdirSync(carpeta)
      .filter((a) => a.toLowerCase().endsWith('.webp'))
      .sort((a, b) => {
        const na = analizarNombre(a)
        const nb = analizarNombre(b)
        return na.pagina - nb.pagina || na.orden - nb.orden
      })

    for (const archivo of archivos) {
      const base = archivo.replace(/\.webp$/i, '')
      const { pagina } = analizarNombre(archivo)
      ;(fotosPorProducto[producto] ??= []).push({
        src: `/catalogo/${seccion}/${archivo}`,
        precio: precioDe(seccion, producto, pagina, base),
      })
      total++
    }
  }
}

const filas = Object.keys(fotosPorProducto)
  .sort()
  .map(
    (producto) =>
      `  ${JSON.stringify(producto)}: [\n` +
      fotosPorProducto[producto]
        .map(
          (foto) =>
            `    { src: ${JSON.stringify(foto.src)}, precio: ${JSON.stringify(foto.precio)} },`,
        )
        .join('\n') +
      `\n  ],`,
  )
  .join('\n')

fs.writeFileSync(
  SALIDA_CATALOGO,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// Los precios se editan en contenido/precios.json (o desde el panel de la web).

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

const infoOrdenada = Object.keys(info)
  .sort()
  .reduce((acc, clave) => {
    acc[clave] = info[clave]
    return acc
  }, {})

fs.writeFileSync(
  SALIDA_INFO,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/info.json (o el panel de la web).

export interface ListaOpciones {
  titulo: string
  opciones: string[]
}

export interface InfoCatalogo {
  /** Textos que se muestran arriba de las fotos en el modal (pueden ser varios). */
  notas?: string[]
  /** Texto único (compatibilidad). Se muestra igual que notas. */
  nota?: string
  /** Si es false, no se muestra precio debajo de cada foto. Por defecto: true. */
  mostrarPrecios?: boolean
  /** Listas de opciones (sabores, rellenos, etc.). */
  listas?: ListaOpciones[]
}

export const catalogoInfo: Record<string, InfoCatalogo> = ${JSON.stringify(infoOrdenada, null, 2)}
`,
)

// --- Combos ---

const combosConfig = leerJson(path.join(CONTENIDO, 'combos.json'), { combos: [] })
const listaCombos = Array.isArray(combosConfig.combos) ? combosConfig.combos : []

const combosNormalizados = listaCombos.map((combo, i) => ({
  id: String(combo?.id ?? `combo-${i + 1}`),
  nombre: String(combo?.nombre ?? `Combo ${i + 1}`),
  descripcion: String(combo?.descripcion ?? ''),
  precio: String(combo?.precio ?? ''),
  foto: String(combo?.foto ?? ''),
}))

fs.writeFileSync(
  SALIDA_COMBOS,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/combos.json (o el panel de la web).

export interface ComboProducto {
  id: string
  nombre: string
  descripcion: string
  /** Precio a mostrar; vacío = por confirmar. */
  precio: string
  /** Ruta de la foto; vacío = sin foto todavía. */
  foto: string
}

export const combos: ComboProducto[] = ${JSON.stringify(combosNormalizados, null, 2)}
`,
)

console.log(`Combos generados: ${combosNormalizados.length}`)

console.log(`Catálogo generado: ${total} fotos`)
for (const producto of Object.keys(fotosPorProducto).sort()) {
  console.log(`  ${producto}: ${fotosPorProducto[producto].length}`)
}
