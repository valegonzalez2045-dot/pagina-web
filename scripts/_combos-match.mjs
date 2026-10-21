import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Busca, dentro de cada foto de combo, los diseños de productos que
 * aparecen en ella (coincidencia de plantilla multiescala, gris + NCC).
 * Sirve para saber qué foto de la carpeta "combos" corresponde a cada combo.
 */

const RAIZ = process.cwd()

async function gris(file, ancho, alto = null) {
  const { data, info } = await sharp(file)
    .resize(ancho, alto, { fit: 'fill', background: '#000000' })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

function ncc(ventana, plantilla, w, h, sumaV, sqV, sumaT, sqT) {
  const n = w * h
  const cov = sumaV * sumaT / n
  const varV = sqV - cov
  const varT = sqT - cov
  if (varV <= 0 || varT <= 0) return 0
  let s = 0
  for (let y = 0; y < h; y++) {
    const off = y * w
    for (let x = 0; x < w; x++) {
      s += ventana[off + x] * plantilla[y * w + x]
    }
  }
  s = s - cov
  return s / Math.sqrt(varV * varT)
}

function integrals(data, w, h) {
  const I = new Float64Array((w + 1) * (h + 1))
  const I2 = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = data[y * w + x]
      const idx = (y + 1) * (w + 1) + (x + 1)
      const izq = y * (w + 1) + (x + 1)
      const arr = (y + 1) * (w + 1) + x
      const sup = y * (w + 1) + (x + 1)
      I[idx] = v + I[izq] + I[arr] - I[sup]
      I2[idx] = v * v + I2[izq] + I2[arr] - I2[sup]
    }
  }
  return { I, I2 }
}

function sumaRect(I, x0, y0, x1, y1) {
  const w = I.width + 1
  return (
    I[(y1 + 1) * w + (x1 + 1)] -
    I[y0 * w + (x1 + 1)] -
    I[(y1 + 1) * w + x0] +
    I[y0 * w + x0]
  )
}

function buscar(objetivo, plantilla, escala) {
  const w = plantilla.w
  const h = plantilla.h
  if (w > objetivo.w || h > objetivo.h) return { valor: 0, x: 0, y: 0 }
  const { I, I2 } = objetivo.integrales
  let sumaT = 0
  let sqT = 0
  for (let i = 0; i < plantilla.data.length; i++) {
    sumaT += plantilla.data[i]
    sqT += plantilla.data[i] * plantilla.data[i]
  }
  let mejor = { valor: -2, x: 0, y: 0 }
  const paso = Math.max(1, Math.round(Math.min(w, h) / 12))
  const pasoFino = 1
  for (let y = 0; y + h <= objetivo.h; y += paso) {
    for (let x = 0; x + w <= objetivo.w; x += paso) {
      const sumaV = sumaRect(I, x, y, x + w - 1, y + h - 1)
      const sqV = sumaRect(I2, x, y, x + w - 1, y + h - 1)
      const v = ncc(objetivo.data.subarray(y * objetivo.w + x), plantilla.data, w, h, sumaV, sqV, sumaT, sqT)
      if (v > mejor.valor) mejor = { valor: v, x, y }
    }
  }
  // refinado
  const y0 = Math.max(0, mejor.y - paso)
  const y1 = Math.min(objetivo.h - h, mejor.y + paso)
  const x0 = Math.max(0, mejor.x - paso)
  const x1 = Math.min(objetivo.w - w, mejor.x + paso)
  for (let y = y0; y <= y1; y += pasoFino) {
    for (let x = x0; x <= x1; x += pasoFino) {
      const sumaV = sumaRect(I, x, y, x + w - 1, y + h - 1)
      const sqV = sumaRect(I2, x, y, x + w - 1, y + h - 1)
      const v = ncc(objetivo.data.subarray(y * objetivo.w + x), plantilla.data, w, h, sumaV, sqV, sumaT, sqT)
      if (v > mejor.valor) mejor = { valor: v, x, y }
    }
  }
  return mejor
}

// --- carga de datos ---------------------------------------------------------

const dirCombos = path.join(RAIZ, 'fotos web', 'combos')
const fotosCombo = fs
  .readdirSync(dirCombos)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .sort()

// plantillas: las fotos con nombre que dicen qué diseño es
const plantillas = []
const dirCovers = path.join(RAIZ, 'public', 'productos')
for (const f of fs.readdirSync(dirCovers).filter((f) => f.endsWith('.webp'))) {
  plantillas.push({ etiqueta: `portada:${f.replace('.webp', '')}`, ruta: path.join(dirCovers, f) })
}
const conNombre = [
  ['chocomellows', 'vaca.png'],
  ['chocomellows', 'cariñositos.jpeg'],
  ['chocomellows', 'furia m.jpg'],
  ['chocoreo', 'vaca chocoreo.jpg'],
  ['chocogalletas', 'harry.png'],
  ['chocogalletas', 'spiderman.png'],
  ['artecookies', 'galletas monster.jpeg'],
  ['artecookies', 'gary.jpg'],
  ['artecookies', 'kpop.jpeg'],
]
for (const [carpeta, f] of conNombre) {
  plantillas.push({ etiqueta: `foto:${carpeta}/${f}`, ruta: path.join(RAIZ, 'fotos web', carpeta, f) })
}

const ESCALAS = [48, 72, 104, 140]
const plantillasListas = []
for (const p of plantillas) {
  for (const e of ESCALAS) {
    const g = await gris(p.ruta, e)
    plantillasListas.push({ etiqueta: p.etiqueta, escala: e, ...g })
  }
}

console.log(`Plantillas: ${plantillas.length} (x${ESCALAS.length} escalas)`)
for (const f of fotosCombo) {
  const g = await gris(path.join(dirCombos, f), 260)
  const objetivo = { ...g, integrales: { I: null, I2: null } }
  const { I, I2 } = integrals(g.data, g.w, g.h)
  objetivo.integrales = {
    I: Object.assign(I, { width: g.w, height: g.h }),
    I2: Object.assign(I2, { width: g.w, height: g.h }),
  }
  const mejores = new Map()
  for (const p of plantillasListas) {
    const r = buscar(objetivo, p, p.escala)
    const actual = mejores.get(p.etiqueta)
    if (!actual || r.valor > actual.valor) mejores.set(p.etiqueta, { valor: r.valor, x: r.x, y: r.y, escala: p.escala })
  }
  const lista = [...mejores.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 8)
  console.log(`\n${f} (${g.w}x${g.h})`)
  for (const [etiqueta, r] of lista) {
    console.log(`   ${r.valor.toFixed(3)}  ${etiqueta}  (escala ${r.escala}, en ${r.x},${r.y})`)
  }
}
