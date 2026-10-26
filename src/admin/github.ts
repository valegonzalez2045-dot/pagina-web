export interface ConfigGitHub {
  owner: string
  repo: string
  branch: string
  token: string
}

export interface ArchivoRemoto {
  name: string
  path: string
  sha: string
  type: string
  size: number
}

const API = 'https://api.github.com'

function cabeceras(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function rutaLimpia(ruta: string): string {
  return ruta.replace(/^\/+/, '')
}

function urlContenido(cfg: ConfigGitHub, ruta: string): string {
  return `${API}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${rutaLimpia(ruta)}`
}

function mensajeError(estado: number, datos: unknown): string {
  const detalle = (datos as { message?: string } | null)?.message
  if (estado === 401) return 'Token inválido o vencido (401). Genera uno nuevo desde GitHub.'
  if (estado === 403)
    return 'Sin permiso (403). El token debe tener permiso "Contents: Read and write" sobre este repositorio.'
  if (estado === 404) return 'No encontrado (404). Revisa el usuario, el repositorio y la rama.'
  if (estado === 409) return 'El cambio chocó con una versión más reciente (409). Carga de nuevo e inténtalo.'
  return `Error ${estado}${detalle ? `: ${detalle}` : ''}`
}

/* ---------- base64 ---------- */

export function bytesABase64(bytes: Uint8Array): string {
  let binario = ''
  const trozo = 0x2000
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo))
  }
  return btoa(binario)
}

