import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Integra las fotos de "fotos web/<carpeta>" en el catálogo del sitio.
 *
 * Reglas:
 *  - Cada carpeta de "fotos web" es un producto.
 *  - Las fotos se ordenan por fecha (la del nombre si se puede leer, si no la
 *    del archivo) para que salgan en orden cronológico.
 *  - Los archivos del catálogo se nombran <seccion>-<pagina>-<n>.webp. El
 *    número de página es el que define el precio (contenido/precios.json).
 *  - Cada foto nueva REEMPLAZA a una vieja en su mismo archivo, así el precio
 *    de cada foto se conserva tal cual.
 *  - Si sobran fotos nuevas (más que las viejas de esa página) se agregan con
 *    el mismo número de página, así que conservan el precio de esa página.
 *  - Si sobran fotos viejas, NO se borran: se quedan al final de su página.
 */

const RAIZ = process.cwd()
const ORIGEN = path.join(RAIZ, 'fotos web')
const CATALOGO = path.join(RAIZ, 'public', 'catalogo')

const precios = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'contenido', 'precios.json'), 'utf8'),
)
const secciones = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'contenido', 'secciones.json'), 'utf8'),
)

/** Carpeta de "fotos web" -> secciones del catálogo que le corresponden. */
const CARPETAS = {
  chocomellows: ['chocomellows-sencillos', 'chocomellows-dobles'],
  chocogalletas: ['chocogalletas'],
  chocodelicias: ['chocodelicias'],
  chocoreo: ['chocoreo'],
  artecookies: ['artecookies'],
  sweetcakes: ['sweetcakes'],
  cupcakes: ['cupcakes'],
  cakepop: ['cakepops'],
  'Fresas con crema': ['fresas-con-crema'],
}

const ANCHO = 700
const CALIDAD = 80

// ---------------------------------------------------------------- utilidades

function analizarNombre(nombre) {
  const m = nombre.match(/-(\d+)-(\d+)\.webp$/)
  if (!m) return { pagina: 0, orden: 0 }
  return { pagina: Number(m[1]), orden: Number(m[2]) }
}

function fechaDesdeNombre(nombre) {
  let m
  // 1756308967964_083218.png  (milisegundos desde 1970)
  m = nombre.match(/^(\d{13})/)
  if (m) return Number(m[1])
  // 2025-01-17 (WhatsApp, capturas...)
  m = nombre.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return validar(m[1], m[2], m[3])
  // IMG_20240716_105558 / IMG20250320203330 / MVIMG_20260618_125443
  m = nombre.match(/(\d{4})(\d{2})(\d{2})(?:[_-]?(\d{2})(\d{2})(\d{2}))?/)
  if (m) return validar(m[1], m[2], m[3], m[4], m[5], m[6])
  return null
}

function validar(anio, mes, dia, hora = '00', min = '00', seg = '00') {
  const t = Date.parse(
    `${anio}-${mes}-${dia}T${hora}:${min}:${seg}Z`,
  )
  return Number.isNaN(t) ? null : t
}

function claveOrden(nombre, mtimeMs) {
  return fechaDesdeNombre(nombre) ?? mtimeMs
}

function precioDe(seccion, producto, pagina, base) {
  return (
    precios.porArchivo?.[`${seccion}/${base}`] ??
    precios.porSeccion?.[seccion] ??
    precios.porProducto?.[producto] ??
    ''
  )
}

/** Reparte `total` fotos entre grupos de tamaño [n1, n2, ...] de forma proporcional. */
function repartir(tamanos, total) {
  const suma = tamanos.reduce((a, b) => a + b, 0)
  if (suma === 0) return []
  const exacto = tamanos.map((n) => (n / suma) * total)
  const base = exacto.map(Math.floor)
  let faltan = total - base.reduce((a, b) => a + b, 0)
  const orden = exacto
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; faltan > 0; k++, faltan--) base[orden[k % orden.length].i]++
  return base
}

// ------------------------------------------------------------------ lectura

function listarSeccion(seccion) {
  const dir = path.join(CATALOGO, seccion)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.webp'))
    .map((nombre) => ({ nombre, ...analizarNombre(nombre) }))
    .sort((a, b) => a.pagina - b.pagina || a.orden - b.orden)
}

