import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { parseLocation, type RouteMatch } from './routes'

interface RouterContextValue {
  route: RouteMatch
  navigate: (to: string, options?: { replace?: boolean; keepScroll?: boolean }) => void
  back: () => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

function currentMatch(): RouteMatch {
  return parseLocation(window.location.pathname, window.location.search)
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteMatch>(() => currentMatch())
  const scrollPositions = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const handlePop = () => {
      const next = currentMatch()
      setRoute(next)
      // Restore the previous scroll offset when navigating back.
      const saved = scrollPositions.current.get(next.path)
      window.requestAnimationFrame(() => window.scrollTo({ top: saved ?? 0, behavior: 'auto' }))
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const navigate = useCallback((to: string, options: { replace?: boolean; keepScroll?: boolean } = {}) => {
    const { replace = false, keepScroll = false } = options
    if (typeof to !== 'string' || to.length === 0) return

    let url: URL
    try {
      url = new URL(to, window.location.origin)
    } catch {
      return
    }
    // Never navigate to a different origin from an internal link.
    if (url.origin !== window.location.origin) return

    const nextPath = `${url.pathname}${url.search}`
    if (nextPath === `${window.location.pathname}${window.location.search}`) {
      if (!keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    scrollPositions.current.set(window.location.pathname, window.scrollY)
    window.history[replace ? 'replaceState' : 'pushState']({}, '', nextPath)
    setRoute(parseLocation(url.pathname, url.search))
    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back()
    else navigate('/')
  }, [navigate])

  const value = useMemo(() => ({ route, navigate, back }), [route, navigate, back])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext)
  if (!context) throw new Error('useRouter must be used inside <RouterProvider>')
  return context
}

export function useRoute(): RouteMatch {
  return useRouter().route
}
