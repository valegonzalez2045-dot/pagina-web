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
  /** Foto que sale al lado del botón de la sección. */
  const [destacada, setDestacada] = useState('')
  /** Texto del botón que despliega los combos. */
  const [tituloBoton, setTituloBoton] = useState(
    'Encuentra el detalle perfecto para regalar',
  )
  /** Título de la tira de fotos que sale en la galería. */
  const [tituloTira, setTituloTira] = useState('Combos 🎁')

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
        destacada?: string
        tituloBoton?: string
        tituloTira?: string
      }
      setCombos((crudo.combos ?? []).map(normalizarCombo))
      const listaMuestra = Array.isArray(crudo.muestra)
        ? crudo.muestra.map(String).filter(Boolean)
        : []
      setMuestra(listaMuestra)
      setDestacada(String(crudo.destacada ?? '').trim() || listaMuestra[0] || '')
      setTituloBoton(
        String(crudo.tituloBoton ?? '').trim() ||
          'Encuentra el detalle perfecto para regalar',
      )
      setTituloTira(String(crudo.tituloTira ?? '').trim())
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
          {
            destacada: destacada || (fotosMuestra ?? muestra)[0] || '',
            tituloBoton:
              tituloBoton.trim() ||
              'Encuentra el detalle perfecto para regalar',
            tituloTira: tituloTira.trim(),
            muestra: fotosMuestra ?? muestra,
            combos: lista ?? combos,
          },
          null,
          2,
        ),
        'Actualizar combos desde el panel de Petite Princesse',
      )
      setMensaje('Combos guardados ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los combos.')
    } finally {
      setGuardando(false)
    }
  }

  /** Sube la foto principal que sale al lado del botón de la sección. */
  const subirDestacada = async (archivo: File) => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const comprimida = await comprimirImagen(archivo)
      const existentes = await listarCarpeta(cfg, 'public/combos')
      const numeros = existentes
        .map((a) => a.name.match(/^destacada-(\d+)\.webp$/)?.[1])
        .filter(Boolean)
        .map(Number)
      const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1
      const nombre = `destacada-${siguiente}.webp`
      await subirArchivo(
        cfg,
        `public/combos/${nombre}`,
        comprimida.base64,
        'Subir la imagen principal de combos desde el panel de Petite Princesse',
      )
      setDestacada(`${PREFIJO_FOTO}${nombre}`)
      setMensaje('Imagen principal subida ✅ (recuerda guardar los cambios)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    } finally {
      setGuardando(false)
    }
  }

  /** Quita la imagen principal (si no la usa nadie más, borra el archivo). */
  const quitarDestacada = async () => {
    if (!window.confirm('¿Quitar la imagen principal?')) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const nombre = destacada.replace(PREFIJO_FOTO, '')
      const usadaEnOtro =
        muestra.includes(destacada) ||
        combos.some((c) => c.fotos.includes(destacada))
      if (!usadaEnOtro && nombre) {
        const archivos = await listarCarpeta(cfg, 'public/combos')
        const existente = archivos.find((a) => a.name === nombre)
        if (existente) {
          await borrarArchivo(
            cfg,
            `public/combos/${nombre}`,
            existente.sha,
            'Quitar la imagen principal de combos desde el panel de Petite Princesse',
          )
        }
      }
      setDestacada('')
      setMensaje('Imagen principal quitada ✕')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la imagen.')
    } finally {
      setGuardando(false)
    }
  }

  /** Sube una foto para la tira de combos que sale en la galería. */
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
      // Solo se borra el archivo si ningún otro combo ni la tira lo usan.
      const usadaEnOtro =
        muestra.includes(src) ||
        combos.some((c) => c.id !== combo.id && c.fotos.includes(src))
      if (!usadaEnOtro) {
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

  /** Asigna (o quita) una foto de la tira de combos a un combo concreto. */
  const alternarFotoMuestra = async (combo: ComboEditor, src: string) => {
    const yaEsta = combo.fotos.includes(src)
    const nuevaLista = combos.map((c) =>
      c.id === combo.id
        ? {
            ...c,
            fotos: yaEsta
              ? c.fotos.filter((f) => f !== src)
              : [...c.fotos, src],
          }
        : c,
    )
    setCombos(nuevaLista)
    await guardar(nuevaLista)
    setMensaje(
      yaEsta
        ? `Foto quitada de "${combo.nombre}" ✕`
        : `Foto asignada a "${combo.nombre}" ✅`,
    )
  }

  /** Pone una foto como la principal del combo (la que se ve en la web). */
  const ponerPrincipal = async (combo: ComboEditor, src: string) => {
    const nuevaLista = combos.map((c) =>
      c.id === combo.id
        ? { ...c, fotos: [src, ...c.fotos.filter((f) => f !== src)] }
        : c,
    )
    setCombos(nuevaLista)
    await guardar(nuevaLista)
    setMensaje(`"${combo.nombre}" ahora muestra esa foto ⭐`)
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
          <h3>Botón e imagen principal</h3>
        </div>
        <p className="admin-aviso">
          Así se ve el combos en la página: el botón de la izquierda (con la foto
          al lado). Al tocarlo se despliegan todos los combos.
        </p>

        <label className="admin-campo">
          Texto del botón
          <input
            className="admin-entrada"
            value={tituloBoton}
            placeholder="Encuentra el detalle perfecto para regalar"
            onChange={(e) => setTituloBoton(e.target.value)}
          />
        </label>

        <div className="admin-combo-fotos">
          {destacada && (
            <div className="admin-combo-foto admin-combo-foto-destacada">
              <img
                src={`${urlCruda(cfg, `public/combos/${destacada.replace(PREFIJO_FOTO, '')}`)}?t=${Date.now()}`}
                alt="Imagen principal de combos"
                className="admin-combo-foto-img"
              />
              <span className="admin-combo-foto-ok">✓ Es la imagen principal</span>
              <button
                type="button"
                className="admin-boton admin-boton-rojo admin-boton-chico"
                onClick={() => void quitarDestacada()}
                disabled={guardando}
              >
                Quitar
              </button>
            </div>
          )}
          <label className="admin-boton admin-boton-chico" role="button" tabIndex={0}>
            {guardando ? 'Subiendo…' : 'Subir imagen principal'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={guardando}
              onChange={(e) => {
                const archivo = e.target.files?.[0]
                e.target.value = ''
                if (archivo) void subirDestacada(archivo)
              }}
            />
          </label>
        </div>

        {muestra.length > 0 && (
          <div className="admin-combo-banco">
            <p className="admin-aviso">
              ¿Quieres una de estas fotos como imagen principal? Tócala.
            </p>
            <div className="admin-combo-miniaturas">
              {muestra.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`admin-mini-foto${destacada === src ? ' activa' : ''}`}
                  onClick={() => setDestacada(src)}
                  title="Usar como imagen principal"
                  aria-pressed={destacada === src}
                >
                  <img
                    src={`${urlCruda(cfg, `public/combos/${src.replace(PREFIJO_FOTO, '')}`)}?t=${Date.now()}`}
                    alt=""
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="admin-bloque">
        <div className="admin-bloque-cabecera">
          <h3>Fotos de combos (tira de la galería)</h3>
        </div>
        <p className="admin-aviso">
          Estas fotos salen en la galería, en una tira horizontal que se desliza
          para verlas todas (se pueden ampliar al tocarlas). También son las
          fotos que puedes asignarle a cada combo más abajo.
        </p>

        <label className="admin-campo">
          Título de la tira
          <input
            className="admin-entrada"
            value={tituloTira}
            placeholder="Combos 🎁 (vacío = sin título)"
            onChange={(e) => setTituloTira(e.target.value)}
          />
        </label>

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
              {combo.fotos.map((src, indiceFoto) => (
                <div className="admin-combo-foto" key={src}>
                  <img
                    src={`${urlCruda(cfg, `public/combos/${src.replace(PREFIJO_FOTO, '')}`)}?t=${Date.now()}`}
                    alt={combo.nombre}
                    className="admin-combo-foto-img"
                  />
                  {indiceFoto === 0 ? (
                    <span className="admin-combo-foto-ok">✓ Foto principal</span>
                  ) : (
                    <button
                      type="button"
                      className="admin-boton admin-boton-chico"
                      onClick={() => void ponerPrincipal(combo, src)}
                      disabled={guardando}
                    >
                      ⭐ Usar como principal
                    </button>
                  )}
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

            {muestra.length > 0 && (
              <div className="admin-combo-banco">
                <p className="admin-aviso">
                  ¿Alguno de estos combos es el de este combo? Toca la foto y
                  queda asignada (tócala otra vez para quitarla).
                </p>
                <div className="admin-combo-miniaturas">
                  {muestra.map((src) => {
                    const asignada = combo.fotos.includes(src)
                    return (
                      <button
                        key={src}
                        type="button"
                        className={`admin-mini-foto${asignada ? ' activa' : ''}`}
                        onClick={() => void alternarFotoMuestra(combo, src)}
                        disabled={guardando}
                        title={
                          asignada
                            ? 'Quitar de este combo'
                            : 'Asignar a este combo'
                        }
                        aria-pressed={asignada}
                      >
                        <img
                          src={`${urlCruda(cfg, `public/combos/${src.replace(PREFIJO_FOTO, '')}`)}?t=${Date.now()}`}
                          alt=""
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
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