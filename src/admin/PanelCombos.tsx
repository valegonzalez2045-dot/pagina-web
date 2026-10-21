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
  /** Emoji que sale en la tarjeta mientras el combo no tiene fotos. */
  emoji: string
  descripcion: string
  precio: string
  /** Rutas de las fotos (pueden ser varias por combo). */
  fotos: string[]
}

const PREFIJO_FOTO = '/combos/'

function comboVacio(indice: number): ComboEditor {
  return {
    id: `combo-${indice + 1}`,
    nombre: `Combo ${indice + 1}`,
    emoji: '🎁',
    descripcion: '',
    precio: '',
    fotos: [],
  }
}

/** Acepta listas viejas con `foto` suelto (string) y las migra a `fotos`. */
function normalizarCombo(c: Partial<ComboEditor & { foto?: string }>, indice: number): ComboEditor {
  const fotosRaw = Array.isArray(c.fotos) ? c.fotos : []
  const fotos = fotosRaw.map(String).filter(Boolean)
  const fotoUnica = String(c.foto ?? '').trim()
  if (fotos.length === 0 && fotoUnica) fotos.push(fotoUnica)
  return {
    id: String(c.id ?? `combo-${indice + 1}`),
    nombre: String(c.nombre ?? `Combo ${indice + 1}`),
    emoji: String(c.emoji ?? '🎁'),
    descripcion: String(c.descripcion ?? ''),
    precio: String(c.precio ?? ''),
    fotos,
  }
}

