import { useEffect, useMemo, useState } from 'react'
import type { ItemCarrito } from '../../types'
import { whatsappUrl } from '../../data/contacto'
import { formatearPrecio } from '../../utils/precio'

interface CarritoProps {
  items: ItemCarrito[]
  onCambiarCantidad: (id: string, cantidad: number) => void
  onQuitar: (id: string) => void
  onVaciar: () => void
}

function construirMensaje(
  nombre: string,
  telefono: string,
  nota: string,
  items: ItemCarrito[],
): string {
  const lineas = items.map((item) => {
    const precio =
      item.precio !== null
        ? formatearPrecio(item.precio * item.cantidad)
        : '💬 a cotizar'
    return `• ${item.cantidad} × ${item.nombre} — ${precio}`
  })

  const total = items.reduce(
    (acumulado, item) => acumulado + (item.precio ?? 0) * item.cantidad,
    0,
  )
  const hayCotizacion = items.some((item) => item.precio === null)

  const totalTexto = hayCotizacion
    ? total > 0
      ? `${formatearPrecio(total)} + cotización 💬`
      : 'por cotizar 💬'
    : formatearPrecio(total)

  const partes: string[] = [
    '🛍️ *NUEVO PEDIDO — Petite Princesse*',
    '',
    `👤 *Nombre:* ${nombre}`,
    `📱 *Teléfono:* ${telefono}`,
    '',
    '📦 *Mi pedido:*',
    ...lineas,
    '',
    `💰 *Total estimado: ${totalTexto}*`,
  ]

  if (nota.trim()) {
    partes.push('', `📝 *Nota:* ${nota.trim()}`)
  }
  partes.push('', 'Quedo atento(a) a tu confirmación 💕')

  return partes.join('\n')
}

export function Carrito({
  items,
  onCambiarCantidad,
  onQuitar,
  onVaciar,
}: CarritoProps) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  const cantidadTotal = items.reduce((s, i) => s + i.cantidad, 0)
  const total = useMemo(
    () => items.reduce((s, i) => s + (i.precio ?? 0) * i.cantidad, 0),
    [items],
  )
  const hayCotizacion = items.some((i) => i.precio === null)

  // Escape cierra el carrito y la página no se desplaza mientras está abierto
  useEffect(() => {
    if (!abierto) return
    const alTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alTecla)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alTecla)
      document.body.style.overflow = ''
    }
  }, [abierto])

  const enviarPedido = () => {
    const nombreLimpio = nombre.trim()
    const telefonoLimpio = telefono.trim().replace(/[^\d+]/g, '')
    if (nombreLimpio.length < 2) {
      setError('Escribe tu nombre para confirmar el pedido.')
      return
    }
    if (!/^\+?\d{7,15}$/.test(telefonoLimpio)) {
      setError('Escribe un teléfono válido (solo números).')
      return
    }
    setError('')

    const url = whatsappUrl(
      construirMensaje(nombreLimpio, telefonoLimpio, nota, items),
    )
    const ventana = window.open(url, '_blank', 'noopener,noreferrer')
    if (!ventana) window.location.href = url

    onVaciar()
    setNombre('')
    setTelefono('')
    setNota('')
    setEnviado(true)
  }

  const totalTexto =
    hayCotizacion && total === 0
      ? 'Por cotizar'
      : total > 0
        ? formatearPrecio(total) + (hayCotizacion ? ' + 💬' : '')
        : '$0'

  return (
    <>
      <button
        type="button"
        className="carrito-flotante"
        onClick={() => setAbierto(true)}
        aria-label="Abrir carrito"
      >
        🛒
        <span className="carrito-contador">{cantidadTotal}</span>
      </button>

      {abierto && (
        <div
          className="carrito-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Tu carrito"
          onClick={() => setAbierto(false)}
        >
          <div
            className="carrito-caja"
            onClick={(evento) => evento.stopPropagation()}
          >
            <header className="carrito-cabecera">
              <h2>Tu carrito 🛒</h2>
              <button
                type="button"
                className="carrito-cerrar"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar carrito"
              >
                ✕
              </button>
            </header>

            <div className="carrito-cuerpo">
              {enviado ? (
                <div className="carrito-enviado">
                  <p className="carrito-enviado-titulo">✅ ¡Pedido enviado!</p>
                  <p>
                    Abrimos WhatsApp con tu pedido. Ahí coordinas fecha,
                    detalles y la confirmación final 💕
                  </p>
                  <button
                    type="button"
                    className="carrito-enviar"
                    onClick={() => setEnviado(false)}
                  >
                    Seguir comprando
                  </button>
                </div>
              ) : items.length === 0 ? (
                <p className="carrito-vacio">
                  Tu carrito está vacío. ¡Elige tus antojos! 💕
                </p>
              ) : (
                <>
                  <ul className="carrito-lista">
                    {items.map((item) => (
                      <li key={item.id} className="carrito-item">
                        {item.src ? (
                          <img src={item.src} alt={item.nombre} />
                        ) : (
                          <span className="carrito-item-sin-foto">🎁</span>
                        )}
                        <div className="carrito-item-info">
                          <p className="carrito-item-nombre">{item.nombre}</p>
                          <p className="carrito-item-precio">
                            {item.precioTexto}
                          </p>
                          <div className="carrito-item-controles">
                            <button
                              type="button"
                              onClick={() =>
                                onCambiarCantidad(item.id, item.cantidad - 1)
                              }
                              aria-label="Quitar una unidad"
                            >
                              −
                            </button>
                            <span>{item.cantidad}</span>
                            <button
                              type="button"
                              onClick={() =>
                                onCambiarCantidad(item.id, item.cantidad + 1)
                              }
                              aria-label="Agregar una unidad"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="carrito-item-quitar"
                              onClick={() => onQuitar(item.id)}
                              aria-label="Quitar del carrito"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="carrito-total">
                    <span>Total{hayCotizacion ? ' estimado' : ''}:</span>
                    <strong>{totalTexto}</strong>
                  </div>
                  {hayCotizacion && (
                    <p className="carrito-cotizacion-nota">
                      💬 = precio por confirmar (lo cotizamos cuando te
                      respondamos el pedido).
                    </p>
                  )}

                  <div className="carrito-form">
                    <label>
                      Tu nombre *
                      <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Laura"
                      />
                    </label>
                    <label>
                      Tu teléfono * <span>(para confirmarte)</span>
                      <input
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        inputMode="tel"
                        placeholder="Ej: 300 123 45 67"
                      />
                    </label>
                    <label>
                      Nota (opcional)
                      <textarea
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="Ej: lo necesito para el sábado"
                        rows={2}
                      />
                    </label>

                    {error && <p className="carrito-error">{error}</p>}

                    <button
                      type="button"
                      className="carrito-enviar"
                      onClick={enviarPedido}
                    >
                      Enviar pedido por WhatsApp 💬
                    </button>
                    <button
                      type="button"
                      className="carrito-vaciar"
                      onClick={onVaciar}
                    >
                      Vaciar carrito
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}