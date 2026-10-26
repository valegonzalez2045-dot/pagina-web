import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

/**
 * Genera el catálogo que usa la web a partir de:
 *   - public/catalogo/<seccion>/*.webp   (las fotos ya optimizadas)
 *   - contenido/secciones.json           (qué sección pertenece a qué producto)
 *   - contenido/precios.json             (los precios editables)
 *   - contenido/fotos.json                (orden y precio de cada foto del catálogo)
 *   - contenido/info.json                (notas, listas de sabores, etc.)
 *   - contenido/combos.json              (los combos editables)
 *   - contenido/logo.json                (el logo de la portada)
 *   - contenido/productos.json           (nombre, texto, fotos y portada de cada producto)
 *   - contenido/titulos.json             (los títulos de cada sección)
 *   - contenido/galeria.json             (las fotos de la galería)
 *
 * Escribe:
 *   - src/data/catalogo.ts
 *   - src/data/catalogoInfo.ts
 *   - src/data/combos.ts
 *   - src/data/logo.ts
 *   - src/data/portadas.ts
 *   - src/data/productos.ts
 *   - src/data/titulos.ts
 *   - src/data/galeria.ts
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
const SALIDA_LOGO = path.join(RAIZ, 'src', 'data', 'logo.ts')
const SALIDA_PORTADAS = path.join(RAIZ, 'src', 'data', 'portadas.ts')
const SALIDA_PRODUCTOS = path.join(RAIZ, 'src', 'data', 'productos.ts')
const SALIDA_TITULOS = path.join(RAIZ, 'src', 'data', 'titulos.ts')
const SALIDA_GALERIA = path.join(RAIZ, 'src', 'data', 'galeria.ts')

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

const versiones = new Map()

/**
 * Versión corta del contenido de una imagen de /public: hace que el navegador
 * muestre la foto nueva cuando se reemplaza una foto con el mismo nombre.
 */
function versionDe(rutaPublica) {
  const limpia = String(rutaPublica ?? '').split('?')[0].trim()
  if (!limpia.startsWith('/')) return ''
  if (versiones.has(limpia)) return versiones.get(limpia)
  let version = ''
  try {
    const absoluta = path.join(RAIZ, 'public', limpia)
    if (fs.existsSync(absoluta) && fs.statSync(absoluta).isFile()) {
      version = crypto
        .createHash('sha1')
        .update(fs.readFileSync(absoluta))
        .digest('hex')
        .slice(0, 10)
    }
  } catch {
    version = ''
  }
  versiones.set(limpia, version)
  return version
}

function conVersion(rutaPublica) {
  const ruta = String(rutaPublica ?? '').trim()
  if (!ruta) return ''
  const version = versionDe(ruta)
  if (!version) return ruta
  return `${ruta}${ruta.includes('?') ? '&' : '?'}v=${version}`
}

const secciones = leerJson(path.join(CONTENIDO, 'secciones.json'), {})
const precios = leerJson(path.join(CONTENIDO, 'precios.json'), {})
const info = leerJson(path.join(CONTENIDO, 'info.json'), {})

const porArchivo = precios.porArchivo ?? {}
const porSeccion = precios.porSeccion ?? {}
const porProducto = precios.porProducto ?? {}

/** Precio de una foto: el suyo propio (fotos.json) o, si no tiene, el general. */
function precioDe(seccion, producto, base) {
  return (
    porArchivo[`${seccion}/${base}`] ??
    porSeccion[seccion] ??
    porProducto[producto] ??
    ''
  )
}

const fotosPorProducto = {}
let total = 0

