import { useEffect, useMemo, useState } from 'react'
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
import { desglosarNombre, PRODUCTOS_LABEL } from './constantes'

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
  /** Secciones del catálogo agrupadas por producto (para tomar fotos de ahí). */
  const [secciones, setSecciones] = useState<Record<string, string>>({})
  const [productoElegido, setProductoElegido] = useState('')
  const [catalogo, setCatalogo] = useState<{ src: string; etiqueta: string }[]>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const [archivo, archivoSecciones] = await Promise.all([
        leerTexto(cfg, 'contenido/galeria.json'),
        leerTexto(cfg, 'contenido/secciones.json'),
      ])
      setSecciones(
        archivoSecciones
          ? (JSON.parse(archivoSecciones.texto) as Record<string, string>)
          : {},
      )
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

  /** Productos del catálogo, en el orden en que salen en la web. */
  const productos = useMemo(
    () => [...new Set(Object.values(secciones))],
    [secciones],
  )

  /** Al elegir un producto se cargan todas sus fotos para poder agregarlas. */
  const cargarCatalogo = async (producto: string) => {
    setProductoElegido(producto)
    setCatalogo([])
    if (!producto) return
    setCargandoCatalogo(true)
    try {
      const seccionesProducto = Object.entries(secciones)
        .filter(([, p]) => p === producto)
        .map(([s]) => s)
      const lista: { src: string; etiqueta: string }[] = []
      for (const seccion of seccionesProducto) {
        const archivos = await listarCarpeta(cfg, `public/catalogo/${seccion}`)
        const nombres = archivos
          .filter((a) => a.type === 'file' && a.name.toLowerCase().endsWith('.webp'))
          .map((a) => a.name)
          .sort((a, b) => {
            const na = desglosarNombre(a)
            const nb = desglosarNombre(b)
            return na.pagina - nb.pagina || na.orden - nb.orden
          })
        for (const nombre of nombres) {
          lista.push({
            src: `/catalogo/${seccion}/${nombre}`,
            etiqueta: PRODUCTOS_LABEL[producto] ?? producto,
          })
        }
      }
      setCatalogo(lista)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.')
    } finally {
      setCargandoCatalogo(false)
    }
  }

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

  /** Agrega una foto del catálogo a la sección (no borra el archivo original). */
  const agregarDelCatalogo = async (foto: { src: string; etiqueta: string }) => {
    if (fotos.some((f) => f.src === foto.src)) {
      setMensaje('Esa foto ya está en la sección 🙂')
      return
    }
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const nueva = [...fotos, { src: foto.src, etiqueta: foto.etiqueta }]
      setFotos(nueva)
      await persistir(nueva, 'Foto agregada ✅ Ahora le puedes escribir el nombre')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar la foto.')
    } finally {
      setGuardando(false)
    }
  }

  /** Sube o baja una foto de la lista. */
  const mover = async (indice: number, direccion: -1 | 1) => {
    const destino = indice + direccion
    if (destino < 0 || destino >= fotos.length) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const nueva = [...fotos]
      const [foto] = nueva.splice(indice, 1)
      nueva.splice(destino, 0, foto)
      setFotos(nueva)
      await persistir(nueva, 'Orden actualizado ✅')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el orden.')
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
        Estas son las fotos que salen en la sección «Lo más vendido» de la
        página. Sube las que quieras o tómalas del catálogo, escríbeles un
        nombre debajo (qué es cada una) y quita las que no te gusten — así
        cambias la cantidad de fotos cuando quieras. El título de la sección lo
        cambias en la pestaña «Títulos».
      </p>

      <div className="admin-rejilla-fotos">
        {fotos.map((foto, indice) => (
          <div className="admin-foto" key={`${foto.src}-${indice}`}>
            <img src={vista(foto.src)} alt={foto.etiqueta || 'Foto de la galería'} loading="lazy" />
            <input
              className="admin-entrada admin-entrada-chica"
              value={foto.etiqueta}
              placeholder="Qué es esta foto (ej: Chocomellows)"
              onChange={(e) => cambiar(indice, { etiqueta: e.target.value })}
            />
            <div className="admin-foto-acciones">
              <button
                type="button"
                className="admin-boton admin-boton-chico"
                disabled={guardando || indice === 0}
                onClick={() => void mover(indice, -1)}
                aria-label="Subir la foto"
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-boton admin-boton-chico"
                disabled={guardando || indice === fotos.length - 1}
                onClick={() => void mover(indice, 1)}
                aria-label="Bajar la foto"
              >
                ↓
              </button>
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

      <section className="admin-bloque">
        <div className="admin-bloque-cabecera">
          <h3>Tomar fotos del catálogo</h3>
        </div>
        <p className="admin-aviso">
          Elige un producto y toca la foto que quieras agregar a «Lo más
          vendido». Después le escribes su nombre para que sepa qué es.
        </p>

        <label className="admin-campo">
          Producto
          <select
            className="admin-entrada"
            value={productoElegido}
            onChange={(e) => void cargarCatalogo(e.target.value)}
          >
            <option value="">— elige un producto —</option>
            {productos.map((producto) => (
              <option key={producto} value={producto}>
                {PRODUCTOS_LABEL[producto] ?? producto}
              </option>
            ))}
          </select>
        </label>

        {cargandoCatalogo && <p className="admin-estado">Cargando fotos…</p>}

        {productoElegido && !cargandoCatalogo && catalogo.length === 0 && (
          <p className="admin-estado">Ese producto no tiene fotos todavía.</p>
        )}

        {catalogo.length > 0 && (
          <div className="admin-rejilla-fotos">
            {catalogo.map((foto) => (
              <button
                type="button"
                className="admin-foto admin-foto-banco"
                key={foto.src}
                disabled={guardando}
                onClick={() => void agregarDelCatalogo(foto)}
                title="Agregar a la sección"
              >
                <img src={vista(foto.src)} alt={foto.etiqueta} loading="lazy" />
                <span className="admin-foto-banco-texto">
                  {fotos.some((f) => f.src === foto.src) ? '✓ Agregada' : '+ Agregar'}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="admin-panel-cabecera">
        <button type="button" className="admin-boton admin-boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
