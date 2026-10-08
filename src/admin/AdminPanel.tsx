import { useState } from 'react'
import './Admin.css'
import type { ConfigGitHub } from './github'
import { probarConexion } from './github'
import { borrarConfigLocal, guardarConfigLocal, leerConfigLocal } from './storage'
import { PanelPrecios } from './PanelPrecios'
import { PanelProductos } from './PanelProductos'
import { PanelFotos } from './PanelFotos'

type Pestana = 'precios' | 'productos' | 'fotos'

function FormularioConexion({ onConectado }: { onConectado: (cfg: ConfigGitHub) => void }) {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [token, setToken] = useState('')
  const [probando, setProbando] = useState(false)
  const [error, setError] = useState('')

  const conectarse = async () => {
    if (!owner.trim() || !repo.trim() || !token.trim()) {
      setError('Completa el usuario, el repositorio y el token.')
      return
    }
    setProbando(true)
    setError('')
    const propuesta: ConfigGitHub = {
      owner: owner.trim(),
      repo: repo.trim(),
      branch: branch.trim() || 'main',
      token: token.trim(),
    }
    try {
      const info = await probarConexion(propuesta)
      const finalCfg = { ...propuesta, branch: info.ramaPorDefecto || propuesta.branch }
      guardarConfigLocal(finalCfg)
      onConectado(finalCfg)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar a GitHub.')
    } finally {
      setProbando(false)
    }
  }

  return (
    <div className="admin-conexion">
      <header className="admin-logotipo">
        <h1>Panel de Petite Princesse</h1>
        <p>Edita precios y fotos sin tocar código 🍫</p>
      </header>

      <section className="admin-bloque admin-bloque-ancho">
        <h3>Conexión con tu repositorio</h3>
        <p className="admin-ayuda">
          Escribe aquí los datos del repositorio de GitHub de tu página y un token con
          permiso para guardar. Se guardan solo en este dispositivo (localmente), una sola vez.
        </p>

        {error && <p className="admin-error">{error}</p>}

        <label className="admin-campo">
          Usuario de GitHub
          <input className="admin-entrada" value={owner} placeholder="tu-usuario" onChange={(e) => setOwner(e.target.value)} />
        </label>
        <label className="admin-campo">
          Repositorio (el nombre del proyecto en GitHub)
          <input className="admin-entrada" value={repo} placeholder="mi-pasteleria" onChange={(e) => setRepo(e.target.value)} />
        </label>
        <label className="admin-campo">
          Rama (normalmente "main")
          <input className="admin-entrada" value={branch} placeholder="main" onChange={(e) => setBranch(e.target.value)} />
        </label>
        <label className="admin-campo">
          Token de GitHub (clave de acceso)
          <input
            className="admin-entrada"
            type="password"
            value={token}
            placeholder="github_pat_…"
            onChange={(e) => setToken(e.target.value)}
          />
        </label>

        <button type="button" className="admin-boton admin-boton-primario" onClick={() => void conectarse()} disabled={probando}>
          {probando ? 'Verificando…' : 'Conectar y guardar'}
        </button>
      </section>

      <section className="admin-bloque admin-bloque-ancho">
        <h3>Cómo crear el token (una vez)</h3>
        <ol className="admin-pasos">
          <li>
            Entra a GitHub.com → tu foto arriba a la derecha → <strong>Settings</strong> →
            <strong> Developer settings</strong> → <strong>Personal access tokens</strong> →
            <strong> Fine-grained tokens</strong> → <strong>Generate new token</strong>.
          </li>
          <li>
            Pon un nombre (ej. «mi panel»), elige un vencimiento largo y en{' '}
            <strong>Repository access</strong> escoge <em>Only select repositories</em> y
            marca tu repositorio de la página.
          </li>
          <li>
            En <strong>Permissions</strong> → <strong>Contents</strong> elige{' '}
            <em>Read and write</em>.
          </li>
          <li>
            Genera el token y cópialo aquí (empieza con <code>github_pat_…</code>). No se
            mostrará en la web para los visitantes.
          </li>
        </ol>
      </section>

      <footer className="admin-pie">
        <p>
          💡 Cada «Guardar cambios» se deposita directo en tu GitHub; Netlify publica la
          página sola en un par de minutos.
        </p>
      </footer>
    </div>
  )
}

export function AdminPanel() {
  const [cfg, setCfg] = useState<ConfigGitHub | null>(() => leerConfigLocal())
  const [pestana, setPestana] = useState<Pestana>('precios')

  if (!cfg) return <FormularioConexion onConectado={setCfg} />

  const desconectar = () => {
    borrarConfigLocal()
    setCfg(null)
  }

  return (
    <div className="admin">
      <header className="admin-cabecera">
        <div className="admin-cabecera-info">
          <h1>Panel de Petite Princesse</h1>
          <p>
            {cfg.owner}/{cfg.repo} · rama {cfg.branch}
          </p>
        </div>
        <div className="admin-cabecera-acciones">
          <a className="admin-boton admin-boton-ghost" href="#/">
            Ver la página
          </a>
          <button type="button" className="admin-boton admin-boton-ghost" onClick={desconectar}>
            Desconectar
          </button>
        </div>
      </header>

      <nav className="admin-pestanas">
        <button type="button" className={pestana === 'precios' ? 'activa' : ''} onClick={() => setPestana('precios')}>
          Precios
        </button>
        <button type="button" className={pestana === 'productos' ? 'activa' : ''} onClick={() => setPestana('productos')}>
          Productos y sabores
        </button>
        <button type="button" className={pestana === 'fotos' ? 'activa' : ''} onClick={() => setPestana('fotos')}>
          Fotos
        </button>
      </nav>

      <main className="admin-contenido">
        {pestana === 'precios' && <PanelPrecios cfg={cfg} />}
        {pestana === 'productos' && <PanelProductos cfg={cfg} />}
        {pestana === 'fotos' && <PanelFotos cfg={cfg} />}
      </main>

      <footer className="admin-pie">
        <p>💡 Cada cambio se guarda en GitHub y la página se actualiza sola en 1 a 2 minutos.</p>
      </footer>
    </div>
  )
}