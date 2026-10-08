import fs from 'node:fs'

// Reconstruye filas a partir de las palabras de OCR con sus coordenadas.
// Uso: node scripts/leer-tabla47.mjs [archivo.json]
const archivo = process.argv[2] ?? 'imagenes-extraidas/pag47-palabras.json'
const txt = fs.readFileSync(archivo, 'utf8').replace(/^\uFEFF/, '')
const palabras = JSON.parse(txt).sort((a, b) => a.y - b.y || a.x - b.x)

const filas = []
for (const p of palabras) {
  const ultima = filas[filas.length - 1]
  if (ultima && Math.abs(p.y - ultima[ultima.length - 1].y) <= 22) ultima.push(p)
  else filas.push([p])
}

for (const fila of filas) {
  const items = fila.sort((a, b) => a.x - b.x)
  console.log(
    String(items[0].y).padStart(5),
    '|',
    items.map((i) => `${String(i.x).padStart(4)}:${i.t}`).join('  '),
  )
}
