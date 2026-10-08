import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Extrae automáticamente las fotos del catálogo PNG (1.png ... N.png).
 *
 * Cómo funciona:
 *  1. Detecta los colores de fondo de la página (claros y predominantes).
 *  2. Marca como "contenido" todo lo que se aleje de ese fondo.
 *  3. Agrupa el contenido en bloques y encuentra las zonas (bounding boxes).
 *  4. Filtra: descarta texto y formas planas (pocos colores), deja fotos.
 *  5. Recorta cada foto y genera una vista previa en public/catalogo-preview.
 *
 * Salida:
 *  - imagenes-extraidas/pag-PP-N.png   (recortes a resolución completa)
 *  - imagenes-extraidas/manifest.json  (qué salió y de dónde)
 *  - public/catalogo-preview/          (miniaturas + preview.html para revisar)
 */

const RAIZ = process.cwd()
const SALIDA = path.join(RAIZ, 'imagenes-extraidas')
const PREVIA = path.join(RAIZ, 'public', 'catalogo-preview')

const UMBRAL_COLOR = 38   // qué tan lejos del fondo empieza a ser "contenido"
const BLOQUE = 4          // px por bloque al agrupar
const RADIO = 2           // bloques de dilatación (une partes de la misma foto)
const MIN_LADO = 140      // lado mínimo del recorte en px
const MIN_RELLENO = 0.42  // proporción mínima de contenido dentro de la caja
const MIN_COLORES = 30    // colores distintos mínimos (el texto no llega aquí)

const paginas = fs
  .readdirSync(RAIZ)
  .filter((f) => /^\d+\.png$/.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b))

if (paginas.length === 0) {
  console.error('No encontré ningún N.png en la carpeta del proyecto.')
  process.exit(1)
}

fs.mkdirSync(SALIDA, { recursive: true })
fs.mkdirSync(PREVIA, { recursive: true })

const manifest = []
let total = 0

function coloresDeFondo(data) {
  const hist = new Map()
  for (let i = 0; i < data.length; i += 3) {
    const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
    hist.set(k, (hist.get(k) || 0) + 1)
  }
  const px = data.length / 3
  return [...hist.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .filter(([k, v]) => {
      const r = ((k >> 8) & 15) * 17
      const g = ((k >> 4) & 15) * 17
      const b = (k & 15) * 17
      // Fondo = color claro y predominante (el texto negro nunca es fondo)
      return v / px > 0.04 && Math.min(r, g, b) >= 185
    })
    .map(([k]) => [((k >> 8) & 15) * 17, ((k >> 4) & 15) * 17, (k & 15) * 17])
}

function componentes(activo, cols, filas) {
  const visitado = new Uint8Array(cols * filas)
  const cajas = []
  const vecinos = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ]

  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < cols; c++) {
      const inicio = f * cols + c
      if (!activo[inicio] || visitado[inicio]) continue

      let minC = c, maxC = c, minF = f, maxF = f, cuenta = 0
      const pila = [inicio]
      visitado[inicio] = 1

      while (pila.length) {
        const idx = pila.pop()
        cuenta++
        const cc = idx % cols
        const ff = (idx - cc) / cols
        if (cc < minC) minC = cc
        if (cc > maxC) maxC = cc
        if (ff < minF) minF = ff
        if (ff > maxF) maxF = ff

        for (const [dc, df] of vecinos) {
          const nc = cc + dc
          const nf = ff + df
          if (nc < 0 || nf < 0 || nc >= cols || nf >= filas) continue
          const ni = nf * cols + nc
          if (activo[ni] && !visitado[ni]) {
            visitado[ni] = 1
            pila.push(ni)
          }
        }
      }

      cajas.push({ minC, maxC, minF, maxF, cuenta })
    }
  }
  return cajas
}

