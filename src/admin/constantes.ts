/** Etiquetas amables de las secciones del catálogo (para los formularios). */
export const SECCIONES_LABEL: Record<string, string> = {
  'chocomellows-sencillos': 'Chocomellows sencillos',
  'chocomellows-dobles': 'Chocomellows dobles',
  chocogalletas: 'Chocogalletas',
  chocoreo: 'Chocoreo',
  chocodelicias: 'Chocodelicias',
  artecookies: 'Artecookies',
  sweetcakes: 'Sweetcakes',
  cupcakes: 'Cupcakes',
  cakepops: 'Cakepops',
  'cookie-fusion': 'Cookie Fusion',
  cookies: 'Cookies',
  'fresas-con-crema': 'Fresas con crema',
}

/** Etiquetas amables de los productos que se muestran en la web. */
export const PRODUCTOS_LABEL: Record<string, string> = {
  chocomellows: 'Chocomellows',
  chocogalletas: 'Chocogalletas',
  chocoreo: 'Chocoreo',
  'cookie-fusion': 'Cookie Fusion',
  artecookies: 'Artecookies',
  chocodelicias: 'Chocodelicias',
  sweetcakes: 'Sweetcakes',
  cupcakes: 'Cupcakes',
  cakepops: 'Cakepops',
  cookies: 'Cookies',
  'fresas-con-crema': 'Fresas con crema',
}

/** Par sea: "chocomellows-sencillos-24-1.webp" -> { pagina: 24, orden: 1 } */
export function desglosarNombre(nombre: string): { pagina: number; orden: number } {
  const coincidencia = nombre.match(/-(\d+)-(\d+)\.webp$/i)
  if (!coincidencia) return { pagina: 0, orden: 0 }
  return { pagina: Number(coincidencia[1]), orden: Number(coincidencia[2]) }
}