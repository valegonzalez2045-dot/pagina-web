import type { ConfigGitHub } from './github'

const CLAVE = 'petite-princesse-admin-github'

export function leerConfigLocal(): ConfigGitHub | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const cfg = JSON.parse(crudo) as Partial<ConfigGitHub>
    if (!cfg.owner || !cfg.repo || !cfg.token) return null
    return { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch || 'main', token: cfg.token }
  } catch {
    return null
  }
}

export function guardarConfigLocal(cfg: ConfigGitHub): void {
  localStorage.setItem(CLAVE, JSON.stringify(cfg))
}

export function borrarConfigLocal(): void {
  localStorage.removeItem(CLAVE)
}