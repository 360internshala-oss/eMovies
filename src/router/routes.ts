/** Route table + matcher (History API based, no external dependency). */

export type RouteName =
  | 'home'
  | 'movies'
  | 'series'
  | 'anime'
  | 'genres'
  | 'genre'
  | 'languages'
  | 'language'
  | 'providers'
  | 'provider'
  | 'trending'
  | 'recent'
  | 'top-rated'
  | 'continue-watching'
  | 'history'
  | 'my-list'
  | 'search'
  | 'title'
  | 'watch'
  | 'settings'
  | 'capabilities'
  | 'not-found'

interface RouteDef {
  pattern: string
  name: RouteName
  segments: string[]
}

const definitions: RouteDef[] = [
  { pattern: '/', name: 'home', segments: [] },
  { pattern: '/movies', name: 'movies', segments: ['movies'] },
  { pattern: '/series', name: 'series', segments: ['series'] },
  { pattern: '/anime', name: 'anime', segments: ['anime'] },
  { pattern: '/genres', name: 'genres', segments: ['genres'] },
  { pattern: '/genres/:genre', name: 'genre', segments: ['genres', ':genre'] },
  { pattern: '/languages', name: 'languages', segments: ['languages'] },
  { pattern: '/languages/:language', name: 'language', segments: ['languages', ':language'] },
  { pattern: '/providers', name: 'providers', segments: ['providers'] },
  { pattern: '/providers/:provider', name: 'provider', segments: ['providers', ':provider'] },
  { pattern: '/trending', name: 'trending', segments: ['trending'] },
  { pattern: '/recent', name: 'recent', segments: ['recent'] },
  { pattern: '/top-rated', name: 'top-rated', segments: ['top-rated'] },
  { pattern: '/continue-watching', name: 'continue-watching', segments: ['continue-watching'] },
  { pattern: '/history', name: 'history', segments: ['history'] },
  { pattern: '/my-list', name: 'my-list', segments: ['my-list'] },
  { pattern: '/search', name: 'search', segments: ['search'] },
  { pattern: '/title/:detailPath', name: 'title', segments: ['title', ':detailPath'] },
  { pattern: '/watch/:detailPath', name: 'watch', segments: ['watch', ':detailPath'] },
  { pattern: '/settings', name: 'settings', segments: ['settings'] },
  { pattern: '/capabilities', name: 'capabilities', segments: ['capabilities'] },
]

export interface RouteMatch {
  name: RouteName
  pattern: string
  params: Record<string, string>
  path: string
  query: URLSearchParams
}

export function parseLocation(pathname: string, search = ''): RouteMatch {
  const cleanPath = pathname.replace(/\/+$/, '') || '/'
  const segments = cleanPath.split('/').filter(Boolean)

  for (const definition of definitions) {
    if (definition.segments.length !== segments.length) continue
    const params: Record<string, string> = {}
    let matches = true
    for (let i = 0; i < segments.length; i += 1) {
      const expected = definition.segments[i]
      const actual = segments[i]
      if (expected.startsWith(':')) {
        try {
          params[expected.slice(1)] = decodeURIComponent(actual)
        } catch {
          params[expected.slice(1)] = actual
        }
      } else if (expected !== actual) {
        matches = false
        break
      }
    }
    if (matches) {
      return { name: definition.name, pattern: definition.pattern, params, path: cleanPath, query: new URLSearchParams(search) }
    }
  }

  return { name: 'not-found', pattern: '*', params: {}, path: cleanPath, query: new URLSearchParams(search) }
}

/** Build a path from a route name + params (used by <Link> and programmatic nav). */
export function buildPath(name: RouteName, params: Record<string, string> = {}, query?: Record<string, string | number | null | undefined>): string {
  const definition = definitions.find((route) => route.name === name)
  if (!definition) return '/'
  let path = definition.pattern
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, encodeURIComponent(value))
  }
  const search = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

export function titlePath(detailPath: string): string {
  return buildPath('title', { detailPath })
}

export function watchPath(detailPath: string, options: { season?: number; episode?: number } = {}): string {
  const { season, episode } = options
  return buildPath('watch', { detailPath }, {
    se: season !== undefined && season > 0 ? season : undefined,
    ep: episode !== undefined && episode > 0 ? episode : undefined,
  })
}