export function PanelCombos({ cfg }: { cfg: ConfigGitHub }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [combos, setCombos] = useState<ComboEditor[]>([])
  const [muestra, setMuestra] = useState<string[]>([])

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
      const crudo = JSON.parse(archivo.texto) as {
        combos?: Array<Partial<ComboEditor & { foto?: string }>>
        muestra?: string[]
      }
      setCombos((crudo.combos ?? []).map(normalizarCombo))
      setMuestra(
        Array.isArray(crudo.muestra)
          ? crudo.muestra.map(String).filter(Boolean)
          : [],
      )
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

  const guardar = async (lista?: ComboEditor[], fotosMuestra?: string[]) => {
    if (guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      await guardarTexto(
        cfg,
        'contenido/combos.json',
        JSON.stringify(
          { muestra: fotosMuestra ?? muestra, combos: lista ?? combos },
          null,
          2,
        ),
        'Actualizar combos desde el panel de Petite Princesse',
      )
      setMensaje('Combos guardados ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar los combos.')
    } finally {
      setGuardando(false)
    }
  }

  /** Sube una foto para la tira de combos que sale arriba de la sección. */
  const subirMuestra = async (archivo: File) => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const comprimida = await comprimirImagen(archivo)
      const existentes = await listarCarpeta(cfg, 'public/combos')
      const numeros = existentes
        .map((a) => a.name.match(/^muestra-(\d+)\.webp$/)?.[1])
        .filter(Boolean)
        .map(Number)
      const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1
      const nombre = `muestra-${siguiente}.webp`
      await subirArchivo(
        cfg,
        `public/combos/${nombre}`,
        comprimida.base64,
        'Subir foto de la tira de combos desde el panel de Petite Princesse',
      )
      const nuevaMuestra = [...muestra, `${PREFIJO_FOTO}${nombre}`]
      setMuestra(nuevaMuestra)
      await guardar(undefined, nuevaMuestra)
      setMensaje('Foto de la tira de combos subida ✅')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setGuardando(false)
    }
  }

  /** Quita una foto de la tira de combos (y la borra del repositorio). */
  const quitarMuestra = async (src: string) => {
    if (!window.confirm('¿Quitar esta foto de la tira de combos?')) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const nombre = src.replace(PREFIJO_FOTO, '')
      const archivos = await listarCarpeta(cfg, 'public/combos')
      const existente = archivos.find((a) => a.name === nombre)
      if (existente) {
        await borrarArchivo(
          cfg,
          `public/combos/${nombre}`,
          existente.sha,
          'Quitar foto de la tira de combos desde el panel de Petite Princesse',
        )
      }
      const nuevaMuestra = muestra.filter((f) => f !== src)
      setMuestra(nuevaMuestra)
      await guardar(undefined, nuevaMuestra)
      setMensaje('Foto quitada ✕')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la foto.')
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
      const siguiente = combo.fotos.length + 1
      const nombre = `${combo.id}-${siguiente}.webp`
      await subirArchivo(
        cfg,
        `public/combos/${nombre}`,
        comprimida.base64,
        `Subir foto del combo ${combo.id} desde el panel de Petite Princesse`,
      )
      const nuevaLista = combos.map((c) =>
        c.id === combo.id ? { ...c, fotos: [...c.fotos, `${PREFIJO_FOTO}${nombre}`] } : c,
      )
      setCombos(nuevaLista)
      await guardar(nuevaLista)
      setMensaje(`Foto del combo "${combo.nombre}" subida ✅`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setGuardando(false)
    }
  }

  const quitarFoto = async (combo: ComboEditor, src: string) => {
    if (!window.confirm(`¿Quitar esta foto de "${combo.nombre}"?`)) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const nombre = src.replace(PREFIJO_FOTO, '')
      const archivos = await listarCarpeta(cfg, 'public/combos')
      const existente = archivos.find((a) => a.name === nombre)
      if (existente) {
        await borrarArchivo(
          cfg,
          `public/combos/${nombre}`,
          existente.sha,
          `Quitar foto del combo ${combo.id} desde el panel de Petite Princesse`,
        )
      }
      const nuevaLista = combos.map((c) =>
        c.id === combo.id ? { ...c, fotos: c.fotos.filter((f) => f !== src) } : c,
      )
      setCombos(nuevaLista)
      await guardar(nuevaLista)
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
        <button type="button" className="admin-boton admin-boton-primario" onClick={() => void guardar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Aquí llenas cada combo: nombre, descripción (lo que incluye), precio
        (ej. «$12.000»; déjalo vacío si se cotiza) y una o más fotos. Todo se
        guarda en <code>contenido/combos.json</code> y las fotos en{' '}
        <code>public/combos/</code>.
      </p>

      <section className="admin-bloque">
        <div className="admin-bloque-cabecera">
          <h3>Tira de fotos de combos</h3>
        </div>
        <p className="admin-aviso">
          Son las fotos que salen en la parte de arriba de la sección Combos
          (se pueden ampliar al tocarlas).
        </p>
        <div className="admin-combo-fotos">
          {muestra.map((src) => (
            <div className="admin-combo-foto" key={src}>
              <img
                src={`${urlCruda(cfg, `public/combos/${src.replace(PREFIJO_FOTO, '')}`)}?t=${Date.now()}`}
                alt="Foto de la tira de combos"
                className="admin-combo-foto-img"
              />
              <button
                type="button"
                className="admin-boton admin-boton-rojo admin-boton-chico"
                onClick={() => void quitarMuestra(src)}
                disabled={guardando}
              >
                Quitar foto
              </button>
            </div>
          ))}
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
                if (archivo) void subirMuestra(archivo)
              }}
            />
          </label>
        </div>
      </section>

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
                Emoji
                <input
                  className="admin-entrada admin-entrada-emoji"
                  value={combo.emoji}
                  placeholder="🎁"
                  maxLength={4}
                  onChange={(e) => cambiar(combo.id, { emoji: e.target.value })}
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
              Descripción (lo que incluye el combo)
              <input
                className="admin-entrada"
                value={combo.descripcion}
                placeholder="Ej: Galletas surtidas + chocolates y un detalle para regalar"
                onChange={(e) => cambiar(combo.id, { descripcion: e.target.value })}
              />
            </label>

            <div className="admin-combo-fotos">
              {combo.fotos.map((src) => (
                <div className="admin-combo-foto" key={src}>
                  <img
                    src={`${urlCruda(cfg, `public/combos/${src.replace(PREFIJO_FOTO, '')}`)}?t=${Date.now()}`}
                    alt={combo.nombre}
                    className="admin-combo-foto-img"
                  />
                  <button
                    type="button"
                    className="admin-boton admin-boton-rojo admin-boton-chico"
                    onClick={() => quitarFoto(combo, src)}
                    disabled={guardando}
                  >
                    Quitar foto
                  </button>
                </div>
              ))}
              <label className="admin-boton admin-boton-chico" role="button" tabIndex={0}>
                {guardando
                  ? 'Subiendo…'
                  : combo.fotos.length > 0
                    ? 'Subir otra foto'
                    : 'Subir foto'}
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
            </div>
          </section>
        ))}
      </div>

      <button type="button" className="admin-boton" onClick={agregarCombo}>
        + Agregar combo
      </button>

      <div className="admin-panel-cabecera">
        <button type="button" className="admin-boton admin-boton-primario" onClick={() => void guardar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}