import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { aggregateFacets, fetchCatalogPage, getTrending, matchesFilters, sortTitles } from '@/services/api'
import { dedupeTitles } from '@/services/normalize'
import { isAborted } from '@/services/apiClient'
import { APP } from '@/config/app'
import type { CatalogFilters, Title } from '@/services/types'

export type CatalogSource = 'movie' | 'series' | 'anime' | 'trending' | 'all'

const ANIME_GENRE = 'anime'

function isAnime(title: Title): boolean {
  return title.genres.some((genre) => genre.trim().toLowerCase() === ANIME_GENRE)
}

async function fetchBatch(source: CatalogSource, page: number, signal: AbortSignal) {
  if (source === 'trending') {
    const data = await getTrending(page, { signal })
    return { items: data.items, hasMore: data.hasMore }
  }

  if (source === 'anime') {
    // Anime titles are tagged with the "Anime" genre in the TV catalogue.
    const series = await fetchCatalogPage('series', page, { signal })
    const items = series.items.filter((item) => item.kind === 'series' && isAnime(item))
    return { items, hasMore: series.hasMore }
  }

  if (source === 'all') {
    const [movies, series] = await Promise.all([
      fetchCatalogPage('movie', page, { signal }),
      fetchCatalogPage('series', page, { signal }),
    ])
    return {
      items: [...movies.items.filter((item) => item.kind === 'movie'), ...series.items.filter((item) => item.kind === 'series')],
      hasMore: movies.hasMore || series.hasMore,
    }
  }

  const kind = source === 'movie' ? 'movie' : 'series'
  const data = await fetchCatalogPage(kind, page, { signal })
  return { items: data.items.filter((item) => item.kind === kind), hasMore: data.hasMore }
}

interface UseCatalogOptions {
  source: CatalogSource
  filters: CatalogFilters
  /** Extra always-on predicate (e.g. a fixed genre from the route) */
  predicate?: (title: Title) => boolean
  /** Pages fetched per "load more" interaction */
  pagesPerBatch?: number
}

/**
 * Client-side catalogue engine.
 *
 * The upstream endpoints ignore filter/sort parameters, so the app loads
 * catalogue pages and filters locally. The UI states this explicitly and
 * keeps loading pages while the filtered result set is thin.
 */
export function useCatalog({ source, filters, predicate, pagesPerBatch = 3 }: UseCatalogOptions) {
  const [raw, setRaw] = useState<Title[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [exhausted, setExhausted] = useState(false)

  const nextPage = useRef(1)
  const controllerRef = useRef<AbortController | null>(null)
  const requestId = useRef(0)

  const reset = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const id = ++requestId.current

    setLoading(true)
    setError(null)
    setExhausted(false)
    nextPage.current = 1

    try {
      const batch = await fetchBatch(source, 1, controller.signal)
      if (id !== requestId.current) return
      let page = 2
      let hasMore = batch.hasMore
      let items = batch.items
      for (let i = 1; i < pagesPerBatch && hasMore; i += 1) {
        const nextBatch = await fetchBatch(source, page, controller.signal)
        items = [...items, ...nextBatch.items]
        hasMore = nextBatch.hasMore
        page += 1
      }
      if (id !== requestId.current) return
      setRaw(dedupeTitles(items))
      nextPage.current = page
      setExhausted(!hasMore)
    } catch (loadError) {
      if (id === requestId.current && !isAborted(loadError)) setError(loadError)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [source, pagesPerBatch])

  useEffect(() => {
    void reset()
    return () => controllerRef.current?.abort()
  }, [reset])

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || exhausted) return
    const controller = controllerRef.current ?? new AbortController()
    controllerRef.current = controller
    const id = requestId.current
    setLoadingMore(true)
    try {
      let page = nextPage.current
      let items: Title[] = []
      let hasMore = true
      for (let i = 0; i < pagesPerBatch && hasMore; i += 1) {
        const batch = await fetchBatch(source, page, controller.signal)
        items = [...items, ...batch.items]
        hasMore = batch.hasMore
        page += 1
      }
      if (id !== requestId.current) return
      setRaw((current) => dedupeTitles([...current, ...items]))
      nextPage.current = page
      setExhausted(!hasMore)
    } catch (loadError) {
      if (id === requestId.current && !isAborted(loadError)) setError(loadError)
    } finally {
      if (id === requestId.current) setLoadingMore(false)
    }
  }, [loadingMore, loading, exhausted, pagesPerBatch, source])

  const facets = useMemo(() => aggregateFacets(raw), [raw])

  const items = useMemo(() => {
    const filtered = raw.filter((title) => matchesFilters(title, filters) && (predicate ? predicate(title) : true))
    return sortTitles(filtered, filters.sort)
  }, [raw, filters, predicate])

  // Keep pulling pages while a filter is active but too little has matched.
  const autoLoading = useRef(false)
  useEffect(() => {
    if (loading || loadingMore || exhausted || autoLoading.current) return
    if (items.length >= 12) return
    if (raw.length >= APP.maxFilterSweepPages * 48) return
    autoLoading.current = true
    const timer = window.setTimeout(() => {
      autoLoading.current = false
      void loadMore()
    }, 120)
    return () => window.clearTimeout(timer)
  }, [items.length, raw.length, loading, loadingMore, exhausted, loadMore])

  return {
    items,
    raw,
    facets,
    loading,
    loadingMore,
    error,
    exhausted,
    hasMore: !exhausted,
    loadMore,
    reload: reset,
    loadedCount: raw.length,
  }
}
