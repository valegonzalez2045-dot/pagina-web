import { useEffect, useState } from 'react'
import type { ConfigGitHub } from './github'
import { guardarTexto, leerTexto } from './github'

interface TituloEditor {
  subtitulo: string
  titulo: string
  /** Párrafo de la sección (solo Contacto). */
  texto?: string
  /** Nota de abajo de la sección (solo Contacto). */
  nota?: string
}

type TitulosEditor = Record<string, TituloEditor>

/** Las secciones de la página y cómo se llaman en el panel. */
const SECCIONES: { id: string; etiqueta: string; ayuda: string }[] = [
  {
    id: 'inicio',
    etiqueta: 'Inicio (la portada)',
    ayuda: 'El título grande de la página. Si lo escribes en dos renglones, se muestran así.',
  },
  { id: 'productos', etiqueta: 'Productos', ayuda: 'El texto chiquito y el título de la sección de productos.' },
  { id: 'combos', etiqueta: 'Combos', ayuda: 'El texto chiquito y el título de la sección de combos.' },
  { id: 'mayoreo', etiqueta: 'Mayoreo', ayuda: 'El texto chiquito y el título de la sección de mayoreo.' },
  { id: 'nosotros', etiqueta: 'Nosotros', ayuda: 'El texto chiquito y el título de la sección "Nosotros".' },
  { id: 'galeria', etiqueta: 'Galería', ayuda: 'El texto chiquito y el título de la sección de galería.' },
  { id: 'contacto', etiqueta: 'Contacto', ayuda: 'El texto chiquito, el título, el párrafo y la nota de abajo de la sección de contacto.' },
]

export function PanelTextos({ cfg }: { cfg: ConfigGitHub }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [titulos, setTitulos] = useState<TitulosEditor>({})

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const archivo = await leerTexto(cfg, 'contenido/titulos.json')
      if (archivo) {
        const crudo = JSON.parse(archivo.texto) as TitulosEditor
        setTitulos(
          Object.fromEntries(
            Object.entries(crudo).map(([id, t]) => [
              id,
              {
                subtitulo: String(t?.subtitulo ?? ''),
                titulo: String(t?.titulo ?? ''),
                texto: String(t?.texto ?? ''),
                nota: String(t?.nota ?? ''),
              },
            ]),
          ),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los títulos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [cfg])

  const cambiar = (id: string, parcial: Partial<TituloEditor>) => {
    setTitulos((actual) => ({
      ...actual,
      [id]: {
        ...actual[id],
        subtitulo: actual[id]?.subtitulo ?? '',
        titulo: actual[id]?.titulo ?? '',
        texto: actual[id]?.texto ?? '',
        nota: actual[id]?.nota ?? '',
        ...parcial,
      },
    }))
  }

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      // Solo se guardan los textos extra de la sección de contacto.
      const salida: Record<string, Record<string, string>> = {}
      for (const [id, valor] of Object.entries(titulos)) {
        const item: Record<string, string> = {
          subtitulo: valor?.subtitulo ?? '',
          titulo: valor?.titulo ?? '',
        }
        if (id === 'contacto') {
          if ((valor?.texto ?? '').trim()) item.texto = valor.texto ?? ''
          if ((valor?.nota ?? '').trim()) item.nota = valor.nota ?? ''
        }
        salida[id] = item
      }

      await guardarTexto(
        cfg,
        'contenido/titulos.json',
        `${JSON.stringify(salida, null, 2)}\n`,
        'Actualizar los títulos de la página desde el panel de Petite Princesse',
      )
      const vacios = SECCIONES.filter(
        (seccion) => !(titulos[seccion.id]?.titulo ?? '').trim(),
      )
      if (vacios.length > 0) {
        setMensaje(
          `Títulos guardados ✅ Ojo: dejaste sin título ${vacios.map((s) => s.etiqueta).join(', ')}.`,
        )
      } else {
        setMensaje('Títulos guardados ✅ La web se actualiza sola en un par de minutos.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los títulos.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="admin-estado">Cargando títulos…</p>

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Títulos de las secciones</h2>
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        Aquí cambias el letrero de cada sección de la página: el texto chiquito de arriba
        y el título grande. Puedes dejar cualquiera de los dos vacío si no lo quieres.
      </p>

      {SECCIONES.map((seccion) => {
        const valor = titulos[seccion.id] ?? { subtitulo: '', titulo: '' }
        return (
          <section className="admin-bloque" key={seccion.id}>
            <h3>{seccion.etiqueta}</h3>
            <p className="admin-ayuda">{seccion.ayuda}</p>

            {seccion.id !== 'inicio' && (
              <label className="admin-campo">
                Texto chiquito (el de arriba)
                <input
                  className="admin-entrada"
                  value={valor.subtitulo}
                  placeholder="Ej: ELIGE TU ANTOJO"
                  onChange={(e) => cambiar(seccion.id, { subtitulo: e.target.value })}
                />
              </label>
            )}

            <label className="admin-campo">
              Título grande
              {seccion.id === 'inicio' ? (
                <textarea
                  className="admin-entrada"
                  rows={2}
                  value={valor.titulo}
                  placeholder={'DULCERÍA ARTESANAL\nHECHA CON AMOR'}
                  onChange={(e) => cambiar(seccion.id, { titulo: e.target.value })}
                />
              ) : (
                <input
                  className="admin-entrada"
                  value={valor.titulo}
                  placeholder="Ej: Nuestros productos"
                  onChange={(e) => cambiar(seccion.id, { titulo: e.target.value })}
                />
              )}
            </label>

            {seccion.id === 'contacto' && (
              <>
                <label className="admin-campo">
                  El párrafo de la sección
                  <textarea
                    className="admin-entrada"
                    rows={2}
                    value={valor.texto ?? ''}
                    placeholder="Escríbenos y arma tu pedido o pide tu cotización hoy mismo."
                    onChange={(e) => cambiar(seccion.id, { texto: e.target.value })}
                  />
                </label>

                <label className="admin-campo">
                  La nota de abajo
                  <input
                    className="admin-entrada"
                    value={valor.nota ?? ''}
                    placeholder="🚚 Domicilios locales y envíos nacionales."
                    onChange={(e) => cambiar(seccion.id, { nota: e.target.value })}
                  />
                </label>
              </>
            )}
          </section>
        )
      })}

      <div className="admin-panel-cabecera">
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
