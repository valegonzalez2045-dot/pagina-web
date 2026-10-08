import { useEffect, useState } from 'react'
import type { ConfigGitHub } from './github'
import { guardarTexto, leerTexto } from './github'
import { PRODUCTOS_LABEL } from './constantes'

interface ListaEditor {
  titulo: string
  opciones: string[]
}

interface InfoProducto {
  nota?: string
  mostrarPrecios?: boolean
  listas?: ListaEditor[]
}

type InfoGlobal = Record<string, InfoProducto>

export function PanelProductos({ cfg }: { cfg: ConfigGitHub }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [info, setInfo] = useState<InfoGlobal>({})

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const archivo = await leerTexto(cfg, 'contenido/info.json')
      if (!archivo) {
        setError('Aún no existe contenido/info.json en este repositorio.')
        return
      }
      setInfo(JSON.parse(archivo.texto) as InfoGlobal)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar los productos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [cfg])

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await guardarTexto(
        cfg,
        'contenido/info.json',
        JSON.stringify(info, null, 2),
        'Actualizar productos y sabores desde el panel de Petite Princesse',
      )
      setMensaje('Productos guardados ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar los productos.')
    } finally {
      setGuardando(false)
    }
  }

  const actualizar = (clave: string, parcial: Partial<InfoProducto>) => {
    setInfo((prev) => ({ ...prev, [clave]: { ...prev[clave], ...parcial } }))
  }

  const cambiarLista = (clave: string, indice: number, parcial: Partial<ListaEditor>) => {
    setInfo((prev) => {
      const producto = prev[clave] ?? {}
      const listas = [...(producto.listas ?? [])]
      listas[indice] = { ...listas[indice], ...parcial }
      return { ...prev, [clave]: { ...producto, listas } }
    })
  }

  const agregarLista = (clave: string) => {
    setInfo((prev) => {
      const producto = prev[clave] ?? {}
      const listas = [...(producto.listas ?? []), { titulo: '', opciones: [] }]
      return { ...prev, [clave]: { ...producto, listas } }
    })
  }

  const quitarLista = (clave: string, indice: number) => {
    setInfo((prev) => {
      const producto = prev[clave] ?? {}
      const listas = (producto.listas ?? []).filter((_, i) => i !== indice)
      return { ...prev, [clave]: { ...producto, listas } }
    })
  }

  const eliminarProducto = (clave: string) => {
    const copia = { ...info }
    delete copia[clave]
    setInfo(copia)
  }

  const agregarProducto = (clave: string) => {
    if (!clave.trim() || clave in info) return
    setInfo((prev) => ({ ...prev, [clave.trim()]: { mostrarPrecios: true } }))
  }

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
        Aquí editas el texto que se muestra al abrir cada producto (la nota de arriba, si
        muestra precio por foto, y las listas de sabores o rellenos).
      </p>

      {Object.entries(info).map(([clave, producto]) => (
        <section className="admin-bloque" key={clave}>
          <div className="admin-bloque-cabecera">
            <h3>{PRODUCTOS_LABEL[clave] ?? clave}</h3>
            <button
              type="button"
              className="admin-boton admin-boton-rojo admin-boton-chico"
              onClick={() => eliminarProducto(clave)}
              title="Quitar este producto"
            >
              Quitar
            </button>
          </div>

          <label className="admin-campo">
            Nota (texto de arriba en la ventana del producto)
            <textarea
              className="admin-entrada"
              rows={2}
              value={producto.nota ?? ''}
              placeholder="Ej: Cada pastel se cotiza según el diseño y el tamaño 🎂"
              onChange={(e) => actualizar(clave, { nota: e.target.value })}
            />
          </label>

          <label className="admin-casilla">
            <input
              type="checkbox"
              checked={producto.mostrarPrecios !== false}
              onChange={(e) => actualizar(clave, { mostrarPrecios: e.target.checked })}
            />
            Mostrar un precio debajo de cada foto
          </label>

          <div className="admin-sublista">
            <h4>Listas de opciones (sabores, rellenos…)</h4>
            {producto.listas?.map((lista, i) => (
              <div className="admin-lista" key={i}>
                <label className="admin-campo">
                  Título de la lista
                  <input
                    className="admin-entrada"
                    value={lista.titulo}
                    onChange={(e) => cambiarLista(clave, i, { titulo: e.target.value })}
                  />
                </label>
                <label className="admin-campo">
                  Opciones (una por línea)
                  <textarea
                    className="admin-entrada"
                    rows={6}
                    value={lista.opciones.join('\n')}
                    onChange={(e) =>
                      cambiarLista(clave, i, {
                        opciones: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="admin-boton admin-boton-rojo admin-boton-chico"
                  onClick={() => quitarLista(clave, i)}
                >
                  Quitar lista
                </button>
              </div>
            ))}
            <button type="button" className="admin-boton admin-boton-chico" onClick={() => agregarLista(clave)}>
              + Agregar lista
            </button>
          </div>
        </section>
      ))}

      <section className="admin-bloque">
        <h3>Agregar edición para otro producto</h3>
        <div className="admin-fila">
          <input className="admin-entrada admin-clave" list="admin-productos" placeholder="id del producto" id="nuevo-producto" />
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