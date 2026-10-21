import { useEffect, useState } from 'react'
import type { ConfigGitHub } from './github'
import { guardarTexto, leerTexto, subirArchivo, urlCruda } from './github'
import { comprimirImagen } from './compresor'

const RUTA_JSON = 'contenido/logo.json'
const RUTA_IMAGEN = 'public/logo-marca.webp'

interface DatosLogo {
  activo: boolean
  archivo: string
  alt: string
  version: string
}

const DATOS_INICIALES: DatosLogo = {
  activo: true,
  archivo: 'logo-marca.webp',
  alt: 'PETITE PRINCESSE',
  version: '1',
}

export function PanelLogo({ cfg }: { cfg: ConfigGitHub }) {
  const [datos, setDatos] = useState<DatosLogo>(DATOS_INICIALES)
  const [alt, setAlt] = useState(DATOS_INICIALES.alt)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    try {
      const archivo = await leerTexto(cfg, RUTA_JSON)
      if (archivo) {
        const leido = JSON.parse(archivo.texto) as Partial<DatosLogo>
        const nuevo: DatosLogo = {
          activo: leido.activo !== false,
          archivo: leido.archivo || DATOS_INICIALES.archivo,
          alt: leido.alt || DATOS_INICIALES.alt,
          version: leido.version || DATOS_INICIALES.version,
        }
        setDatos(nuevo)
        setAlt(nuevo.alt)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el logo.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  const guardarDatos = async (nuevos: DatosLogo, mensajeCommit: string) => {
    await guardarTexto(
      cfg,
      RUTA_JSON,
      `${JSON.stringify(nuevos, null, 2)}\n`,
      mensajeCommit,
    )
    setDatos(nuevos)
    setAlt(nuevos.alt)
  }

  const subir = async (archivo: File) => {
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const { base64 } = await comprimirImagen(archivo, 900, 0.9)
      await subirArchivo(
        cfg,
        RUTA_IMAGEN,
        base64,
        'Actualizar el logo de Petite Princesse',
      )
      const nuevos: DatosLogo = {
        ...datos,
        activo: true,
        archivo: 'logo-marca.webp',
        version: String(Date.now()),
      }
      await guardarDatos(nuevos, 'Actualizar el logo de Petite Princesse')
      setMensaje('Logo actualizado ✅ La página lo muestra en 1–2 minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el logo.')
    } finally {
      setOcupado(false)
    }
  }

  const guardarTextoAlt = async () => {
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      await guardarDatos({ ...datos, alt: alt.trim() || datos.alt }, 'Cambiar el texto del logo')
      setMensaje('Texto guardado ✅')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el texto.')
    } finally {
      setOcupado(false)
    }
  }

  const cambiarEstado = async (activo: boolean) => {
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      await guardarDatos(
        { ...datos, activo, version: String(Date.now()) },
        activo ? 'Mostrar el logo de Petite Princesse' : 'Quitar el logo de Petite Princesse',
      )
      setMensaje(activo ? 'Logo visible en la página ✅' : 'Logo quitado de la página ✕')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el logo.')
    } finally {
      setOcupado(false)
    }
  }

  const vista = `${urlCruda(cfg, RUTA_IMAGEN)}?v=${datos.version}`

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Logo de la marca</h2>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Este logo se muestra en la parte superior de la portada, para que todo el que
        entre a la página sepa de inmediato que es <strong>Petite Princesse</strong>. Si lo
        cambias, la página se actualiza sola en 1–2 minutos.
      </p>

      {cargando ? (
        <p className="admin-estado">Cargando logo…</p>
      ) : (
        <>
          <div className="admin-logo-vista">
            <img src={vista} alt={datos.alt} />
          </div>

          <p className="admin-estado">
            {datos.activo
              ? 'Estado: visible en la portada ✅'
              : 'Estado: oculto en la portada ✕'}
          </p>

          <section className="admin-bloque">
            <h3>Cambiar la imagen del logo</h3>
            <p className="admin-ayuda">
              Sube el archivo (PNG o JPG). Se optimiza y comprime solo antes de subirlo, así
              la página siempre carga rápido.
            </p>
            <label className="admin-boton admin-boton-primario" role="button" tabIndex={0}>
              {ocupado ? 'Subiendo…' : 'Subir / reemplazar logo'}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={ocupado}
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  e.target.value = ''
                  if (archivo) void subir(archivo)
                }}
              />
            </label>
          </section>

          <section className="admin-bloque">
            <h3>Texto alternativo (para lectores de pantalla)</h3>
            <label className="admin-campo">
              Texto
              <input
                className="admin-entrada"
                value={alt}
                placeholder="PETITE PRINCESSE"
                onChange={(e) => setAlt(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="admin-boton"
              disabled={ocupado}
              onClick={() => void guardarTextoAlt()}
            >
              Guardar texto
            </button>
          </section>

          <section className="admin-bloque">
            <h3>Mostrar u ocultar</h3>
            {datos.activo ? (
              <button
                type="button"
                className="admin-boton admin-boton-rojo"
                disabled={ocupado}
                onClick={() => void cambiarEstado(false)}
              >
                Quitar el logo de la portada
              </button>
            ) : (
              <button
                type="button"
                className="admin-boton admin-boton-primario"
                disabled={ocupado}
                onClick={() => void cambiarEstado(true)}
              >
                Volver a mostrar el logo
              </button>
            )}
          </section>
        </>
      )}
    </div>
  )
}
