/**
 * Extrae el primer monto en pesos de un texto como "$4.500",
 * "Sencillo · $7.000" o "$5.000 · 50 gr". Devuelve null si no hay precio.
 */
export function precioANumero(texto: string): number | null {
  if (!texto) return null
  const conSigno = texto.match(/\$([\d.,]+)/)
  const fragmento = conSigno?.[1] ?? texto.match(/(\d[\d.,]*)/)?.[1]
  if (!fragmento) return null
  const soloDigitos = fragmento.replace(/[^0-9]/g, '')
  const numero = parseInt(soloDigitos, 10)
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

/** Formatea un número en pesos colombianos: 4500 -> "$4.500" */
export function formatearPrecio(numero: number): string {
  return `$${numero.toLocaleString('es-CO')}`
}