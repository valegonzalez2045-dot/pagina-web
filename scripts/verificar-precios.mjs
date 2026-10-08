import { catalogo } from '../src/data/catalogo.ts'

const esperado = {
  3: '$3.000', 4: '$4.000', 5: '$4.000', 6: '$4.000', 7: '$4.000', 8: '$4.000',
  9: '$4.500', 10: '$4.500', 11: '$4.500', 12: '$5.000', 13: '$5.000', 14: '$5.000',
  15: '$6.000', 16: '$6.000', 17: '$6.000', 18: '$6.000', 19: '$6.000',
  20: '$7.000', 21: '$7.000', 22: '$8.700', 23: '$11.600',
}

let errores = 0
let revisadas = 0
for (const [producto, arr] of Object.entries(catalogo)) {
  if (!['chocogalletas', 'chocoreo', 'chocodelicias'].includes(producto)) continue
  for (const foto of arr) {
    const pagina = Number(foto.src.match(/-(\d+)-/)[1])
    revisadas++
    if (esperado[pagina] !== foto.precio) {
      errores++
      if (errores <= 10) {
        console.log('MISMATCH', producto, foto.src, 'pag' + pagina, '->', foto.precio, 'esperado', esperado[pagina])
      }
    }
  }
}
console.log('revisadas:', revisadas, 'errores:', errores)
