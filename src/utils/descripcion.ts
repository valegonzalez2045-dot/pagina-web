/**
 * Las descripciones traen una frase destacada (primera línea) y
 * el párrafo completo (después del salto de línea).
 */
export function separarDescripcion(texto: string): {
  lema: string
  cuerpo: string
} {
  const [lema, ...resto] = texto
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  return { lema: lema ?? '', cuerpo: resto.join(' ') }
}