for (const pagina of paginas) {
  const num = pagina.replace('.png', '')
  const archivo = path.join(RAIZ, pagina)

  const { data, info } = await sharp(archivo)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: ancho, height: alto, channels } = info
  const fondos = coloresDeFondo(data)
  if (fondos.length === 0) {
    console.log(`pág ${num}: sin fondo claro detectado, se omite`)
    continue
  }

  // Máscara de contenido
  const cols = Math.ceil(ancho / BLOQUE)
  const filas = Math.ceil(alto / BLOQUE)
  const conteo = new Uint8Array(cols * filas)

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * channels
      const r = data[i], g = data[i + 1], b = data[i + 2]
      let esContenido = true
      for (const [fr, fg, fb] of fondos) {
        const dr = r - fr, dg = g - fg, db = b - fb
        if (dr * dr + dg * dg + db * db <= UMBRAL_COLOR * UMBRAL_COLOR) {
          esContenido = false
          break
        }
      }
      if (esContenido) {
        conteo[Math.floor(y / BLOQUE) * cols + Math.floor(x / BLOQUE)]++
      }
    }
  }

  const porBloque = BLOQUE * BLOQUE
  let activo = new Uint8Array(cols * filas)
  for (let i = 0; i < activo.length; i++) {
    if (conteo[i] >= porBloque * 0.25) activo[i] = 1
  }

  // Dilatación (une fragmentos de la misma foto)
  const dilatado = new Uint8Array(cols * filas)
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < cols; c++) {
      if (!activo[f * cols + c]) continue
      for (let df = -RADIO; df <= RADIO; df++) {
        for (let dc = -RADIO; dc <= RADIO; dc++) {
          const nf = f + df, nc = c + dc
          if (nf >= 0 && nf < filas && nc >= 0 && nc < cols) {
            dilatado[nf * cols + nc] = 1
          }
        }
      }
    }
  }

  const cajas = componentes(dilatado, cols, filas)
  const candidatas = []

  for (const caja of cajas) {
    let x = caja.minC * BLOQUE
    let y = caja.minF * BLOQUE
    let w = Math.min(ancho, (caja.maxC + 1) * BLOQUE) - x
    let h = Math.min(alto, (caja.maxF + 1) * BLOQUE) - y

    if (w < MIN_LADO || h < MIN_LADO) continue
    if (w / h > 4 || h / w > 4) continue

    // Rellenos y colores dentro de la caja
    let contenido = 0
    const colores = new Set()
    for (let yy = y; yy < y + h; yy += 2) {
      for (let xx = x; xx < x + w; xx += 2) {
        const i = (yy * ancho + xx) * channels
        const r = data[i], g = data[i + 1], b = data[i + 2]
        let esContenido = true
        for (const [fr, fg, fb] of fondos) {
          const dr = r - fr, dg = g - fg, db = b - fb
          if (dr * dr + dg * dg + db * db <= UMBRAL_COLOR * UMBRAL_COLOR) {
            esContenido = false
            break
          }
        }
        if (esContenido) contenido++
        colores.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4))
      }
    }
    const muestras = Math.ceil(w / 2) * Math.ceil(h / 2)
    const relleno = contenido / muestras

    if (relleno < MIN_RELLENO) continue       // texto / formas ralas
    if (colores.size < MIN_COLORES) continue  // texto plano / logos / decoración

    candidatas.push({ x, y, w, h, relleno, colores: colores.size })
  }

  // Orden de lectura: de arriba hacia abajo, izquierda a derecha
  candidatas.sort((a, b) => a.y - b.y || a.x - b.x)

  let n = 0
  for (const caja of candidatas) {
    n++
    total++
    const nombre = `pag-${String(num).padStart(2, '0')}-${n}.png`
    await sharp(archivo)
      .extract({ left: caja.x, top: caja.y, width: caja.w, height: caja.h })
      .png()
      .toFile(path.join(SALIDA, nombre))

    await sharp(archivo)
      .extract({ left: caja.x, top: caja.y, width: caja.w, height: caja.h })
      .resize(360)
      .jpeg({ quality: 72 })
      .toFile(path.join(PREVIA, nombre.replace('.png', '.jpg')))

    manifest.push({
      recorte: nombre,
      pagina: num,
      origen: pagina,
      x: caja.x,
      y: caja.y,
      w: caja.w,
      h: caja.h,
      relleno: Math.round(caja.relleno * 100) / 100,
      colores: caja.colores,
    })
  }

  console.log(`pág ${num}: ${n} foto(s)`)
}

fs.writeFileSync(
  path.join(SALIDA, 'manifest.json'),
  JSON.stringify({ total, paginas: paginas.length, recortes: manifest }, null, 2),
)

// Página de revisión
const items = manifest
  .map(
    (m) => `
    <figure>
      <img src="${m.recorte.replace('.png', '.jpg')}" loading="lazy" alt="">
      <figcaption>${m.recorte}</figcaption>
    </figure>`,
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
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
  figure { margin: 0; background: #2a2030; border-radius: 10px; overflow: hidden; }
  img { width: 100%; height: 170px; object-fit: cover; display: block; }
  figcaption { font-size: 12px; padding: 7px 9px; color: #e6c9d6; }
</style>
</head>
<body>
<h1>${total} fotos extraídas de ${paginas.length} páginas</h1>
<p>Dime: ¿falta alguna foto? ¿sobran? y luego cómo las acomodamos en la web.</p>
<div class="grid">${items}</div>
</body>
</html>
`,
)

console.log(`\nTotal: ${total} fotos`)
console.log(`Recortes completos: ${SALIDA}`)
console.log(`Revisión:          ${PREVIA}/preview.html`)
