import { useEffect, useState } from 'react'
import type { ConfigGitHub } from './github'
import {
  borrarArchivo,
  guardarTexto,
  leerTexto,
  listarCarpeta,
  subirArchivo,
  urlCruda,
} from './github'
import { comprimirImagen } from './compresor'
import { PRODUCTOS_LABEL } from './constantes'

interface ListaEditor {
  titulo: string
  opciones: string[]
}

interface InfoProducto {
  nota?: string
  notas?: string[]
  mostrarPrecios?: boolean
  listas?: ListaEditor[]
}

type InfoGlobal = Record<string, InfoProducto>

/** Imagen de portada elegida para una categoría de producto. */
interface Portada {
  archivo: string
  version: string
}

/** Todo lo editable de una categoría de producto. */
interface ProductoEditor {
  nombre: string
  descripcion: string
  fotos: string[]
  portada?: Portada
}

type ProductosEditor = Record<string, ProductoEditor>

const CARPETA_FOTOS = 'public/productos'

/** Solo se borran del repositorio las fotos subidas desde el panel. */
function esFotoDelPanel(id: string, src: string): boolean {
  if (!src.startsWith('/productos/')) return false
  const nombre = src.slice('/productos/'.length)
  const escapado = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escapado}-(\\d+|portada)\\.webp$`).test(nombre)
}

export function PanelProductos({ cfg }: { cfg: ConfigGitHub }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [info, setInfo] = useState<InfoGlobal>({})
  const [productos, setProductos] = useState<ProductosEditor>({})
  const [sucioInfo, setSucioInfo] = useState(false)
  const [sucioProductos, setSucioProductos] = useState(false)
  const [ocupado, setOcupado] = useState('')

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const archivo = await leerTexto(cfg, 'contenido/info.json')
      if (archivo) {
        setInfo(JSON.parse(archivo.texto) as InfoGlobal)
      }
      const archivoProductos = await leerTexto(cfg, 'contenido/productos.json')
      if (archivoProductos) {
        const crudo = JSON.parse(archivoProductos.texto) as Record<
          string,
          Partial<ProductoEditor>
        >
        const lista: ProductosEditor = {}
        for (const [id, cfgProducto] of Object.entries(crudo)) {
          lista[id] = {
            nombre: String(cfgProducto?.nombre ?? id),
            descripcion: String(cfgProducto?.descripcion ?? ''),
            fotos: Array.isArray(cfgProducto?.fotos)
              ? cfgProducto.fotos.map(String).filter(Boolean)
              : [],
            ...(cfgProducto?.portada?.archivo
              ? {
                  portada: {
                    archivo: String(cfgProducto.portada.archivo),
                    version: String(cfgProducto.portada.version ?? '1'),
                  },
                }
              : {}),
          }
        }
        setProductos(lista)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar los productos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [cfg])

  /* ---------- info.json (mensajes, precios y listas) ---------- */

  const persistirInfo = async () => {
    await guardarTexto(
      cfg,
      'contenido/info.json',
      JSON.stringify(info, null, 2),
      'Actualizar productos y sabores desde el panel de Petite Princesse',
    )
  }

  /* ---------- productos.json (nombre, texto, fotos y portada) ---------- */

  const persistirProductos = async (lista: ProductosEditor) => {
    await guardarTexto(
      cfg,
      'contenido/productos.json',
      `${JSON.stringify(lista, null, 2)}\n`,
      'Actualizar los productos desde el panel de Petite Princesse',
    )
  }

  const guardar = async () => {
    if (guardando) return
    if (!sucioInfo && !sucioProductos) {
      setMensaje('No hay cambios pendientes por guardar.')
      return
    }
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      if (sucioInfo) {
        await persistirInfo()
        setSucioInfo(false)
      }
      if (sucioProductos) {
        await persistirProductos(productos)
        setSucioProductos(false)
      }
      setMensaje('Cambios guardados ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar los productos.')
    } finally {
      setGuardando(false)
    }
  }

  const actualizar = (clave: string, parcial: Partial<InfoProducto>) => {
    setSucioInfo(true)
    setInfo((prev) => ({ ...prev, [clave]: { ...prev[clave], ...parcial } }))
  }

  /** Edita los mensajes (uno por línea) y migra el campo viejo "nota". */
  const cambiarNotas = (clave: string, valor: string) => {
    const notas = valor
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
    setSucioInfo(true)
    setInfo((prev) => {
      const producto = prev[clave] ?? {}
      const actualizado: InfoProducto = { ...producto, notas }
      delete actualizado.nota
      if (notas.length === 0) delete actualizado.notas
      return { ...prev, [clave]: actualizado }
    })
  }

  const cambiarLista = (clave: string, indice: number, parcial: Partial<ListaEditor>) => {
    setSucioInfo(true)
    setInfo((prev) => {
      const producto = prev[clave] ?? {}
      const listas = [...(producto.listas ?? [])]
      listas[indice] = { ...listas[indice], ...parcial }
      return { ...prev, [clave]: { ...producto, listas } }
    })
  }

  const agregarLista = (clave: string) => {
    setSucioInfo(true)
    setInfo((prev) => {
      const producto = prev[clave] ?? {}
      const listas = [...(producto.listas ?? []), { titulo: '', opciones: [] }]
      return { ...prev, [clave]: { ...producto, listas } }
    })
  }

  const quitarLista = (clave: string, indice: number) => {
    setSucioInfo(true)
    setInfo((prev) => {
      const producto = prev[clave] ?? {}
      const listas = (producto.listas ?? []).filter((_, i) => i !== indice)
      return { ...prev, [clave]: { ...producto, listas } }
    })
  }

  const eliminarProducto = (clave: string) => {
    setSucioInfo(true)
    const copia = { ...info }
    delete copia[clave]
    setInfo(copia)
  }

  const agregarProducto = (clave: string) => {
    if (!clave.trim() || clave in info) return
    setSucioInfo(true)
    setInfo((prev) => ({ ...prev, [clave.trim()]: { mostrarPrecios: true } }))
  }

  /* ---------- productos: textos ---------- */

  const cambiarProducto = (id: string, parcial: Partial<ProductoEditor>) => {
    setSucioProductos(true)
    setProductos((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        nombre: prev[id]?.nombre ?? PRODUCTOS_LABEL[id] ?? id,
        descripcion: prev[id]?.descripcion ?? '',
        fotos: prev[id]?.fotos ?? [],
        ...parcial,
      },
    }))
  }

  /* ---------- productos: portada ---------- */

  const subirPortada = async (id: string, archivo: File) => {
    setOcupado(id)
    setError('')
    setMensaje('')
    try {
      const { base64 } = await comprimirImagen(archivo, 1200, 0.85)
      await subirArchivo(
        cfg,
        `${CARPETA_FOTOS}/${id}-portada.webp`,
        base64,
        `Cambiar la imagen de portada de ${id} desde el panel`,
      )
      const copia: ProductosEditor = {
        ...productos,
        [id]: {
          ...(productos[id] ?? { nombre: id, descripcion: '', fotos: [] }),
          portada: {
            archivo: `/productos/${id}-portada.webp`,
            version: String(Date.now()),
          },
        },
      }
      setProductos(copia)
      setSucioProductos(false)
      await persistirProductos(copia)
      setMensaje(`Portada de ${PRODUCTOS_LABEL[id] ?? id} actualizada ✅`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la portada.')
    } finally {
      setOcupado('')
    }
  }

  /** Vuelve a mostrarse la primera foto del producto como portada. */
  const quitarPortada = async (id: string) => {
    setOcupado(id)
    setError('')
    setMensaje('')
    try {
      const actual = productos[id]
      if (!actual) return
      const copia: ProductosEditor = { ...productos }
      const siguiente: ProductoEditor = { ...actual }
      delete siguiente.portada
      copia[id] = siguiente
      setProductos(copia)
      setSucioProductos(false)
      await persistirProductos(copia)
      setMensaje(`Portada de ${PRODUCTOS_LABEL[id] ?? id} quitada`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la portada.')
    } finally {
      setOcupado('')
    }
  }

  /* ---------- productos: fotos ---------- */

  const subirFoto = async (id: string, archivo: File) => {
    setOcupado(id)
    setError('')
    setMensaje('')
    try {
      const { base64 } = await comprimirImagen(archivo, 1400, 0.85)
      const nombre = `${id}-${Date.now()}.webp`
      await subirArchivo(
        cfg,
        `${CARPETA_FOTOS}/${nombre}`,
        base64,
        `Subir foto de ${id} desde el panel de Petite Princesse`,
      )
      const actual = productos[id] ?? { nombre: id, descripcion: '', fotos: [] }
      const copia: ProductosEditor = {
        ...productos,
        [id]: { ...actual, fotos: [...actual.fotos, `/productos/${nombre}`] },
      }
      setProductos(copia)
      setSucioProductos(false)
      await persistirProductos(copia)
      setMensaje(`Foto de ${PRODUCTOS_LABEL[id] ?? id} subida ✅`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setOcupado('')
    }
  }

  const quitarFoto = async (id: string, src: string) => {
    if (!window.confirm('¿Quitar esta foto del producto?')) return
    setOcupado(id)
    setError('')
    setMensaje('')
    try {
      if (esFotoDelPanel(id, src)) {
        const nombre = src.slice('/productos/'.length)
        const archivos = await listarCarpeta(cfg, CARPETA_FOTOS)
        const existente = archivos.find((a) => a.name === nombre)
        if (existente) {
          await borrarArchivo(
            cfg,
            `${CARPETA_FOTOS}/${nombre}`,
            existente.sha,
            `Quitar foto de ${id} desde el panel de Petite Princesse`,
          )
        }
      }
      const actual = productos[id]
      if (!actual) return
      const copia: ProductosEditor = {
        ...productos,
        [id]: { ...actual, fotos: actual.fotos.filter((f) => f !== src) },
      }
      setProductos(copia)
      setSucioProductos(false)
      await persistirProductos(copia)
      setMensaje(`Foto de ${PRODUCTOS_LABEL[id] ?? id} quitada ✕`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la foto.')
    } finally {
      setOcupado('')
    }
  }

  const vista = (src: string) =>
    src.startsWith('http') ? src : `${urlCruda(cfg, `public${src}`)}?t=${Date.now()}`

  const ids = Array.from(
    new Set([...Object.keys(productos), ...Object.keys(info)]),
  ).sort((a, b) => {
    const ia = Object.keys(PRODUCTOS_LABEL).indexOf(a)
    const ib = Object.keys(PRODUCTOS_LABEL).indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  if (cargando) return <p className="admin-estado">Cargando productos…</p>

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Productos y sabores</h2>
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Aquí editas cada categoría de la página: su nombre, el texto que se abre al
        tocarla, la imagen grande de su tarjeta, sus fotos y los mensajes de arriba (si
        muestra precio por foto y las listas de sabores o rellenos).
      </p>

      {ids.map((id) => {
        const producto = productos[id] ?? {
          nombre: PRODUCTOS_LABEL[id] ?? id,
          descripcion: '',
          fotos: [],
        }
        const infoProducto = info[id] ?? {}
        return (
          <section className="admin-bloque" key={id}>
            <div className="admin-bloque-cabecera">
              <h3>{producto.nombre || PRODUCTOS_LABEL[id] || id}</h3>
              <button
                type="button"
                className="admin-boton admin-boton-rojo admin-boton-chico"
                onClick={() => eliminarProducto(id)}
                title="Quitar los mensajes de este producto"
              >
                Quitar mensajes
              </button>
            </div>

            <div className="admin-portada">
              {producto.portada ? (
                <img src={`${urlCruda(cfg, `public${producto.portada.archivo}`)}?v=${producto.portada.version}`} alt="Portada" />
              ) : (
                <div className="admin-foto-sin-imagen">Sin portada</div>
              )}
              <div className="admin-foto-acciones">
                <label
                  className="admin-boton admin-boton-chico"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      e.currentTarget.querySelector('input')?.click()
                  }}
                >
                  {ocupado === id ? 'Subiendo…' : 'Cambiar portada'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={ocupado === id}
                    onChange={(e) => {
                      const archivo = e.target.files?.[0]
                      e.target.value = ''
                      if (archivo) void subirPortada(id, archivo)
                    }}
                  />
                </label>
                {producto.portada && (
                  <button
                    type="button"
                    className="admin-boton admin-boton-rojo admin-boton-chico"
                    disabled={ocupado === id}
                    onClick={() => void quitarPortada(id)}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <label className="admin-campo">
              Nombre del producto
              <input
                className="admin-entrada"
                value={producto.nombre}
                placeholder={PRODUCTOS_LABEL[id] ?? id}
                onChange={(e) => cambiarProducto(id, { nombre: e.target.value })}
              />
            </label>

            <label className="admin-campo">
              Descripción (el texto largo que se abre al tocar el producto)
              <textarea
                className="admin-entrada"
                rows={4}
                value={producto.descripcion}
                placeholder="Ej: Galleta y chocolate en perfecta armonía…"
                onChange={(e) => cambiarProducto(id, { descripcion: e.target.value })}
              />
            </label>

            <div className="admin-sublista">
              <h4>Fotos del producto (se ven al abrirlo)</h4>
              <div className="admin-combo-fotos">
                {producto.fotos.map((src) => (
                  <div className="admin-combo-foto" key={src}>
                    <img src={vista(src)} alt={producto.nombre} className="admin-combo-foto-img" />
                    <button
                      type="button"
                      className="admin-boton admin-boton-rojo admin-boton-chico"
                      disabled={ocupado === id}
                      onClick={() => void quitarFoto(id, src)}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <label className="admin-boton admin-boton-chico" role="button" tabIndex={0}>
                  {ocupado === id ? 'Subiendo…' : '+ Subir foto'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={ocupado === id}
                    onChange={(e) => {
                      const archivo = e.target.files?.[0]
                      e.target.value = ''
                      if (archivo) void subirFoto(id, archivo)
                    }}
                  />
                </label>
              </div>
            </div>

            <label className="admin-campo">
              Mensajes (uno por línea, aparecen arriba en la ventana del producto)
              <textarea
                className="admin-entrada"
                rows={3}
                value={
                  (infoProducto.notas ?? (infoProducto.nota ? [infoProducto.nota] : [])).join('\n')
                }
                placeholder={`Ej: Cada pastel se cotiza según el diseño, sabor y tamaño 🎂
