import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.(query).matches ?? false
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mql.matches)
    mql.addEventListener?.('change', handler)
    return () => mql.removeEventListener?.('change', handler)
  }, [query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
