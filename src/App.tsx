import { useEffect, useState } from 'react'
import './App.css'

import { Encabezado } from './components/layout/Encabezado'
import { PiePagina } from './components/layout/PiePagina'
import { Inicio } from './components/sections/Inicio'
import { Productos } from './components/sections/Productos'
import { Combos } from './components/sections/Combos'
import { Mayoreo } from './components/sections/Mayoreo'
import { Nosotros } from './components/sections/Nosotros'
import { Galeria } from './components/sections/Galeria'
import { Contacto } from './components/sections/Contacto'
import { ModalProducto } from './components/ui/ModalProducto'
import { ModalCombo } from './components/ui/ModalCombo'
import { FondoDecorativo } from './components/ui/FondoDecorativo'
import { AdminPanel } from './admin/AdminPanel'

import type { ItemCarrito, Producto } from './types'
import type { ComboProducto } from './data/combos'
import { enlacesNavegacion } from './data/navegacion'
import { productos } from './data/productos'
import { combos } from './data/combos'
import { logoMarca } from './data/logo'
import { beneficiosMayoreo } from './data/mayoreo'
import { fotosGaleria } from './data/galeria'
import { enlacesContacto } from './data/contacto'
import { Carrito } from './components/carrito/Carrito'

const NOMBRE_MARCA = 'PETITE PRINCESSE'
const ESLOGAN = 'Chocolates y galletas artesanales'
const CLAVE_CARRITO = 'petite-carrito'

function cargarCarrito(): ItemCarrito[] {
  try {
    const guardado = window.localStorage.getItem(CLAVE_CARRITO)
    if (!guardado) return []
    const datos: unknown = JSON.parse(guardado)
    return Array.isArray(datos) ? (datos as ItemCarrito[]) : []
  } catch {
    return []
  }
}

// App solo compone: decide qué datos recibe cada componente.
function App() {
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null)
  const [comboAbierto, setComboAbierto] = useState<ComboProducto | null>(null)
  const [carrito, setCarrito] = useState<ItemCarrito[]>(cargarCarrito)
  const [enAdmin, setEnAdmin] = useState<boolean>(() =>
    window.location.hash.startsWith('#admin'),
  )

  useEffect(() => {
    const alCambiar = () => setEnAdmin(window.location.hash.startsWith('#admin'))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  // El carrito sobrevive al recargar la página
  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito))
    } catch {
      // sin almacenamiento disponible: el carrito solo vive en memoria
    }
  }, [carrito])

  const agregarAlCarrito = (item: ItemCarrito) => {
    setCarrito((actual) => {
      const existente = actual.find((i) => i.id === item.id)
      if (existente) {
        return actual.map((i) =>
          i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i,
        )
      }
      return [...actual, item]
    })
  }

  const cambiarCantidad = (id: string, cantidad: number) => {
    setCarrito((actual) =>
      actual
        .map((i) => (i.id === id ? { ...i, cantidad: Math.max(0, cantidad) } : i))
        .filter((i) => i.cantidad > 0),
    )
  }

  const quitarDelCarrito = (id: string) =>
    setCarrito((actual) => actual.filter((i) => i.id !== id))

  const vaciarCarrito = () => setCarrito([])

  // Panel de administración: entra con tuweb.com/#admin
  if (enAdmin) return <AdminPanel />

  return (
    <div className="pagina">
      <FondoDecorativo />

      <Encabezado
        nombreMarca={NOMBRE_MARCA}
        eslogan={ESLOGAN}
        enlaces={enlacesNavegacion}
        accion={{ etiqueta: 'Hacer mi pedido', href: '#contacto' }}
      />

      <Inicio
        lineasTitulo={['DULCERÍA ARTESANAL', 'HECHA CON AMOR']}
        descripcion="Galletas crujientes, chocolatinas irresistibles y dulces perfectos para regalar, celebrar o darte ese gusto que tanto mereces."
        accion={{ etiqueta: 'Explorar', href: '#productos' }}
        logo={logoMarca.activo ? { src: logoMarca.src, alt: logoMarca.alt } : undefined}
      />

      <Productos productos={productos} onVerProducto={setProductoAbierto} />

      <Combos
        combos={combos}
        onAgregar={agregarAlCarrito}
        onVerCombo={setComboAbierto}
      />

      <Mayoreo
        beneficios={beneficiosMayoreo}
        accion={{ etiqueta: 'Quiero mi cotización', href: '#contacto' }}
      />

      <Nosotros
        nombreMarca="Petite Princesse"
        parrafos={[
          'Somos una dulcería artesanal donde cada chocolate, galleta y pastel se elabora a mano, pensando en ese momento en el que lo vas a probar.',
          'Creemos que un buen dulce no solo se come: se comparte, se regala y se recuerda. Por eso cuidamos cada detalle para que se vean tan bonitos como saben.',
        ]}
      />

      <Galeria
        fotos={fotosGaleria}
        mensaje="Toca cualquier foto y déjate tentar… luego pide tu favorito 💕"
      />

      <Contacto
        enlaces={enlacesContacto}
        pregunta="¿Ya te antojaste? Escríbenos y arma tu pedido o pide tu cotización hoy mismo."
        notaEnvios="🚚 Domicilios locales y envíos nacionales."
      />

      <PiePagina
        nombreMarca={NOMBRE_MARCA}
        mensajes={['Dulcería artesanal premium 🍭', 'Pide el tuyo hoy 💕']}
      />

      {productoAbierto && (
        <ModalProducto
          producto={productoAbierto}
          onCerrar={() => setProductoAbierto(null)}
          onAgregar={agregarAlCarrito}
        />
      )}

      {comboAbierto && (
        <ModalCombo
          combo={comboAbierto}
          onCerrar={() => setComboAbierto(null)}
          onAgregar={agregarAlCarrito}
        />
      )}

      <Carrito
        items={carrito}
        onCambiarCantidad={cambiarCantidad}
        onQuitar={quitarDelCarrito}
        onVaciar={vaciarCarrito}
      />
    </div>
  )
}

export default App