Ej: Estos son algunos de los diseños que hemos hecho 💕`}
                onChange={(e) => cambiarNotas(id, e.target.value)}
              />
            </label>

            <label className="admin-casilla">
              <input
                type="checkbox"
                checked={infoProducto.mostrarPrecios !== false}
                onChange={(e) => actualizar(id, { mostrarPrecios: e.target.checked })}
              />
              Mostrar un precio debajo de cada foto
            </label>

            <div className="admin-sublista">
              <h4>Listas de opciones (sabores, rellenos…)</h4>
              {infoProducto.listas?.map((lista, i) => (
                <div className="admin-lista" key={i}>
                  <label className="admin-campo">
                    Título de la lista
                    <input
                      className="admin-entrada"
                      value={lista.titulo}
                      onChange={(e) => cambiarLista(id, i, { titulo: e.target.value })}
                    />
                  </label>
                  <label className="admin-campo">
                    Opciones (una por línea)
                    <textarea
                      className="admin-entrada"
                      rows={6}
                      value={lista.opciones.join('\n')}
                      onChange={(e) =>
                        cambiarLista(id, i, {
                          opciones: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-boton admin-boton-rojo admin-boton-chico"
                    onClick={() => quitarLista(id, i)}
                  >
                    Quitar lista
                  </button>
                </div>
              ))}
              <button type="button" className="admin-boton admin-boton-chico" onClick={() => agregarLista(id)}>
                + Agregar lista
              </button>
            </div>
          </section>
        )
      })}

      <section className="admin-bloque">
        <h3>Agregar edición para otro producto</h3>
        <div className="admin-fila">
          <input
            className="admin-entrada admin-clave"
            list="admin-productos"
            placeholder="id del producto"
            id="nuevo-producto"
          />
          <button
            type="button"
            className="admin-boton"
            onClick={() => {
              const entrada = document.getElementById('nuevo-producto') as HTMLInputElement | null
              agregarProducto(entrada?.value ?? '')
              if (entrada) entrada.value = ''
            }}
          >
            Agregar
          </button>
        </div>
      </section>

      <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>

      <datalist id="admin-productos">
        {Object.entries(PRODUCTOS_LABEL).map(([id, etiqueta]) => (
          <option key={id} value={id}>
            {etiqueta}
          </option>
        ))}
      </datalist>
    </div>
  )
}