if (fs.existsSync(PUBLIC_CATALOGO)) {
  // Primero se lee contenido/fotos.json: ahí está el orden que definió la
  // usuaria en el panel y el precio de cada foto en particular.
  const ordenElegido = leerJson(path.join(CONTENIDO, 'fotos.json'), {})

  // Secciones que pertenecen a cada producto.
  const seccionesPorProducto = {}
  for (const [seccion, producto] of Object.entries(secciones)) {
    ;(seccionesPorProducto[producto] ??= []).push(seccion)
  }

  // Todas las fotos que hay en el disco, por sección.
  const archivosPorSeccion = {}
  for (const seccion of fs.readdirSync(PUBLIC_CATALOGO).sort()) {
    const carpeta = path.join(PUBLIC_CATALOGO, seccion)
    if (!fs.statSync(carpeta).isDirectory()) continue
    if (!secciones[seccion]) {
      console.warn(`  (aviso) sección sin producto asignado: ${seccion}`)
      continue
    }
    archivosPorSeccion[seccion] = fs
      .readdirSync(carpeta)
      .filter((a) => a.toLowerCase().endsWith('.webp'))
      .sort((a, b) => {
        const na = analizarNombre(a)
        const nb = analizarNombre(b)
        return na.pagina - nb.pagina || na.orden - nb.orden
      })
  }

  const agregar = (producto, seccion, archivo, precio) => {
    ;(fotosPorProducto[producto] ??= []).push({
      src: conVersion(`/catalogo/${seccion}/${archivo}`),
      precio,
    })
    total++
  }

  for (const producto of Object.keys(seccionesPorProducto).sort()) {
    const seccionesProducto = seccionesPorProducto[producto]
    const elegida = Array.isArray(ordenElegido[producto])
      ? ordenElegido[producto]
      : []

    // 1. Las fotos en el orden que pidió la usuaria.
    const vistas = new Set()
    for (const item of elegida) {
      const seccion = String(item?.seccion ?? '')
      const archivo = String(item?.foto ?? '')
      if (!seccion || !archivo) continue
      if (!archivosPorSeccion[seccion]?.includes(archivo)) continue
      const base = archivo.replace(/\.webp$/i, '')
      const precio =
        String(item?.precio ?? '') || precioDe(seccion, producto, base)
      agregar(producto, seccion, archivo, precio)
      vistas.add(`${seccion}/${archivo}`)
    }

    // 2. Las fotos que se hayan subido después y todavía no están en la lista.
    for (const seccion of seccionesProducto) {
      for (const archivo of archivosPorSeccion[seccion] ?? []) {
        if (vistas.has(`${seccion}/${archivo}`)) continue
        const base = archivo.replace(/\.webp$/i, '')
        agregar(producto, seccion, archivo, precioDe(seccion, producto, base))
      }
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
const muestraCombos = Array.isArray(combosConfig.muestra)
  ? combosConfig.muestra.map(String).filter(Boolean).map(conVersion)
  : []
// La imagen que sale al lado del botón de la sección y el texto del botón.
const destacadaCombos =
  conVersion(String(combosConfig.destacada ?? '').trim()) || muestraCombos[0] || ''
const tituloBotonCombos =
  String(combosConfig.tituloBoton ?? '').trim() ||
  'Encuentra el detalle perfecto para regalar'

const combosNormalizados = listaCombos.map((combo, i) => {
  // `fotos` es la nueva lista; si viene el viejo `foto` suelto, se migra a lista.
  const fotos = (Array.isArray(combo?.fotos) ? combo.fotos : []).map(String).filter(Boolean)
  const fotoUnica = String(combo?.foto ?? '').trim()
  if (fotos.length === 0 && fotoUnica) fotos.push(fotoUnica)
  return {
    id: String(combo?.id ?? `combo-${i + 1}`),
    nombre: String(combo?.nombre ?? `Combo ${i + 1}`),
    emoji: String(combo?.emoji ?? '🎁'),
    descripcion: String(combo?.descripcion ?? ''),
    precio: String(combo?.precio ?? ''),
    fotos: fotos.map(conVersion),
  }
})

fs.writeFileSync(
  SALIDA_COMBOS,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/combos.json (o el panel de la web).

export interface ComboProducto {
  id: string
  nombre: string
  /** Emoji que se muestra en la tarjeta mientras el combo no tiene fotos. */
  emoji: string
  descripcion: string
  /** Precio a mostrar; vacío = por confirmar. */
  precio: string
  /** Rutas de las fotos; vacío = sin fotos todavía. */
  fotos: string[]
}

export const combos: ComboProducto[] = ${JSON.stringify(combosNormalizados, null, 2)}

/** Fotos de combos que se muestran en la tira de la sección. */
export const muestraCombos: string[] = ${JSON.stringify(muestraCombos, null, 2)}

/** Foto principal de la sección (sale al lado del botón). */
export const destacadaCombos: string = ${JSON.stringify(destacadaCombos)}

/** Texto del botón que despliega los combos. */
export const tituloBotonCombos: string = ${JSON.stringify(tituloBotonCombos)}
`,
)

console.log(`Combos generados: ${combosNormalizados.length}`)
console.log(`Fotos de muestra de combos: ${muestraCombos.length}`)

console.log(`Catálogo generado: ${total} fotos`)
for (const producto of Object.keys(fotosPorProducto).sort()) {
  console.log(`  ${producto}: ${fotosPorProducto[producto].length}`)
}

// --- Logo de la marca ---

const logoConfig = leerJson(path.join(CONTENIDO, 'logo.json'), {})
const logoActivo = logoConfig.activo !== false
const logoArchivo = String(logoConfig.archivo ?? 'logo-marca.webp').trim() || 'logo-marca.webp'
const logoAlt = String(logoConfig.alt ?? 'PETITE PRINCESSE')
const logoVersion = String(logoConfig.version ?? '1')

fs.writeFileSync(
  SALIDA_LOGO,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/logo.json (o el panel de la web).

export interface LogoMarca {
  /** Si es false, la web no muestra el logo. */
  activo: boolean
  /** Ruta de la imagen (con versión para que se actualice al instante). */
  src: string
  alt: string
}

export const logoMarca: LogoMarca = {
  activo: ${logoActivo},
  src: '/${logoArchivo}?v=${logoVersion}',
  alt: ${JSON.stringify(logoAlt)},
}
`,
)

console.log(`Logo: ${logoActivo ? logoArchivo : 'oculto'}`)

// --- Imágenes de portada de cada categoría de producto ---

const productosConfig = leerJson(path.join(CONTENIDO, 'productos.json'), {})
const portadas = {}
const productosNormalizados = []

if (productosConfig && typeof productosConfig === 'object' && !Array.isArray(productosConfig)) {
  for (const [id, cfg] of Object.entries(productosConfig)) {
    const fotos = Array.isArray(cfg?.fotos)
      ? cfg.fotos.map(String).filter(Boolean).map(conVersion)
      : []
    productosNormalizados.push({
      id,
      nombre: String(cfg?.nombre ?? id),
      descripcion: String(cfg?.descripcion ?? ''),
      fotos,
    })

    const archivo = String(cfg?.portada?.archivo ?? '').trim()
    if (archivo) {
      const version = String(cfg?.portada?.version ?? '1')
      portadas[id] = `${archivo}?v=${version}`
    }
  }
}

fs.writeFileSync(
  SALIDA_PORTADAS,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/productos.json (o el panel de la web).

/** Imagen de portada de cada categoría de producto (la que sale en su tarjeta). */
export const portadas: Record<string, string> = ${JSON.stringify(portadas, null, 2)}
`,
)

fs.writeFileSync(
  SALIDA_PRODUCTOS,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/productos.json (o el panel de la web).

import type { Producto } from '../types'

export const productos: Producto[] = ${JSON.stringify(productosNormalizados, null, 2)}
`,
)

console.log(`Portadas de productos: ${Object.keys(portadas).length}`)
console.log(`Productos: ${productosNormalizados.length}`)

// --- Títulos de las secciones ---

const titulosConfig = leerJson(path.join(CONTENIDO, 'titulos.json'), {})
const titulos = {}
if (titulosConfig && typeof titulosConfig === 'object' && !Array.isArray(titulosConfig)) {
  for (const [id, cfg] of Object.entries(titulosConfig)) {
    const seccion = {
      subtitulo: String(cfg?.subtitulo ?? ''),
      titulo: String(cfg?.titulo ?? ''),
    }
    // Textos extra de algunas secciones (por ejemplo, el párrafo de contacto).
    if (cfg?.texto) seccion.texto = String(cfg.texto)
    if (cfg?.nota) seccion.nota = String(cfg.nota)
    titulos[id] = seccion
  }
}

fs.writeFileSync(
  SALIDA_TITULOS,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/titulos.json (o el panel de la web).

export interface TituloSeccion {
  /** Texto chiquito de arriba. */
  subtitulo: string
  /** Título grande de la sección. */
  titulo: string
  /** Párrafo de la sección (solo en Contacto). */
  texto?: string
  /** Nota de abajo de la sección (solo en Contacto). */
  nota?: string
}

export const titulos: Record<string, TituloSeccion> = ${JSON.stringify(titulos, null, 2)}
`,
)

console.log(`Títulos de secciones: ${Object.keys(titulos).length}`)

// --- Galería de la página ---

const galeriaConfig = leerJson(path.join(CONTENIDO, 'galeria.json'), { fotos: [] })
const fotosGaleria = Array.isArray(galeriaConfig.fotos) ? galeriaConfig.fotos : []

const galeriaNormalizada = fotosGaleria
  .map((foto, i) => ({
    id: `galeria-${i + 1}`,
    etiqueta: String(foto?.etiqueta ?? 'Petite Princesse'),
    src: conVersion(foto?.src),
  }))
  .filter((foto) => foto.src)

fs.writeFileSync(
  SALIDA_GALERIA,
  `// ARCHIVO GENERADO por scripts/generar-catalogo.mjs — no editar a mano.
// La fuente editable es contenido/galeria.json (o el panel de la web).

import type { FotoGaleria } from '../types'

export const fotosGaleria: FotoGaleria[] = ${JSON.stringify(galeriaNormalizada, null, 2)}
`,
)

console.log(`Fotos de la galería: ${galeriaNormalizada.length}`)
