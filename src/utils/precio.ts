/** Convierte "$4.500" o "4.500" en un número. Devuelve null si no hay precio. */
export function precioANumero(texto: string): number | null {
  if (!texto) return null
  const soloDigitos = texto.replace(/[^0-9]/g, '')
  const numero = parseInt(soloDigitos, 10)
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

/** Formatea un número en pesos colombianos: 4500 -> "$4.500" */
export function formatearPrecio(numero: number): string {
  return `$${numero.toLocaleString('es-CO')}`
}