function base64ABytes(base64: string): Uint8Array {
  const limpio = base64.replace(/\s/g, '')
  const binario = atob(limpio)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

function textoABase64(texto: string): string {
  return bytesABase64(new TextEncoder().encode(texto))
}

function base64ATexto(base64: string): string {
  return new TextDecoder().decode(base64ABytes(base64))
}

/* ---------- llamadas ---------------- */

async function respuestaJson(respuesta: Response): Promise<unknown> {
  const texto = await respuesta.text()
  try {
    return texto ? JSON.parse(texto) : null
  } catch {
    return null
  }
}

async function asegurar(respuesta: Response): Promise<unknown> {
  if (respuesta.ok) return respuestaJson(respuesta)
  throw new Error(mensajeError(respuesta.status, await respuestaJson(respuesta)))
}

export interface InfoRepositorio {
  privado: boolean
  ramaPorDefecto: string
}

export async function probarConexion(cfg: ConfigGitHub): Promise<InfoRepositorio> {
  const respuesta = await fetch(urlContenido(cfg, ''), { headers: cabeceras(cfg.token) })
  const datos = (await asegurar(respuesta)) as { private?: boolean; default_branch?: string }
  return {
    privado: datos.private ?? false,
    ramaPorDefecto: datos.default_branch ?? cfg.branch,
  }
}

export async function leerTexto(
  cfg: ConfigGitHub,
  ruta: string,
): Promise<{ texto: string; sha: string } | null> {
  const respuesta = await fetch(`${urlContenido(cfg, ruta)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: cabeceras(cfg.token),
  })
  if (respuesta.status === 404) return null
  const datos = (await asegurar(respuesta)) as { content?: string; sha?: string }
  if (!datos.content) return null
  return { texto: base64ATexto(datos.content), sha: datos.sha ?? '' }
}

export async function guardarTexto(
  cfg: ConfigGitHub,
  ruta: string,
  texto: string,
  mensaje: string,
): Promise<void> {
  const actual = await leerTexto(cfg, ruta)
  await asegurar(
    await fetch(urlContenido(cfg, ruta), {
      method: 'PUT',
      headers: { ...cabeceras(cfg.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: mensaje,
        content: textoABase64(texto),
        branch: cfg.branch,
        ...(actual ? { sha: actual.sha } : {}),
      }),
    }),
  )
}

export async function listarCarpeta(cfg: ConfigGitHub, ruta: string): Promise<ArchivoRemoto[]> {
  const respuesta = await fetch(
    `${urlContenido(cfg, ruta)}?ref=${encodeURIComponent(cfg.branch)}`,
    { headers: cabeceras(cfg.token) },
  )
  if (respuesta.status === 404) return []
  const datos = await asegurar(respuesta)
  return Array.isArray(datos) ? (datos as ArchivoRemoto[]) : []
}

export async function subirArchivo(
  cfg: ConfigGitHub,
  ruta: string,
  base64: string,
  mensaje: string,
): Promise<void> {
  const carpeta = ruta.split('/').slice(0, -1).join('/')
  const nombre = ruta.split('/').pop() ?? ''
  let shaExistente: string | undefined
  const archivos = await listarCarpeta(cfg, carpeta)
  const existente = archivos.find((a) => a.name === nombre)
  if (existente) shaExistente = existente.sha

  await asegurar(
    await fetch(urlContenido(cfg, ruta), {
      method: 'PUT',
      headers: { ...cabeceras(cfg.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: mensaje,
        content: base64,
        branch: cfg.branch,
        ...(shaExistente ? { sha: shaExistente } : {}),
      }),
    }),
  )
}

export async function borrarArchivo(
  cfg: ConfigGitHub,
  ruta: string,
  sha: string,
  mensaje: string,
): Promise<void> {
  await asegurar(
    await fetch(urlContenido(cfg, ruta), {
      method: 'DELETE',
      headers: { ...cabeceras(cfg.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: mensaje, sha, branch: cfg.branch }),
    }),
  )
}

export interface ArchivoParaGuardar {
  ruta: string
  base64: string
}

/**
 * Guarda varios archivos (y borra otros) en UN SOLO commit.
 *
 * Se usa en la pestaña «Fotos»: aunque cambies 20 fotos, precios y el orden,
 * a GitHub llega un único cambio y la web se compila UNA sola vez (así no se
 * gastan compilaciones de más).
 */
export async function guardarLote(
  cfg: ConfigGitHub,
  archivos: ArchivoParaGuardar[],
  borrados: string[],
  mensaje: string,
): Promise<void> {
  if (archivos.length === 0 && borrados.length === 0) return

  const repo = `${API}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`
  const conJson = { ...cabeceras(cfg.token), 'Content-Type': 'application/json' }
  const rama = encodeURIComponent(cfg.branch)

  // 1. En qué commit está la rama ahora.
  const referencia = (await asegurar(
    await fetch(`${repo}/git/ref/heads/${rama}`, { headers: cabeceras(cfg.token) }),
  )) as { object?: { sha?: string } }
  const commitActual = referencia.object?.sha
  if (!commitActual) throw new Error('No se encontró la rama en GitHub.')

  const commit = (await asegurar(
    await fetch(`${repo}/git/commits/${commitActual}`, {
      headers: cabeceras(cfg.token),
    }),
  )) as { tree?: { sha?: string } }
  const arbolBase = commit.tree?.sha
  if (!arbolBase) throw new Error('No se encontró el árbol de archivos en GitHub.')

  // 2. Se sube el contenido de cada archivo (en paralelo, de a 4).
  const entradas: Array<{ path: string; mode: string; type: string; sha: string | null }> = []

  const subirBlob = async (archivo: ArchivoParaGuardar) => {
    const blob = (await asegurar(
      await fetch(`${repo}/git/blobs`, {
        method: 'POST',
        headers: conJson,
        body: JSON.stringify({ content: archivo.base64, encoding: 'base64' }),
      }),
    )) as { sha?: string }
    if (!blob.sha) throw new Error(`No se pudo subir "${archivo.ruta}".`)
    entradas.push({
      path: rutaLimpia(archivo.ruta),
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    })
  }

  for (let i = 0; i < archivos.length; i += 4) {
    await Promise.all(archivos.slice(i, i + 4).map(subirBlob))
  }

  // 3. Los archivos borrados (sha: null).
  for (const ruta of borrados) {
    entradas.push({ path: rutaLimpia(ruta), mode: '100644', type: 'blob', sha: null })
  }

  // 4. Árbol y commit nuevos.
  const arbol = (await asegurar(
    await fetch(`${repo}/git/trees`, {
      method: 'POST',
      headers: conJson,
      body: JSON.stringify({ base_tree: arbolBase, tree: entradas }),
    }),
  )) as { sha?: string }
  if (!arbol.sha) throw new Error('No se pudo preparar el cambio.')

  const nuevoCommit = (await asegurar(
    await fetch(`${repo}/git/commits`, {
      method: 'POST',
      headers: conJson,
      body: JSON.stringify({
        message: mensaje,
        tree: arbol.sha,
        parents: [commitActual],
      }),
    }),
  )) as { sha?: string }
  if (!nuevoCommit.sha) throw new Error('No se pudo crear el cambio.')

  // 5. Se mueve la rama al commit nuevo.
  await asegurar(
    await fetch(`${repo}/git/refs/heads/${rama}`, {
      method: 'PATCH',
      headers: conJson,
      body: JSON.stringify({ sha: nuevoCommit.sha, force: false }),
    }),
  )
}

/** URL directa del archivo en GitHub (para ver las fotos). */
export function urlCruda(cfg: ConfigGitHub, ruta: string): string {
  return `https://raw.githubusercontent.com/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/${encodeURIComponent(cfg.branch)}/${rutaLimpia(ruta)}`
}