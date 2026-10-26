/**
 * Deployment base-path helpers.
 *
 * Vite's `base` option lets the same build run at the domain root (`/`) and
 * under a sub-path such as a GitHub Pages project site (`/eMovies/`). The
 * router works exclusively with *app paths* (`/movies`), while the browser
 * address bar holds *deployment paths* (`/eMovies/movies`); these helpers
 * translate between the two.
 *
 * The pure `joinBase` / `splitBase` functions take the base explicitly so they
 * can be unit-tested for both deployment shapes from a single build.
 */

/** Normalise any configured base into `''` (root) or `'/sub/path'` (no trailing slash). */
export function normalizeBase(base: string | undefined | null): string {
  if (!base || base === '/') return ''
  const trimmed = base.trim().replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}` : ''
}

const rawBase = typeof import.meta.env.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/'

/** Base of this build: `''` at the domain root, `'/eMovies'` for a project page. */
export const BASE_PATH = normalizeBase(rawBase)

/** Turn an app path (`/movies?page=2`) into a deployment path (`/eMovies/movies?page=2`). */
export function joinBase(base: string, path: string): string {
  const prefix = normalizeBase(base)
  if (!prefix) return path
  if (path === prefix) return `${prefix}/`
  // Already carries the base — never double-prefix (idempotent).
  if (path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}#`)) return path
  if (!path.startsWith('/')) return `${prefix}/${path}`
  return `${prefix}${path}`
}

/** Strip a deployment base from a browser pathname (`/eMovies/movies` → `/movies`). */
export function splitBase(base: string, pathname: string): string {
  const prefix = normalizeBase(base)
  if (!prefix) return pathname || '/'
  if (pathname === prefix || pathname === `${prefix}/`) return '/'
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length)
  return pathname || '/'
}

export function withBase(path: string): string {
  return joinBase(BASE_PATH, path)
}

export function stripBase(pathname: string): string {
  return splitBase(BASE_PATH, pathname)
}
