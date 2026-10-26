import { useCallback, useMemo } from 'react'
import { useRouter } from '@/router/RouterProvider'
import type { CatalogFilters, SortKey } from '@/services/types'

const SORT_KEYS: SortKey[] = ['recommended', 'recent', 'rating', 'title']

/**
 * Filter state lives in the URL query string so every filtered view is
 * shareable and works with browser back/forward.
 */
export function useCatalogFilters(defaultSort: SortKey = 'recommended') {
  const { route, navigate } = useRouter()

  const filters = useMemo<CatalogFilters>(() => {
    const query = route.query
    const rawGenres = query.get('genre') ?? ''
    const year = query.get('year')
    const parsedYear = year && /^\d{4}$/.test(year) ? Number.parseInt(year, 10) : null
    const minRating = query.get('rating')
    const parsedRating = minRating && /^\d(\.\d)?$/.test(minRating) ? Number.parseFloat(minRating) : null
    const sort = query.get('sort') as SortKey | null

    return {
      genres: rawGenres
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      year: parsedYear,
      country: query.get('country'),
      subtitleLanguage: query.get('subs'),
      audioLanguage: query.get('audio'),
      minRating: parsedRating,
      sort: sort && SORT_KEYS.includes(sort) ? sort : defaultSort,
    }
  }, [route.query, defaultSort])

  const patchQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(route.query)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }
      const qs = params.toString()
      navigate(`${route.path}${qs ? `?${qs}` : ''}`, { replace: true, keepScroll: true })
    },
    [navigate, route.path, route.query],
  )

  const setFilters = useCallback(
    (next: Partial<CatalogFilters>) => {
      const merged: CatalogFilters = { ...filters, ...next }
      patchQuery({
        genre: merged.genres.length > 0 ? merged.genres.join(',') : null,
        year: merged.year ? String(merged.year) : null,
        country: merged.country,
        subs: merged.subtitleLanguage,
        audio: merged.audioLanguage,
        rating: merged.minRating !== null ? String(merged.minRating) : null,
        sort: merged.sort !== defaultSort ? merged.sort : null,
      })
    },
    [filters, patchQuery, defaultSort],
  )

  const toggleGenre = useCallback(
    (genre: string) => {
      const exists = filters.genres.some((value) => value.toLowerCase() === genre.toLowerCase())
      setFilters({
        genres: exists ? filters.genres.filter((value) => value.toLowerCase() !== genre.toLowerCase()) : [...filters.genres, genre],
      })
    },
    [filters.genres, setFilters],
  )

  const clearFilters = useCallback(() => {
    patchQuery({ genre: null, year: null, country: null, subs: null, audio: null, rating: null })
  }, [patchQuery])

  const activeCount =
    filters.genres.length +
    (filters.year ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.subtitleLanguage ? 1 : 0) +
    (filters.audioLanguage ? 1 : 0) +
    (filters.minRating !== null ? 1 : 0)

  return { filters, setFilters, toggleGenre, clearFilters, activeCount, patchQuery }
}