function listarCarpeta(carpeta) {
  const dir = path.join(ORIGEN, carpeta)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .map((nombre) => {
      const stat = fs.statSync(path.join(dir, nombre))
      return { nombre, ruta: path.join(dir, nombre), orden: claveOrden(nombre, stat.mtimeMs) }
    })
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
}

// ------------------------------------------------------------------ proceso

const informe = []

for (const [carpeta, listaSecciones] of Object.entries(CARPETAS)) {
  const fotos = listarCarpeta(carpeta)
  if (fotos.length === 0) continue

  // Reparto de la carpeta entre las secciones (para chocomellows: sencillo/doble)
  const slotsPorSeccion = listaSecciones.map((s) => listarSeccion(s).length)
  const reparto = repartir(slotsPorSeccion, fotos.length)

  let indice = 0
  for (let i = 0; i < listaSecciones.length; i++) {
    const seccion = listaSecciones[i]
    const slots = listarSeccion(seccion)
    const producto = secciones[seccion]
    if (slots.length === 0) continue

    // Agrupar los archivos viejos por página (el precio viene de la página)
    const grupos = []
    for (const slot of slots) {
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && ultimo.pagina === slot.pagina) ultimo.slots.push(slot)
      else grupos.push({ pagina: slot.pagina, slots: [slot] })
    }

    const nuevas = fotos.slice(indice, indice + reparto[i])
    indice += reparto[i]

    // Reparto proporcional de las fotos nuevas entre los grupos (páginas)
    const porGrupo = repartir(
      grupos.map((g) => g.slots.length),
      nuevas.length,
    )

    let n = 0
    for (let gi = 0; gi < grupos.length; gi++) {
      const grupo = grupos[gi]
      const cuantas = porGrupo[gi]
      if (cuantas <= 0) continue
      const yaUsadas = new Set()
      for (let k = 0; k < cuantas; k++) {
        const foto = nuevas[n++]
        let destino
        if (k < grupo.slots.length) {
          destino = grupo.slots[k].nombre // reemplaza al viejo en su archivo
        } else {
          // sobraron fotos: se agregan al final de la misma página
          let orden = grupo.slots[grupo.slots.length - 1].orden
          do {
            orden++
            const nombre = `${seccion}-${String(grupo.pagina).padStart(2, '0')}-${orden}.webp`
            if (!fs.existsSync(path.join(CATALOGO, seccion, nombre))) {
              destino = nombre
              break
            }
          } while (orden < 10000)
        }
        if (!destino) continue
        yaUsadas.add(destino)
        const rutaDestino = path.join(CATALOGO, seccion, destino)
        await sharp(foto.ruta)
          .resize({ width: ANCHO, withoutEnlargement: true })
          .webp({ quality: CALIDAD })
          .toFile(rutaDestino)
      }
      informe.push({
        seccion,
        producto,
        pagina: grupo.pagina,
        precio: precioDe(
          seccion,
          producto,
          grupo.pagina,
          grupo.slots[0].nombre.replace(/\.webp$/, ''),
        ),
        nuevas: cuantas,
        viejas: grupo.slots.length,
        conservadas: Math.max(0, grupo.slots.length - cuantas),
      })
    }
  }
}

// ------------------------------------------------------------------ resumen

console.log('\n=== Resumen ===')
const porSeccion = {}
for (const fila of informe) {
  porSeccion[fila.seccion] ??= { nuevas: 0, viejas: 0, conservadas: 0 }
  porSeccion[fila.seccion].nuevas += fila.nuevas
  porSeccion[fila.seccion].viejas += fila.viejas
  porSeccion[fila.seccion].conservadas += fila.conservadas
}
for (const [seccion, d] of Object.entries(porSeccion)) {
  console.log(
    `  ${seccion}: ${d.nuevas} fotos nuevas, ${d.conservadas} viejas conservadas (de ${d.viejas})`,
  )
}
fs.writeFileSync(
  path.join(RAIZ, 'informe-fotos.json'),
  JSON.stringify(informe, null, 2),
  'utf8',
)
console.log('\nInforme guardado en informe-fotos.json')
