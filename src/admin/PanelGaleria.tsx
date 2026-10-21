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

interface FotoGaleriaEditor {
  /** Ruta de la foto dentro de public/ (ej: "/productos/chocomellowit.webp"). */
  src: string
  /** Texto que sale debajo de la foto y en la vista ampliada. */
  etiqueta: string
}

const CARPETA = 'public/galeria'
const PREFIJO = '/galeria/'

/** La foto es del subcarpeta de la galería: sí se puede borrar del repositorio. */
function esFotoPropia(src: string): boolean {
  return src.startsWith(PREFIJO)
}

export function PanelGaleria({ cfg }: { cfg: ConfigGitHub }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [fotos, setFotos] = useState<FotoGaleriaEditor[]>([])

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const archivo = await leerTexto(cfg, 'contenido/galeria.json')
      if (!archivo) {
        setFotos([])
        return
      }
      const crudo = JSON.parse(archivo.texto) as { fotos?: FotoGaleriaEditor[] }
      setFotos(
        (crudo.fotos ?? []).map((foto) => ({
          src: String(foto?.src ?? '').trim(),
          etiqueta: String(foto?.etiqueta ?? ''),
        })).filter((foto) => foto.src),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la galería.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [cfg])

  const persistir = async (lista: FotoGaleriaEditor[], aviso: string) => {
    await guardarTexto(
      cfg,
      'contenido/galeria.json',
      `${JSON.stringify({ fotos: lista }, null, 2)}\n`,
      'Actualizar la galería desde el panel de Petite Princesse',
    )
    setMensaje(aviso)
  }

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await persistir(fotos, 'Galería guardada ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la galería.')
    } finally {
      setGuardando(false)
    }
  }

  const cambiar = (indice: number, parcial: Partial<FotoGaleriaEditor>) => {
    setFotos((actual) =>
      actual.map((foto, i) => (i === indice ? { ...foto, ...parcial } : foto)),
    )
  }

  const subirFoto = async (archivo: File) => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const comprimida = await comprimirImagen(archivo, 1400, 0.85)
      const nombre = `g-${Date.now()}.webp`
      await subirArchivo(
        cfg,
        `${CARPETA}/${nombre}`,
        comprimida.base64,
        'Subir foto a la galería desde el panel de Petite Princesse',
      )
      const nueva = [...fotos, { src: `${PREFIJO}${nombre}`, etiqueta: '' }]
      setFotos(nueva)
      await persistir(nueva, 'Foto subida a la galería ✅')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setGuardando(false)
    }
  }

  const quitarFoto = async (indice: number) => {
    const foto = fotos[indice]
    if (!foto) return
    if (!window.confirm('¿Quitar esta foto de la galería?')) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      // Solo se borra del repositorio si la foto es de la galería.
      if (esFotoPropia(foto.src)) {
        const nombre = foto.src.slice(PREFIJO.length)
        const archivos = await listarCarpeta(cfg, CARPETA)
        const existente = archivos.find((a) => a.name === nombre)
        if (existente) {
          await borrarArchivo(
            cfg,
            `${CARPETA}/${nombre}`,
            existente.sha,
            'Quitar foto de la galería desde el panel de Petite Princesse',
          )
        }
      }
      const nueva = fotos.filter((_, i) => i !== indice)
      setFotos(nueva)
      await persistir(nueva, 'Foto quitada de la galería ✕')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la foto.')
    } finally {
      setGuardando(false)
    }
  }

  const vista = (src: string) =>
    src.startsWith('http') ? src : `${urlCruda(cfg, `public${src}`)}?t=${Date.now()}`

  if (cargando) return <p className="admin-estado">Cargando galería…</p>

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Galería</h2>
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Estas son las fotos que salen en la sección «Galería» de la página. Sube las que
        quieras, escríbeles un nombre debajo y quita las que no te gusten. El título de
        la sección lo cambias en la pestaña «Títulos».
      </p>

      <div className="admin-rejilla-fotos">
        {fotos.map((foto, indice) => (
          <div className="admin-foto" key={`${foto.src}-${indice}`}>
            <img src={vista(foto.src)} alt={foto.etiqueta || 'Foto de la galería'} loading="lazy" />
            <input
              className="admin-entrada admin-entrada-chica"
              value={foto.etiqueta}
              placeholder="Nombre de la foto (ej: Chocomellows)"
              onChange={(e) => cambiar(indice, { etiqueta: e.target.value })}
            />
            <div className="admin-foto-acciones">
              <button
                type="button"
                className="admin-boton admin-boton-rojo admin-boton-chico"
                disabled={guardando}
                onClick={() => void quitarFoto(indice)}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}

        <label className="admin-foto admin-foto-subir" role="button" tabIndex={0}>
          <span>{guardando ? 'Subiendo…' : '+ Subir foto'}</span>
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={guardando}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              e.target.value = ''
              if (archivo) void subirFoto(archivo)
            }}
          />
        </label>
      </div>

      <div className="admin-panel-cabecera">
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
