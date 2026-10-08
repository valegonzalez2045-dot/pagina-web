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
import { AdminPanel } from './admin/AdminPanel'

import type { Producto } from './types'
import { enlacesNavegacion } from './data/navegacion'
import { productos } from './data/productos'
import { combos } from './data/combos'
import { beneficiosMayoreo } from './data/mayoreo'
import { fotosGaleria } from './data/galeria'
import { enlacesContacto } from './data/contacto'

const NOMBRE_MARCA = 'PETITE PRINCESSE'
const ESLOGAN = 'Chocolates y galletas artesanales'

// App solo compone: decide qué datos recibe cada componente.
function App() {
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null)
  const [enAdmin, setEnAdmin] = useState<boolean>(() =>
    window.location.hash.startsWith('#admin'),
  )

  useEffect(() => {
    const alCambiar = () => setEnAdmin(window.location.hash.startsWith('#admin'))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  // Panel de administración: entra con tuweb.com/#admin
  if (enAdmin) return <AdminPanel />

  return (
    <div className="pagina">
      <Encabezado
        nombreMarca={NOMBRE_MARCA}
        eslogan={ESLOGAN}
        enlaces={enlacesNavegacion}
        accion={{ etiqueta: 'Hacer mi pedido', href: '#contacto' }}
      />

      <Inicio
        etiqueta="DULCERÍA ARTESANAL HECHA CON AMOR"
        lineasTitulo={['Chocolate que se derrite', 'en la boca 🍫']}
        descripcion="Galletas crujientes, chocolatinas irresistibles y dulces perfectos para regalar, celebrar o darte ese gusto que tanto mereces."
        accion={{ etiqueta: 'Ver qué hay rico', href: '#productos' }}
      />

      <Productos productos={productos} onVerProducto={setProductoAbierto} />

      <Combos combos={combos} />

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
        />
      )}
    </div>
  )
}

export default App
