import { useEffect, useRef, useState } from 'react'
import type { ItemCarrito, Producto } from '../../types'
import { catalogo } from '../../data/catalogo'
import type { FotoCatalogo } from '../../data/catalogo'
import { catalogoInfo } from '../../data/catalogoInfo'
import { precioANumero } from '../../utils/precio'
import { separarDescripcion } from '../../utils/descripcion'
import { whatsappUrl } from '../../data/contacto'
import { Lightbox } from './Lightbox'

interface ModalProductoProps {
  producto: Producto
  onCerrar: () => void
  onAgregar?: (item: ItemCarrito) => void
}

export function ModalProducto({
  producto,
  onCerrar,
  onAgregar,
}: ModalProductoProps) {
  const fotos = catalogo[producto.id] ?? []
  const info = catalogoInfo[producto.id]
  const mostrarPrecios = info?.mostrarPrecios !== false
  // Si ninguna foto tiene precio, la sección se cotiza por WhatsApp (no lleva carrito).
  const esCotizacion = fotos.length > 0 && !fotos.some((foto) => foto.precio)
  const notas =
    info?.notas ??
    (info?.nota ? [info.nota] : ([] as string[]))
  const { cuerpo } = separarDescripcion(producto.descripcion)
  // Fotos propias de la categoría (las que no están en el catálogo con precio).
  const fotosPropias = producto.fotos.filter((src) => !fotos.some((f) => f.src === src))
  const [ampliada, setAmpliada] = useState<{ tipo: 'fotos' | 'catalogo'; indice: number } | null>(
    null,
  )
  const [agregado, setAgregado] = useState<string | null>(null)
  const temporizador = useRef<number | null>(null)

  const agregarAlCarrito = (foto: FotoCatalogo, indice: number) => {
    if (!onAgregar) return
    onAgregar({
      id: `${producto.id}::${foto.src}`,
      seccion: producto.nombre,
      nombre: `${producto.nombre} · diseño ${indice + 1}`,
      src: foto.src,
      precio: precioANumero(foto.precio),
      precioTexto: foto.precio || '💬 Por confirmar',
      cantidad: 1,
    })
    setAgregado(foto.src)
    if (temporizador.current) window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setAgregado(null), 1400)
  }

  // Escape cierra la foto ampliada o el modal
  useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return
      if (ampliada !== null) setAmpliada(null)
      else onCerrar()
    }
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [onCerrar, ampliada])
  // La página no se desplaza mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const listaAmpliada: string[] =
    ampliada?.tipo === 'fotos' ? fotosPropias : fotos.map((foto) => foto.src)
  const srcAmpliada = ampliada ? listaAmpliada[ampliada.indice] : undefined

  const moverFoto = (paso: number) => {
    setAmpliada((actual) => {
      if (!actual) return actual
      const lista = actual.tipo === 'fotos' ? fotosPropias : fotos.map((f) => f.src)
      if (lista.length === 0) return actual
      return { ...actual, indice: (actual.indice + paso + lista.length) % lista.length }
    })
  }

  return (
    <>
      <div
        className="modal-producto"
        role="dialog"
        aria-modal="true"
        aria-label={`Diseños de ${producto.nombre}`}
        onClick={onCerrar}
      >
        <div
          className="modal-producto-caja"
          onClick={(evento) => evento.stopPropagation()}
        >
          <header className="modal-producto-cabecera">
            <div>
              <h2>{producto.nombre}</h2>
              <p>
                {fotos.length > 0
                  ? `${fotos.length} diseños disponibles`
                  : 'Muy pronto más diseños'}
              </p>
            </div>
            <button
              type="button"
              className="modal-producto-cerrar"
              onClick={onCerrar}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </header>

          <div className="modal-producto-cuerpo">
            {cuerpo && (
              <div className="modal-descripcion">
                <p>{cuerpo}</p>
              </div>
            )}

            {notas.length > 0 && (
              <div className="catalogo-notas">
                {notas.map((nota) => (
                  <p className="catalogo-nota" key={nota}>
                    {nota}
                  </p>
                ))}
              </div>
            )}

            {info?.listas && info.listas.length > 0 && (
              <div className="catalogo-listas">
                {info.listas.map((lista) => (
                  <div className="catalogo-sabores" key={lista.titulo}>
                    <h3>{lista.titulo}</h3>
                    <ul>
                      {lista.opciones.map((opcion) => (
                        <li key={opcion}>{opcion}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {fotosPropias.length > 0 && (
              <div className="modal-fotos-producto">
                {fotosPropias.map((src) => (
                  <button
                    key={src}
                    type="button"
                    className="modal-foto-producto"
                    onClick={() =>
                      setAmpliada({ tipo: 'fotos', indice: fotosPropias.indexOf(src) })
                    }
                    aria-label={`Ampliar foto de ${producto.nombre}`}
                  >
                    <img src={src} alt={`${producto.nombre}`} loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {fotos.length > 0 ? (
              <>
                <ul className="catalogo-lista">
                  {fotos.map((foto, i) => (
                    <li key={foto.src}>
                      <div className="catalogo-tarjeta">
                        <button
                          type="button"
                          className="catalogo-foto"
                          onClick={() => setAmpliada({ tipo: 'catalogo', indice: i })}
                          aria-label={`Ampliar diseño ${i + 1} de ${producto.nombre}`}
                        >
                          <img
                            src={foto.src}
                            alt={`${producto.nombre} ${i + 1}`}
                            loading="lazy"
                          />
                          {mostrarPrecios && (
                            <span className="catalogo-precio">
                              {foto.precio || 'Precio por confirmar'}
                            </span>
                          )}
                        </button>
                        {!esCotizacion && (
                          <button
                            type="button"
                            className="catalogo-agregar"
                            onClick={() => agregarAlCarrito(foto, i)}
                            aria-label={`Agregar ${producto.nombre} diseño ${i + 1} al carrito`}
                          >
                            {agregado === foto.src ? '✓ Agregado' : 'Agregar 🛒'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {esCotizacion && (
                  <div className="catalogo-cotizar">
                    <a
                      href={whatsappUrl(
                        `¡Hola Petite Princesse 💕! Quiero cotizar ${producto.nombre}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="catalogo-cotizar-boton"
                    >
                      Cotizar por WhatsApp 💬
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="catalogo-vacio">
                Aún no tengo fotos de esta sección. Vuelve pronto 💕
              </p>
            )}
          </div>
        </div>
      </div>

      {srcAmpliada && ampliada !== null && (
        <Lightbox
          foto={{ id: srcAmpliada, etiqueta: producto.nombre, src: srcAmpliada }}
          posicion={`${ampliada.indice + 1} de ${listaAmpliada.length}`}
          onCerrar={() => setAmpliada(null)}
          onAnterior={() => moverFoto(-1)}
          onSiguiente={() => moverFoto(1)}
        />
      )}
    </>
  )
}
