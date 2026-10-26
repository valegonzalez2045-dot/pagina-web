import { useEffect, useMemo, useState } from 'react'
import type { ConfigGitHub } from './github'
import { bytesABase64, guardarLote, leerTexto, listarCarpeta, urlCruda } from './github'
import { comprimirImagen } from './compresor'
import { desglosarNombre, PRODUCTOS_LABEL, SECCIONES_LABEL } from './constantes'

/** Una foto del catálogo: a qué sección pertenece, cómo se llama y su precio. */
interface EntradaFoto {
  seccion: string
  foto: string
  precio: string
  /** Imagen nueva (data URL) que se sube recién al apretar «Guardar cambios». */
  nueva?: string
}

type ListaPorProducto = Record<string, EntradaFoto[]>

interface MapaPrecios {
  porArchivo: Record<string, string>
  porSeccion: Record<string, string>
  porProducto: Record<string, string>
}

const ORDEN_VACIO: ListaPorProducto = {}
const PRECIOS_VACIOS: MapaPrecios = {
  porArchivo: {},
  porSeccion: {},
  porProducto: {},
}

/** Las fotos de un producto se muestran en este orden. */
export function PanelFotos({ cfg }: { cfg: ConfigGitHub }) {
  const [secciones, setSecciones] = useState<Record<string, string>>({})
  const [producto, setProducto] = useState('')
  const [lista, setLista] = useState<ListaPorProducto>(ORDEN_VACIO)
  const [precios, setPrecios] = useState<MapaPrecios>(PRECIOS_VACIOS)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  /** Precio que se puede aplicar de una vez a todas las fotos del producto. */
  const [precioMasivo, setPrecioMasivo] = useState('')
  /** Cómo estaba la lista al cargar (para saber qué fotos se borraron). */
  const [original, setOriginal] = useState<ListaPorProducto>({})
  /** sha de cada archivo en GitHub (para que la miniatura no salga en caché vieja). */
  const [shas, setShas] = useState<Record<string, string>>({})

  // Para agregar foto nueva
  const [seccionNueva, setSeccionNueva] = useState('')
  const [paginaNueva, setPaginaNueva] = useState('40')
  const [ordenNueva, setOrdenNueva] = useState('')

  /** Secciones que pertenecen al producto elegido. */
  const seccionesDelProducto = useMemo(
    () => Object.entries(secciones).filter(([, p]) => p === producto).map(([s]) => s),
    [secciones, producto],
  )

  /** Precio que se le pone a una foto nueva (el de su sección, si lo hay). */
  const precioPorDefecto = (
    seccion: string,
    archivo: string,
    mapa: MapaPrecios = precios,
    mapaSecciones: Record<string, string> = secciones,
  ) => {
    const base = archivo.replace(/\.webp$/i, '')
    return (
      mapa.porArchivo[`${seccion}/${base}`] ??
      mapa.porSeccion[seccion] ??
      mapa.porProducto[mapaSecciones[seccion]] ??
      ''
    )
  }

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const [archivoSecciones, archivoFotos, archivoPrecios] = await Promise.all([
        leerTexto(cfg, 'contenido/secciones.json'),
        leerTexto(cfg, 'contenido/fotos.json'),
        leerTexto(cfg, 'contenido/precios.json'),
      ])

      const mapaSecciones = archivoSecciones
        ? (JSON.parse(archivoSecciones.texto) as Record<string, string>)
        : {}
      setSecciones(mapaSecciones)

      const crudo = archivoPrecios
        ? (JSON.parse(archivoPrecios.texto) as Partial<MapaPrecios>)
        : {}
      const mapaPrecios: MapaPrecios = {
        porArchivo: crudo.porArchivo ?? {},
        porSeccion: crudo.porSeccion ?? {},
        porProducto: crudo.porProducto ?? {},
      }
      setPrecios(mapaPrecios)

      const ordenGuardado = archivoFotos
        ? (JSON.parse(archivoFotos.texto) as ListaPorProducto)
        : {}

      // Fotos que hay en el repositorio, por sección.
      const archivosPorSeccion: Record<string, string[]> = {}
      const shasNuevos: Record<string, string> = {}
      for (const seccion of Object.keys(mapaSecciones)) {
        const carpeta = await listarCarpeta(cfg, `public/catalogo/${seccion}`)
        for (const archivo of carpeta) {
          if (archivo.type === 'file') {
            shasNuevos[`${seccion}/${archivo.name}`] = archivo.sha
          }
        }
        archivosPorSeccion[seccion] = carpeta
          .filter((a) => a.type === 'file' && a.name.toLowerCase().endsWith('.webp'))
          .map((a) => a.name)
          .sort((a, b) => {
            const na = desglosarNombre(a)
            const nb = desglosarNombre(b)
            return na.pagina - nb.pagina || na.orden - nb.orden
          })
      }

      // Arma la lista de cada producto: primero el orden guardado en el panel
      // y después las fotos que todavía no estén en esa lista.
      const nueva: ListaPorProducto = {}
      const productos = new Set([
        ...Object.values(mapaSecciones),
        ...Object.keys(ordenGuardado),
      ])

      for (const nombre of productos) {
        const seccionesProducto = Object.entries(mapaSecciones)
          .filter(([, p]) => p === nombre)
          .map(([s]) => s)
        const entradas: EntradaFoto[] = []
        const vistas = new Set<string>()

        for (const item of ordenGuardado[nombre] ?? []) {
          const seccion = String(item?.seccion ?? '')
          const archivo = String(item?.foto ?? '')
          if (!seccion || !archivo) continue
          if (!archivosPorSeccion[seccion]?.includes(archivo)) continue
          entradas.push({
            seccion,
            foto: archivo,
            precio:
              String(item?.precio ?? '') ||
              precioPorDefecto(seccion, archivo, mapaPrecios, mapaSecciones),
          })
          vistas.add(`${seccion}/${archivo}`)
        }

        for (const seccion of seccionesProducto) {
          for (const archivo of archivosPorSeccion[seccion] ?? []) {
            if (vistas.has(`${seccion}/${archivo}`)) continue
            entradas.push({
              seccion,
              foto: archivo,
              precio: precioPorDefecto(seccion, archivo, mapaPrecios, mapaSecciones),
            })
            vistas.add(`${seccion}/${archivo}`)
          }
        }

        nueva[nombre] = entradas
      }

      setShas(shasNuevos)
      setLista(nueva)
      setOriginal(nueva)
      const primero = Object.keys(mapaSecciones)[0]
      if (primero) setProducto((actual) => actual || mapaSecciones[primero])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  useEffect(() => {
    if (!seccionNueva && seccionesDelProducto.length > 0) {
      setSeccionNueva(seccionesDelProducto[0])
    }
  }, [seccionesDelProducto, seccionNueva])

  const fotos = lista[producto] ?? []

  /** Cuántos cambios hay sin publicar (fotos cambiadas/agregadas o borradas). */
  const cambiosPendientes = (() => {
    const enLista = new Set(
      Object.values(lista)
        .flat()
        .map((entrada) => `${entrada.seccion}/${entrada.foto}`),
    )
    const borradas = Object.values(original)
      .flat()
      .filter((entrada) => !enLista.has(`${entrada.seccion}/${entrada.foto}`)).length
    const nuevas = Object.values(lista)
      .flat()
      .filter((entrada) => entrada.nueva).length
    return borradas + nuevas
  })()

  const actualizar = (nuevaLista: ListaPorProducto) => setLista(nuevaLista)

  /** Cambia el precio de una foto. */
  const cambiarPrecio = (indice: number, precio: string) => {
    const copia = [...fotos]
    copia[indice] = { ...copia[indice], precio }
    actualizar({ ...lista, [producto]: copia })
  }

  /** Pone el mismo precio a todas las fotos del producto elegido. */
  const aplicarPrecioATodas = () => {
    const valor = precioMasivo.trim()
    if (!valor || fotos.length === 0) return
    const nombreProducto = PRODUCTOS_LABEL[producto] ?? producto
    if (
      !window.confirm(
        `¿Poner "${valor}" a las ${fotos.length} fotos de ${nombreProducto}?`,
      )
    ) {
      return
    }
    actualizar({
      ...lista,
      [producto]: fotos.map((foto) => ({ ...foto, precio: valor })),
    })
    setPrecioMasivo('')
    setMensaje(
      'Precio aplicado a todas las fotos de este producto ✅ Recuerda apretar «Guardar cambios».',
    )
  }

  /** Mueve una foto una posición arriba o abajo. */
  const mover = (indice: number, delta: number) => {
    const destino = indice + delta
    if (destino < 0 || destino >= fotos.length) return
    const copia = [...fotos]
    const [foto] = copia.splice(indice, 1)
    copia.splice(destino, 0, foto)
    actualizar({ ...lista, [producto]: copia })
  }

  /** Suelta una foto arrastrada en otra posición. */
  const soltar = (indice: number) => {
    if (arrastrando === null || arrastrando === indice) return
    const copia = [...fotos]
    const [foto] = copia.splice(arrastrando, 1)
    copia.splice(indice, 0, foto)
    actualizar({ ...lista, [producto]: copia })
    setArrastrando(null)
  }

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      // Cada foto guarda SU precio (ya no hay precios por página ni generales
      // que manden por encima de lo que se ve aquí).
      const contenido: Record<string, Array<{ seccion: string; foto: string; precio: string }>> = {}
      const archivos: Array<{ ruta: string; base64: string }> = []
      for (const [nombre, entradas] of Object.entries(lista)) {
        contenido[nombre] = entradas.map((entrada) => ({
          seccion: entrada.seccion,
          foto: entrada.foto,
          precio: entrada.precio,
        }))
        for (const entrada of entradas) {
          if (!entrada.nueva) continue
          archivos.push({
            ruta: `public/catalogo/${entrada.seccion}/${entrada.foto}`,
            base64: entrada.nueva.split(',')[1] ?? '',
          })
        }
      }

      archivos.push({
        ruta: 'contenido/fotos.json',
        base64: bytesABase64(
          new TextEncoder().encode(`${JSON.stringify(contenido, null, 2)}\n`),
        ),
      })

      // Fotos que estaban antes y ya no están en la lista → se borran.
      const enLista = new Set(
        Object.values(lista)
          .flat()
          .map((entrada) => `${entrada.seccion}/${entrada.foto}`),
      )
      const borrados: string[] = []
      for (const entrada of Object.values(original).flat()) {
        if (!enLista.has(`${entrada.seccion}/${entrada.foto}`)) {
          borrados.push(`public/catalogo/${entrada.seccion}/${entrada.foto}`)
        }
      }

      // TODO en un solo commit = una sola compilación de la web.
      await guardarLote(
        cfg,
        archivos,
        borrados,
        'Actualizar fotos y precios desde el panel de Petite Princesse',
      )

      const cambiadas = archivos.length - 1
      const detalle = [
        cambiadas > 0 ? `${cambiadas} foto(s) nueva(s) o cambiada(s)` : '',
        borrados.length > 0 ? `${borrados.length} borrada(s)` : '',
      ]
        .filter(Boolean)
        .join(' y ')

      setMensaje(
        `Guardado ✅ ${detalle ? `(${detalle}). ` : ''}La web se actualiza sola en un par de minutos.`,
      )
      await cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las fotos.')
    } finally {
      setGuardando(false)
    }
  }

  const reemplazar = async (entrada: EntradaFoto, archivo: File) => {
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const comprimida = await comprimirImagen(archivo)
      const copia = (lista[producto] ?? []).map((foto) =>
        foto.seccion === entrada.seccion && foto.foto === entrada.foto
          ? { ...foto, nueva: `data:image/webp;base64,${comprimida.base64}` }
          : foto,
      )
      actualizar({ ...lista, [producto]: copia })
      setMensaje(
        'Foto cambiada ✅ Aprieta «Guardar cambios» para publicarla (así no se gasta una compilación por foto).',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar la foto.')
    } finally {
      setOcupado(false)
    }
  }

  /** Descarta la foto nueva y deja la que está publicada. */
  const deshacerCambio = (entrada: EntradaFoto) => {
    const copia = (lista[producto] ?? []).map((foto) =>
      foto.seccion === entrada.seccion && foto.foto === entrada.foto
        ? { ...foto, nueva: undefined }
        : foto,
    )
    actualizar({ ...lista, [producto]: copia })
  }

  const eliminar = (entrada: EntradaFoto) => {
    if (
      !window.confirm(
        `¿Quitar "${entrada.foto}" de la lista? Se borra de la web cuando aprietes «Guardar cambios».`,
      )
    ) {
      return
    }
    const copia = (lista[producto] ?? []).filter(
      (f) => !(f.seccion === entrada.seccion && f.foto === entrada.foto),
    )
    actualizar({ ...lista, [producto]: copia })
    setMensaje('Foto quitada de la lista ✅ Aprieta «Guardar cambios» para publicarlo.')
  }

  const agregar = async (archivo: File) => {
    if (!seccionNueva) return
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const pagina = paginaNueva.trim() || '40'
      const ordenInicial = Number(ordenNueva.trim() || '1') || 1
      // Nunca pisamos una foto que ya existe: buscamos un nombre libre.
      const existentes = Object.keys(shas)
        .filter((clave) => clave.startsWith(`${seccionNueva}/`))
        .map((clave) => clave.slice(seccionNueva.length + 1))
      let orden = ordenInicial
      let nombre = `${seccionNueva}-${pagina}-${orden}.webp`
      while (existentes.includes(nombre)) {
        orden += 1
        nombre = `${seccionNueva}-${pagina}-${orden}.webp`
      }
      const comprimida = await comprimirImagen(archivo)
      const nuevaEntrada: EntradaFoto = {
        seccion: seccionNueva,
        foto: nombre,
        precio: precioPorDefecto(seccionNueva, nombre),
        nueva: `data:image/webp;base64,${comprimida.base64}`,
      }
      const copia = [...(lista[producto] ?? []), nuevaEntrada]
      actualizar({ ...lista, [producto]: copia })
      setOrdenNueva('')
      setMensaje(
        `Foto "${nombre}" lista ✅ Aprieta «Guardar cambios» para publicarla.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setOcupado(false)
    }
  }

  if (cargando) return <p className="admin-estado">Cargando fotos…</p>

  return (
    <div className="admin-panel">
      <div className="admin-panel-cabecera">
        <h2>Fotos</h2>
        <button
          type="button"
          className="admin-boton admin-boton-primario"
          onClick={() => void guardar()}
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {mensaje && <p className="admin-ok">{mensaje}</p>}
      {cambiosPendientes > 0 && (
        <p className="admin-aviso">
          Tienes <strong>{cambiosPendientes} cambio(s) sin publicar</strong>. Aprieta{' '}
          <strong>«Guardar cambios»</strong> para que salgan en la web.
        </p>
      )}

      <p className="admin-aviso">
        Aquí ves <strong>exactamente las fotos que salen en cada producto</strong>{' '}
        (en el mismo orden). <strong>Cada foto tiene su propio precio</strong>: lo
        escribes en el cuadro de abajo de la foto y ese es el que sale en la web.
        También puedes <strong>cambiarlas de lugar</strong> (arrastrando o con las
        flechas) y <strong>cambiar la foto</strong> sin perder su precio. Nada se
        publica hasta que aprietes <strong>«Guardar cambios»</strong>: así todo sale
        junto y la web se compila una sola vez.
      </p>
      <p className="admin-ayuda">
        Ya no hay precios por página: el precio es de cada foto, así que puedes
        ponerle uno distinto a cada diseño. Si dejas el cuadro vacío, esa foto sale
        con «Precio por confirmar». Tips: los pasteles (sweetcakes) se cotizan uno
        por uno; las artecookies dependen del tamaño
        (6&nbsp;cm $4.500 · 8&nbsp;cm $5.200 · 10&nbsp;cm $6.000).
      </p>

      <label className="admin-campo">
        Producto
        <select
          className="admin-entrada"
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
        >
          {Object.keys(PRODUCTOS_LABEL).map((id) => (
            <option key={id} value={id}>
              {PRODUCTOS_LABEL[id]} ({lista[id]?.length ?? 0} fotos)
            </option>
          ))}
        </select>
      </label>

      <div className="admin-fila">
        <input
          className="admin-entrada"
          value={precioMasivo}
          placeholder="Precio para todas las fotos (ej: $5.000)"
          onChange={(e) => setPrecioMasivo(e.target.value)}
        />
        <button
          type="button"
          className="admin-boton"
          onClick={aplicarPrecioATodas}
          disabled={!precioMasivo.trim() || fotos.length === 0}
          title="Pone este precio a todas las fotos del producto elegido"
        >
          Aplicar a todas las fotos
        </button>
      </div>

      <div className="admin-rejilla-fotos">
        {fotos.map((entrada, indice) => {
          return (
            <div
              className={`admin-foto${arrastrando === indice ? ' arrastrando' : ''}`}
              key={`${entrada.seccion}/${entrada.foto}`}
              draggable
              onDragStart={() => setArrastrando(indice)}
              onDragEnd={() => setArrastrando(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => soltar(indice)}
            >
              <span className="admin-foto-posicion">#{indice + 1}</span>
              <img
                src={
                  entrada.nueva ??
                  `${urlCruda(cfg, `public/catalogo/${entrada.seccion}/${entrada.foto}`)}?v=${shas[`${entrada.seccion}/${entrada.foto}`] ?? '1'}`
                }
                alt={entrada.foto}
                loading="lazy"
              />
              <p className="admin-foto-nombre" title={entrada.foto}>
                {entrada.foto}
              </p>
              {entrada.nueva && (
                <span className="admin-foto-nueva">Foto nueva · sin publicar</span>
              )}
              <p className="admin-foto-pagina">
                {SECCIONES_LABEL[entrada.seccion] ?? entrada.seccion}
              </p>
              <div className="admin-foto-precio">
                <input
                  className="admin-entrada"
                  value={entrada.precio}
                  placeholder="Precio"
                  onDragStart={(e) => e.stopPropagation()}
                  onChange={(e) => cambiarPrecio(indice, e.target.value)}
                />
              </div>
              <div className="admin-foto-acciones">
                <button
                  type="button"
                  className="admin-boton admin-boton-chico"
                  onClick={() => mover(indice, -1)}
                  disabled={ocupado || indice === 0}
                  title="Subir una posición"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-boton admin-boton-chico"
                  onClick={() => mover(indice, 1)}
                  disabled={ocupado || indice === fotos.length - 1}
                  title="Bajar una posición"
                >
                  ↓
                </button>
                <label
                  className="admin-boton admin-boton-chico"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.currentTarget.querySelector('input')?.click()
                    }
                  }}
                >
                  Cambiar
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={ocupado}
                    onChange={(e) => {
                      const archivo = e.target.files?.[0]
                      e.target.value = ''
                      if (archivo) void reemplazar(entrada, archivo)
                    }}
                  />
                </label>
                {entrada.nueva && (
                  <button
                    type="button"
                    className="admin-boton admin-boton-chico"
                    disabled={ocupado}
                    onClick={() => deshacerCambio(entrada)}
                    title="Volver a la foto que está publicada"
                  >
                    Deshacer
                  </button>
                )}
                <button
                  type="button"
                  className="admin-boton admin-boton-rojo admin-boton-chico"
                  disabled={ocupado}
                  onClick={() => eliminar(entrada)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {fotos.length === 0 && (
        <p className="admin-estado">Este producto no tiene fotos todavía.</p>
      )}

      <section className="admin-bloque">
        <h3>Agregar foto nueva a {PRODUCTOS_LABEL[producto] ?? producto}</h3>
        <div className="admin-fila">
          <label className="admin-campo admin-en-linea">
            Sección
            <select
              className="admin-entrada"
              value={seccionNueva}
              onChange={(e) => setSeccionNueva(e.target.value)}
            >
              {seccionesDelProducto.map((id) => (
                <option key={id} value={id}>
                  {SECCIONES_LABEL[id] ?? id}
                </option>
              ))}
            </select>
          </label>
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
              placeholder="1"
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
          El nombre sale solo: {seccionNueva || 'seccion'}-{paginaNueva || '40'}-
          {ordenNueva || '1'}.webp
        </p>
      </section>

      <div className="admin-panel-cabecera">
        <button
          type="button"
          className="admin-boton admin-boton-primario"
          onClick={() => void guardar()}
          disabled={guardando}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
