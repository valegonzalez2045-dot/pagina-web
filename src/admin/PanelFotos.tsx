import { useEffect, useMemo, useState } from 'react'
import type { ConfigGitHub } from './github'
import { borrarArchivo, guardarTexto, leerTexto, listarCarpeta, subirArchivo, urlCruda } from './github'
import { comprimirImagen } from './compresor'
import { desglosarNombre, PRODUCTOS_LABEL, SECCIONES_LABEL } from './constantes'

/** Una foto del catálogo: a qué sección pertenece, cómo se llama y su precio. */
interface EntradaFoto {
  seccion: string
  foto: string
  precio: string
}

type ListaPorProducto = Record<string, EntradaFoto[]>

interface MapaPrecios {
  porArchivo: Record<string, string>
  porPagina: Record<string, string>
  porSeccion: Record<string, string>
  porProducto: Record<string, string>
}

const ORDEN_VACIO: ListaPorProducto = {}
const PRECIOS_VACIOS: MapaPrecios = {
  porArchivo: {},
  porPagina: {},
  porSeccion: {},
  porProducto: {},
}

/** Las fotos de un producto se muestran en este orden. */
export function PanelFotos({ cfg }: { cfg: ConfigGitHub }) {
  const [secciones, setSecciones] = useState<Record<string, string>>({})
  const [producto, setProducto] = useState('')
  const [lista, setLista] = useState<ListaPorProducto>(ORDEN_VACIO)
  const [precios, setPrecios] = useState<MapaPrecios>(PRECIOS_VACIOS)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [arrastrando, setArrastrando] = useState<number | null>(null)

  // Para agregar foto nueva
  const [seccionNueva, setSeccionNueva] = useState('')
  const [paginaNueva, setPaginaNueva] = useState('40')
  const [ordenNueva, setOrdenNueva] = useState('')

  /** Secciones que pertenecen al producto elegido. */
  const seccionesDelProducto = useMemo(
    () => Object.entries(secciones).filter(([, p]) => p === producto).map(([s]) => s),
    [secciones, producto],
  )

  /** Precio por defecto de una foto (el de página/sección, si no tiene uno propio). */
  const precioPorDefecto = (
    seccion: string,
    archivo: string,
    mapa: MapaPrecios = precios,
    mapaSecciones: Record<string, string> = secciones,
  ) => {
    const { pagina } = desglosarNombre(archivo)
    const base = archivo.replace(/\.webp$/i, '')
    return (
      mapa.porArchivo[`${seccion}/${base}`] ??
      mapa.porPagina[String(pagina)] ??
      mapa.porSeccion[seccion] ??
      mapa.porProducto[mapaSecciones[seccion]] ??
      ''
    )
  }

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const [archivoSecciones, archivoFotos, archivoPrecios] = await Promise.all([
        leerTexto(cfg, 'contenido/secciones.json'),
        leerTexto(cfg, 'contenido/fotos.json'),
        leerTexto(cfg, 'contenido/precios.json'),
      ])

      const mapaSecciones = archivoSecciones
        ? (JSON.parse(archivoSecciones.texto) as Record<string, string>)
        : {}
      setSecciones(mapaSecciones)

      const crudo = archivoPrecios
        ? (JSON.parse(archivoPrecios.texto) as Partial<MapaPrecios>)
        : {}
      const mapaPrecios: MapaPrecios = {
        porArchivo: crudo.porArchivo ?? {},
        porPagina: crudo.porPagina ?? {},
        porSeccion: crudo.porSeccion ?? {},
        porProducto: crudo.porProducto ?? {},
      }
      setPrecios(mapaPrecios)

      const ordenGuardado = archivoFotos
        ? (JSON.parse(archivoFotos.texto) as ListaPorProducto)
        : {}

      // Fotos que hay en el repositorio, por sección.
      const archivosPorSeccion: Record<string, string[]> = {}
      for (const seccion of Object.keys(mapaSecciones)) {
        const carpeta = await listarCarpeta(cfg, `public/catalogo/${seccion}`)
        archivosPorSeccion[seccion] = carpeta
          .filter((a) => a.type === 'file' && a.name.toLowerCase().endsWith('.webp'))
          .map((a) => a.name)
          .sort((a, b) => {
            const na = desglosarNombre(a)
            const nb = desglosarNombre(b)
            return na.pagina - nb.pagina || na.orden - nb.orden
          })
      }

      // Arma la lista de cada producto: primero el orden guardado en el panel
      // y después las fotos que todavía no estén en esa lista.
      const nueva: ListaPorProducto = {}
      const productos = new Set([
        ...Object.values(mapaSecciones),
        ...Object.keys(ordenGuardado),
      ])

      for (const nombre of productos) {
        const seccionesProducto = Object.entries(mapaSecciones)
          .filter(([, p]) => p === nombre)
          .map(([s]) => s)
        const entradas: EntradaFoto[] = []
        const vistas = new Set<string>()

        for (const item of ordenGuardado[nombre] ?? []) {
          const seccion = String(item?.seccion ?? '')
          const archivo = String(item?.foto ?? '')
          if (!seccion || !archivo) continue
          if (!archivosPorSeccion[seccion]?.includes(archivo)) continue
          entradas.push({
            seccion,
            foto: archivo,
            precio:
              String(item?.precio ?? '') ||
              precioPorDefecto(seccion, archivo, mapaPrecios, mapaSecciones),
          })
          vistas.add(`${seccion}/${archivo}`)
        }

        for (const seccion of seccionesProducto) {
          for (const archivo of archivosPorSeccion[seccion] ?? []) {
            if (vistas.has(`${seccion}/${archivo}`)) continue
            entradas.push({
              seccion,
              foto: archivo,
              precio: precioPorDefecto(seccion, archivo, mapaPrecios, mapaSecciones),
            })
            vistas.add(`${seccion}/${archivo}`)
          }
        }

        nueva[nombre] = entradas
      }

      setLista(nueva)
      const primero = Object.keys(mapaSecciones)[0]
      if (primero) setProducto((actual) => actual || mapaSecciones[primero])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  useEffect(() => {
    if (!seccionNueva && seccionesDelProducto.length > 0) {
      setSeccionNueva(seccionesDelProducto[0])
    }
  }, [seccionesDelProducto, seccionNueva])

  const fotos = lista[producto] ?? []

  const actualizar = (nuevaLista: ListaPorProducto) => setLista(nuevaLista)

  /** Cambia el precio de una foto. */
  const cambiarPrecio = (indice: number, precio: string) => {
    const copia = [...fotos]
    copia[indice] = { ...copia[indice], precio }
    actualizar({ ...lista, [producto]: copia })
  }

  /** Mueve una foto una posición arriba o abajo. */
  const mover = (indice: number, delta: number) => {
    const destino = indice + delta
    if (destino < 0 || destino >= fotos.length) return
    const copia = [...fotos]
    const [foto] = copia.splice(indice, 1)
    copia.splice(destino, 0, foto)
    actualizar({ ...lista, [producto]: copia })
  }

  /** Suelta una foto arrastrada en otra posición. */
  const soltar = (indice: number) => {
    if (arrastrando === null || arrastrando === indice) return
    const copia = [...fotos]
    const [foto] = copia.splice(arrastrando, 1)
    copia.splice(indice, 0, foto)
    actualizar({ ...lista, [producto]: copia })
    setArrastrando(null)
  }

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      // El precio propio solo se guarda cuando es distinto al general
      // (así los precios por página/sección siguen mandando en el resto).
      const contenido: Record<string, Array<{ seccion: string; foto: string; precio?: string }>> = {}
      for (const [nombre, entradas] of Object.entries(lista)) {
        contenido[nombre] = entradas.map((entrada) => {
          const general = precioPorDefecto(entrada.seccion, entrada.foto)
          if (entrada.precio && entrada.precio !== general) {
            return { seccion: entrada.seccion, foto: entrada.foto, precio: entrada.precio }
          }
          return { seccion: entrada.seccion, foto: entrada.foto }
        })
      }
      await guardarTexto(
        cfg,
        'contenido/fotos.json',
        `${JSON.stringify(contenido, null, 2)}\n`,
        'Actualizar orden y precios de las fotos desde el panel de Petite Princesse',
      )
      setMensaje('Fotos guardadas ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las fotos.')
    } finally {
      setGuardando(false)
    }
  }

  const reemplazar = async (entrada: EntradaFoto, archivo: File) => {
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const comprimida = await comprimirImagen(archivo)
      await subirArchivo(
        cfg,
        `public/catalogo/${entrada.seccion}/${entrada.foto}`,
        comprimida.base64,
        `Reemplazar foto ${entrada.foto} desde el panel de Petite Princesse`,
      )
      setMensaje(`Foto "${entrada.foto}" actualizada ✅`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reemplazar la foto.')
    } finally {
      setOcupado(false)
    }
  }

  const eliminar = async (entrada: EntradaFoto) => {
    if (!window.confirm(`¿Eliminar "${entrada.foto}"? El cambio se guarda de inmediato.`)) return
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const archivos = await listarCarpeta(cfg, `public/catalogo/${entrada.seccion}`)
      const existente = archivos.find((a) => a.name === entrada.foto)
      if (existente) {
        await borrarArchivo(
          cfg,
          `public/catalogo/${entrada.seccion}/${entrada.foto}`,
          existente.sha,
          `Eliminar foto ${entrada.foto} desde el panel de Petite Princesse`,
        )
      }
      setMensaje(`Foto "${entrada.foto}" eliminada ✕`)
      // La quitamos de la lista para que no vuelva a salir al recargar.
      const copia = (lista[producto] ?? []).filter(
        (f) => !(f.seccion === entrada.seccion && f.foto === entrada.foto),
      )
      actualizar({ ...lista, [producto]: copia })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la foto.')
    } finally {
      setOcupado(false)
    }
  }

  const agregar = async (archivo: File) => {
    if (!seccionNueva) return
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const pagina = paginaNueva.trim() || '40'
      const ordenInicial = Number(ordenNueva.trim() || '1') || 1
      // Nunca pisamos una foto que ya existe: buscamos un nombre libre.
      const existentes = (await listarCarpeta(cfg, `public/catalogo/${seccionNueva}`)).map(
        (a) => a.name,
      )
      let orden = ordenInicial
      let nombre = `${seccionNueva}-${pagina}-${orden}.webp`
      while (existentes.includes(nombre)) {
        orden += 1
        nombre = `${seccionNueva}-${pagina}-${orden}.webp`
      }
      const comprimida = await comprimirImagen(archivo)
      await subirArchivo(
        cfg,
        `public/catalogo/${seccionNueva}/${nombre}`,
        comprimida.base64,
        `Agregar foto ${nombre} desde el panel de Petite Princesse`,
      )
      const nuevaEntrada: EntradaFoto = {
        seccion: seccionNueva,
        foto: nombre,
        precio: precioPorDefecto(seccionNueva, nombre),
      }
      const copia = [...(lista[producto] ?? []), nuevaEntrada]
      actualizar({ ...lista, [producto]: copia })
      setOrdenNueva('')
      setMensaje(`Foto "${nombre}" subida ✅ (recuerda guardar los cambios)`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setOcupado(false)
    }
  }

  if (cargando) return <p className="admin-estado">Cargando fotos…</p>

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Fotos</h2>
        <button
          type="button"
          className="admin-boton admin-boton-primario"
          onClick={() => void guardar()}
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Aquí ves <strong>exactamente las fotos que salen en cada producto</strong>{' '}
        (en el mismo orden). Puedes <strong>cambiar el precio de cada foto</strong> y{' '}
        <strong>moverlas de lugar</strong> (arrastrando o con las flechas). Al
        terminar, aprieta <strong>Guardar cambios</strong>: se publica solo.
      </p>
      <p className="admin-ayuda">
        El precio que ves es el que va a salir. Si lo dejas igual al general, esa
        foto sigue el precio general de su página (pestaña «Precios»); si lo
        cambías, ese precio queda solo para esa foto. Tips: los pasteles
        (sweetcakes) se cotizan uno por uno; las artecookies dependen del tamaño
        (6&nbsp;cm $4.500 · 8&nbsp;cm $5.200 · 10&nbsp;cm $6.000).
      </p>

      <label className="admin-campo">
        Producto
        <select
          className="admin-entrada"
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
        >
          {Object.keys(PRODUCTOS_LABEL).map((id) => (
            <option key={id} value={id}>
              {PRODUCTOS_LABEL[id]} ({lista[id]?.length ?? 0} fotos)
            </option>
          ))}
        </select>
      </label>

      <div className="admin-rejilla-fotos">
        {fotos.map((entrada, indice) => {
          const { pagina, orden } = desglosarNombre(entrada.foto)
          return (
            <div
              className={`admin-foto${arrastrando === indice ? ' arrastrando' : ''}`}
              key={`${entrada.seccion}/${entrada.foto}`}
              draggable
              onDragStart={() => setArrastrando(indice)}
              onDragEnd={() => setArrastrando(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => soltar(indice)}
            >
              <span className="admin-foto-posicion">#{indice + 1}</span>
              <img
                src={`${urlCruda(cfg, `public/catalogo/${entrada.seccion}/${entrada.foto}`)}?v=${encodeURIComponent(entrada.foto)}`}
                alt={entrada.foto}
                loading="lazy"
              />
              <p className="admin-foto-nombre" title={entrada.foto}>
                {entrada.foto}
              </p>
              <p className="admin-foto-pagina">
                {SECCIONES_LABEL[entrada.seccion] ?? entrada.seccion} · pág.{' '}
                {pagina} · #{orden}
              </p>
              <div className="admin-foto-precio">
                <input
                  className="admin-entrada"
                  value={entrada.precio}
                  placeholder="Precio"
                  onDragStart={(e) => e.stopPropagation()}
                  onChange={(e) => cambiarPrecio(indice, e.target.value)}
                />
              </div>
              <div className="admin-foto-acciones">
                <button
                  type="button"
                  className="admin-boton admin-boton-chico"
                  onClick={() => mover(indice, -1)}
                  disabled={ocupado || indice === 0}
                  title="Subir una posición"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-boton admin-boton-chico"
                  onClick={() => mover(indice, 1)}
                  disabled={ocupado || indice === fotos.length - 1}
                  title="Bajar una posición"
                >
                  ↓
                </button>
                <label
                  className="admin-boton admin-boton-chico"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.currentTarget.querySelector('input')?.click()
                    }
                  }}
                >
                  Cambiar
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={ocupado}
                    onChange={(e) => {
                      const archivo = e.target.files?.[0]
                      e.target.value = ''
                      if (archivo) void reemplazar(entrada, archivo)
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="admin-boton admin-boton-rojo admin-boton-chico"
                  disabled={ocupado}
                  onClick={() => eliminar(entrada)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {fotos.length === 0 && (
        <p className="admin-estado">Este producto no tiene fotos todavía.</p>
      )}

      <section className="admin-bloque">
        <h3>Agregar foto nueva a {PRODUCTOS_LABEL[producto] ?? producto}</h3>
        <div className="admin-fila">
          <label className="admin-campo admin-en-linea">
            Sección
            <select
              className="admin-entrada"
              value={seccionNueva}
              onChange={(e) => setSeccionNueva(e.target.value)}
            >
              {seccionesDelProducto.map((id) => (
                <option key={id} value={id}>
                  {SECCIONES_LABEL[id] ?? id}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-campo admin-en-linea">
            Página
            <input
              className="admin-entrada"
              type="number"
              min={1}
              value={paginaNueva}
              onChange={(e) => setPaginaNueva(e.target.value)}
            />
          </label>
          <label className="admin-campo admin-en-linea">
            Posición (opcional)
            <input
              className="admin-entrada"
              type="number"
              min={1}
              value={ordenNueva}
              placeholder="1"
              onChange={(e) => setOrdenNueva(e.target.value)}
            />
          </label>
        </div>
        <label className="admin-boton" role="button" tabIndex={0}>
          {ocupado ? 'Subiendo…' : 'Subir foto'}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={ocupado}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              e.target.value = ''
              if (archivo) void agregar(archivo)
            }}
          />
        </label>
        <p className="admin-ayuda">
          El nombre sale solo: {seccionNueva || 'seccion'}-{paginaNueva || '40'}-
          {ordenNueva || '1'}.webp
        </p>
      </section>

      <div className="admin-panel-cabecera">
        <button
          type="button"
          className="admin-boton admin-boton-primario"
          onClick={() => void guardar()}
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
