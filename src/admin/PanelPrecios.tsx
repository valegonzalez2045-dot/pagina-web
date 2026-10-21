import { useEffect, useState } from 'react'
import type { ConfigGitHub } from './github'
import { guardarTexto, leerTexto } from './github'
import { PRODUCTOS_LABEL, SECCIONES_LABEL } from './constantes'

type Mapa = Record<string, string>

interface DatosPrecios {
  porArchivo: Mapa
  porPagina: Mapa
  porSeccion: Mapa
  porProducto: Mapa
}

const DATOS_VACIOS: DatosPrecios = {
  porArchivo: {},
  porPagina: {},
  porSeccion: {},
  porProducto: {},
}

function EditorMapa({
  titulo,
  ayuda,
  ejemploClave,
  valor,
  onChange,
  idSugerencias,
}: {
  titulo: string
  ayuda: string
  ejemploClave: string
  valor: Mapa
  onChange: (v: Mapa) => void
  idSugerencias?: string
}) {
  const cambiarClave = (vieja: string, nueva: string) => {
    if (vieja === nueva) return
    const copia: Mapa = {}
    for (const [clave, precio] of Object.entries(valor)) {
      copia[clave === vieja ? nueva : clave] = precio
    }
    onChange(copia)
  }

  const cambiarValor = (clave: string, nuevo: string) => {
    onChange({ ...valor, [clave]: nuevo })
  }

  const eliminar = (clave: string) => {
    const copia: Mapa = { ...valor }
    delete copia[clave]
    onChange(copia)
  }

  const agregar = () => {
    let base = 'nuevo'
    let i = 0
    while (`${base}-${i}` in valor) i++
    onChange({ ...valor, [`${base}-${i}`]: '' })
  }

  return (
    <section className="admin-bloque">
      <h3>{titulo}</h3>
      <p className="admin-ayuda">{ayuda}</p>
      <div className="admin-filas">
        {Object.entries(valor).map(([clave, precio]) => (
          <div className="admin-fila" key={clave}>
            <input
              className="admin-entrada admin-clave"
              value={clave}
              placeholder={ejemploClave}
              list={idSugerencias}
              onChange={(e) => cambiarClave(clave, e.target.value)}
            />
            <input
              className="admin-entrada"
              value={precio}
              placeholder="$0.000"
              onChange={(e) => cambiarValor(clave, e.target.value)}
            />
            <button
              type="button"
              className="admin-boton admin-boton-rojo"
              onClick={() => eliminar(clave)}
              aria-label="Quitar"
              title="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="admin-boton" onClick={agregar}>
        + Agregar
      </button>
    </section>
  )
}

export function PanelPrecios({ cfg }: { cfg: ConfigGitHub }) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [datos, setDatos] = useState<DatosPrecios>(DATOS_VACIOS)

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const archivo = await leerTexto(cfg, 'contenido/precios.json')
      if (!archivo) {
        setError('Aún no existe contenido/precios.json en este repositorio.')
        return
      }
      const crudo = JSON.parse(archivo.texto) as Partial<DatosPrecios>
      setDatos({
        porArchivo: crudo.porArchivo ?? {},
        porPagina: crudo.porPagina ?? {},
        porSeccion: crudo.porSeccion ?? {},
        porProducto: crudo.porProducto ?? {},
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar los precios.')
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
        'contenido/precios.json',
        JSON.stringify(datos, null, 2),
        'Actualizar precios desde el panel de Petite Princesse',
      )
      setMensaje('Precios guardados ✅ La web se actualiza sola en un par de minutos.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar los precios.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="admin-estado">Cargando precios…</p>

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Precios</h2>
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}

      <p className="admin-aviso">
        El precio de cada foto se toma con esta prioridad:{' '}
        <strong>el que le pongas a esa foto en la pestaña «Fotos»</strong> &gt;{' '}
        <strong>por página</strong> &gt; <strong>por sección</strong> &gt;{' '}
        <strong>por producto</strong>. Si dejas vacío un cuadro, esa foto mostrará
        «Precio por confirmar».
      </p>
      <p className="admin-ayuda">
        Lo de esta pestaña son los <strong>precios generales</strong> (por página,
        sección o producto). El precio de <strong>cada foto</strong> se edita en la
        pestaña <strong>«Fotos»</strong>, donde también puedes moverlas de lugar.
      </p>

      <EditorMapa
        titulo="Precio por página (chocolatinas por figura)"
        ayuda="Todas las fotos de esa página quedan con este precio. Ejemplo: si las páginas 4 a 8 valen $4.000, escribe una fila por cada página (4, 5, 6, 7 y 8) con $4.000."
        ejemploClave="página (ej. 12)"
        valor={datos.porPagina}
        onChange={(v) => setDatos((d) => ({ ...d, porPagina: v }))}
      />

      <EditorMapa
        titulo="Precio por sección"
        ayuda="Vale para todas las fotos de una sección. Ejemplo: Chocomellows sencillos, Cakepops, Cookies, Cookie Fusion."
        ejemploClave="sección"
        idSugerencias="sugerencias-secciones"
        valor={datos.porSeccion}
        onChange={(v) => setDatos((d) => ({ ...d, porSeccion: v }))}
      />

      <EditorMapa
        titulo="Precio por producto"
        ayuda="Vale para todas las fotos del producto. En general no lo vas a necesitar mientras uses precios por página o por sección."
        ejemploClave="producto"
        idSugerencias="sugerencias-productos"
        valor={datos.porProducto}
        onChange={(v) => setDatos((d) => ({ ...d, porProducto: v }))}
      />

      <EditorMapa
        titulo="Precio de una foto en especial"
        ayuda='Solo para casos puntuales. La clave es "sección/nombre-de-la-foto" sin la terminación .webp. Ejemplo: fresas-con-crema/fresas-con-crema-41-1 → $5.000 · 5 onz.'
        ejemploClave="seccion/foto (ej. fresas-con-crema/fresas-con-crema-41-1)"
        valor={datos.porArchivo}
        onChange={(v) => setDatos((d) => ({ ...d, porArchivo: v }))}
      />

      <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>

      <datalist id="sugerencias-secciones">
        {Object.entries(SECCIONES_LABEL).map(([id, etiqueta]) => (
          <option key={id} value={id}>
            {etiqueta}
          </option>
        ))}
      </datalist>
      <datalist id="sugerencias-productos">
        {Object.entries(PRODUCTOS_LABEL).map(([id, etiqueta]) => (
          <option key={id} value={id}>
            {etiqueta}
          </option>
        ))}
      </datalist>
    </div>
  )
}