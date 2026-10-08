import { useEffect, useMemo, useState } from 'react'
import type { ArchivoRemoto, ConfigGitHub } from './github'
import { borrarArchivo, leerTexto, listarCarpeta, subirArchivo, urlCruda } from './github'
import { comprimirImagen } from './compresor'
import { desglosarNombre, PRODUCTOS_LABEL, SECCIONES_LABEL } from './constantes'

export function PanelFotos({ cfg }: { cfg: ConfigGitHub }) {
  const [secciones, setSecciones] = useState<Record<string, string>>({})
  const [seccion, setSeccion] = useState('')
  const [fotos, setFotos] = useState<ArchivoRemoto[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // agregar foto nueva
  const [paginaNueva, setPaginaNueva] = useState('40')
  const [ordenNueva, setOrdenNueva] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const archivo = await leerTexto(cfg, 'contenido/secciones.json')
        const mapa = archivo ? (JSON.parse(archivo.texto) as Record<string, string>) : {}
        setSecciones(mapa)
        const primera = Object.keys(mapa)[0]
        if (primera) setSeccion(primera)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar las secciones.')
      }
    })()
  }, [cfg])

  const cargarFotos = async (seccionActual: string) => {
    if (!seccionActual) return
    setCargando(true)
    setError('')
    try {
      const lista = await listarCarpeta(cfg, `public/catalogo/${seccionActual}`)
      const webp = lista
        .filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.webp'))
        .sort((a, b) => {
          const na = desglosarNombre(a.name)
          const nb = desglosarNombre(b.name)
          return na.pagina - nb.pagina || na.orden - nb.orden
        })
      setFotos(webp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar las fotos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarFotos(seccion)
  }, [cfg, seccion])

  const paginaDelSelect = Number(paginaNueva) || 0
  const siguienteOrden = useMemo(() => {
    const usados = fotos
      .filter((f) => desglosarNombre(f.name).pagina === paginaDelSelect)
      .map((f) => desglosarNombre(f.name).orden)
    return (usados.length ? Math.max(...usados) : 0) + 1
  }, [fotos, paginaDelSelect])

  const reemplazar = async (foto: ArchivoRemoto, archivo: File) => {
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const comprimida = await comprimirImagen(archivo)
      await subirArchivo(
        cfg,
        `public/catalogo/${seccion}/${foto.name}`,
        comprimida.base64,
        `Reemplazar foto ${foto.name} desde el panel de Petite Princesse`,
      )
      setMensaje(`Foto "${foto.name}" actualizada ✅`)
      await cargarFotos(seccion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reemplazar la foto.')
    } finally {
      setOcupado(false)
    }
  }

  const agregar = async (archivo: File) => {
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const pagina = paginaNueva.trim() || '40'
      const orden = ordenNueva.trim() || String(siguienteOrden)
      const nombre = `${seccion}-${pagina}-${orden}.webp`
      const comprimida = await comprimirImagen(archivo)
      await subirArchivo(
        cfg,
        `public/catalogo/${seccion}/${nombre}`,
        comprimida.base64,
        `Agregar foto ${nombre} desde el panel de Petite Princesse`,
      )
      setMensaje(`Foto "${nombre}" subida ✅`)
      setOrdenNueva('')
      await cargarFotos(seccion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setOcupado(false)
    }
  }

  const eliminar = async (foto: ArchivoRemoto) => {
    if (!window.confirm(`¿Eliminar "${foto.name}"? El cambio se guarda de inmediato.`)) return
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      await borrarArchivo(
        cfg,
        `public/catalogo/${seccion}/${foto.name}`,
        foto.sha,
        `Eliminar foto ${foto.name} desde el panel de Petite Princesse`,
      )
      setMensaje(`Foto "${foto.name}" eliminada ✕`)
      await cargarFotos(seccion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la foto.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Fotos</h2>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Elige una sección para ver sus fotos. Para <strong>reemplazar</strong> una foto,
        sube la nueva (se mantiene el nombre, la posición y el precio). Para{' '}
        <strong>agregar</strong> una foto nueva, indica la página a la que pertenece y una
        posición. Las fotos se optimizan solas antes de subirse.
      </p>

      <label className="admin-campo">
        Sección
        <select className="admin-entrada" value={seccion} onChange={(e) => setSeccion(e.target.value)}>
          {Object.keys(secciones).map((id) => (
            <option key={id} value={id}>
              {SECCIONES_LABEL[id] ?? id} → {PRODUCTOS_LABEL[secciones[id]] ?? secciones[id]}
            </option>
          ))}
        </select>
      </label>

      {cargando ? (
        <p className="admin-estado">Cargando fotos…</p>
      ) : (
        <>
          <div className="admin-rejilla-fotos">
            {fotos.map((foto) => {
              const datos = desglosarNombre(foto.name)
              return (
                <div className="admin-foto" key={foto.sha}>
                  <img
                    src={`${urlCruda(cfg, `public/catalogo/${seccion}/${foto.name}`)}?v=${foto.sha.slice(0, 7)}`}
                    alt={foto.name}
                    loading="lazy"
                  />
                  <p className="admin-foto-nombre" title={foto.name}>
                    {foto.name}
                  </p>
                  <p className="admin-foto-pagina">
                    Página {datos.pagina} · #{datos.orden}
                  </p>
                  <div className="admin-foto-acciones">
                    <label
                      className="admin-boton admin-boton-chico"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') e.currentTarget.querySelector('input')?.click()
                      }}
                    >
                      Reemplazar
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        disabled={ocupado}
                        onChange={(e) => {
                          const archivo = e.target.files?.[0]
                          e.target.value = ''
                          if (archivo) void reemplazar(foto, archivo)
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-boton admin-boton-rojo admin-boton-chico"
                      disabled={ocupado}
                      onClick={() => eliminar(foto)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {fotos.length === 0 && <p className="admin-estado">Esta sección no tiene fotos todavía.</p>}

          <section className="admin-bloque">
            <h3>Agregar foto nueva a {SECCIONES_LABEL[seccion] ?? seccion}</h3>
            <div className="admin-fila">
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
                  placeholder={`auto: ${siguienteOrden}`}
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
              El nombre sale solo: {seccion}-{paginaNueva || '40'}-{ordenNueva || siguienteOrden}.webp
            </p>
          </section>
        </>
      )}
    </div>
  )
}