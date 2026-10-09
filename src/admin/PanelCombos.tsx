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

interface ComboEditor {
  id: string
  nombre: string
  descripcion: string
  precio: string
  foto: string
}

const PREFIJO_FOTO = '/combos/'

function comboVacio(indice: number): ComboEditor {
  return {
    id: `combo-${indice + 1}`,
    nombre: `Combo ${indice + 1}`,
    descripcion: '',
    precio: '',
    foto: '',
  }
}

export function PanelCombos({ cfg }: { cfg: ConfigGitHub }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [combos, setCombos] = useState<ComboEditor[]>([])

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const archivo = await leerTexto(cfg, 'contenido/combos.json')
      if (!archivo) {
        setError('Aún no existe contenido/combos.json en este repositorio.')
        setCombos([])
        return
      }
      const crudo = JSON.parse(archivo.texto) as { combos?: ComboEditor[] }
      setCombos(crudo.combos ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar los combos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [cfg])

  const cambiar = (id: string, parcial: Partial<ComboEditor>) => {
    setCombos((actual) =>
      actual.map((c) => (c.id === id ? { ...c, ...parcial } : c)),
    )
  }

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await guardarTexto(
        cfg,
        'contenido/combos.json',
        JSON.stringify({ combos }, null, 2),
        'Actualizar combos desde el panel de Petite Princesse',
      )
      setMensaje('Combos guardados ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar los combos.')
    } finally {
      setGuardando(false)
    }
  }

  const subirFoto = async (combo: ComboEditor, archivo: File) => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const comprimida = await comprimirImagen(archivo)
      await subirArchivo(
        cfg,
        `public/combos/${combo.id}.webp`,
        comprimida.base64,
        `Subir foto del combo ${combo.id} desde el panel de Petite Princesse`,
      )
      cambiar(combo.id, { foto: `${PREFIJO_FOTO}${combo.id}.webp` })
      await guardar()
      setMensaje(`Foto del combo "${combo.nombre}" subida ✅`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setGuardando(false)
    }
  }

  const quitarFoto = async (combo: ComboEditor) => {
    if (!window.confirm(`¿Quitar la foto de "${combo.nombre}"?`)) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const archivos = await listarCarpeta(cfg, 'public/combos')
      const existente = archivos.find((a) => a.name === `${combo.id}.webp`)
      if (existente) {
        await borrarArchivo(
          cfg,
          `public/combos/${combo.id}.webp`,
          existente.sha,
          `Quitar foto del combo ${combo.id} desde el panel de Petite Princesse`,
        )
      }
      cambiar(combo.id, { foto: '' })
      await guardar()
      setMensaje(`Foto del combo "${combo.nombre}" quitada ✕`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la foto.')
    } finally {
      setGuardando(false)
    }
  }

  const agregarCombo = () => {
    const siguiente = combos.length + 1
    setCombos((actual) => [...actual, comboVacio(siguiente)])
  }

  const quitarCombo = (id: string) => {
    if (!window.confirm('¿Quitar este combo de la lista?')) return
    setCombos((actual) => actual.filter((c) => c.id !== id))
  }

  if (cargando) return <p className="admin-estado">Cargando combos…</p>

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Combos</h2>
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Aquí llenas cada combo: nombre, descripción breve, precio (ej. «$12.000»;
        déjalo vacío si se cotiza) y su foto. Todo se guarda en{' '}
        <code>contenido/combos.json</code> y las fotos en{' '}
        <code>public/combos/</code>.
      </p>

      <div className="admin-lista">
        {combos.map((combo, indice) => (
          <section className="admin-bloque" key={combo.id}>
            <div className="admin-bloque-cabecera">
              <h3>{combo.nombre || `Combo ${indice + 1}`}</h3>
              <button
                type="button"
                className="admin-boton admin-boton-rojo admin-boton-chico"
                onClick={() => quitarCombo(combo.id)}
                title="Quitar este combo"
              >
                Quitar
              </button>
            </div>

            <div className="admin-fila">
              <label className="admin-campo admin-en-linea">
                Nombre
                <input
                  className="admin-entrada"
                  value={combo.nombre}
                  placeholder="Ej: Combo San Valentín"
                  onChange={(e) => cambiar(combo.id, { nombre: e.target.value })}
                />
              </label>
              <label className="admin-campo admin-en-linea">
                Precio
                <input
                  className="admin-entrada"
                  value={combo.precio}
                  placeholder="$12.000 (vacío = por confirmar)"
                  onChange={(e) => cambiar(combo.id, { precio: e.target.value })}
                />
              </label>
            </div>

            <label className="admin-campo">
              Descripción breve
              <input
                className="admin-entrada"
                value={combo.descripcion}
                placeholder="Ej: Galletas surtidas + chocolates y un detalle para regalar"
                onChange={(e) => cambiar(combo.id, { descripcion: e.target.value })}
              />
            </label>

            <div className="admin-combo-foto">
              {combo.foto ? (
                <>
                  <img
                    src={`${urlCruda(cfg, `public/combos/${combo.id}.webp`)}?t=${Date.now()}`}
                    alt={combo.nombre}
                    className="admin-combo-foto-img"
                  />
                  <button
                    type="button"
                    className="admin-boton admin-boton-rojo admin-boton-chico"
                    onClick={() => quitarFoto(combo)}
                    disabled={guardando}
                  >
                    Quitar foto
                  </button>
                </>
              ) : (
                <label className="admin-boton admin-boton-chico" role="button" tabIndex={0}>
                  {guardando ? 'Subiendo…' : 'Subir foto'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={guardando}
                    onChange={(e) => {
                      const archivo = e.target.files?.[0]
                      e.target.value = ''
                      if (archivo) void subirFoto(combo, archivo)
                    }}
                  />
                </label>
              )}
            </div>
          </section>
        ))}
      </div>

      <button type="button" className="admin-boton" onClick={agregarCombo}>
        + Agregar combo
      </button>

      <div className="admin-panel-cabecera">
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}