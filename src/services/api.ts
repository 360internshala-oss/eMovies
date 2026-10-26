import { APP, ENDPOINTS } from '@/config/app'
import { requestJson } from './apiClient'
import {
  dedupeTitles,
  extractSubjectArray,
  normalizeCaptions,
  normalizeDetail,
  normalizeHome,
  normalizeList,
  normalizePlay,
  normalizeSearchKey,
  normalizeSubject,
} from './normalize'
import type {
  CatalogFilters,
  CatalogKind,
  HomeSection,
  Page,
  PlaybackSource,
  Platform,
  SortKey,
  SubtitleTrack,
  Title,
  TitleDetail,
} from './types'

/** Endpoint wrappers — one function per verified upstream route. */

export interface FetchArgs {
  signal?: AbortSignal
}

export async function getHealth(args: FetchArgs = {}): Promise<boolean> {
  try {
    const payload = await requestJson<{ ok?: boolean }>(ENDPOINTS.health, undefined, { signal: args.signal, retries: 0 })
    return payload?.ok === true
  } catch {
    return false
  }
}

export async function getTrending(page = 1, args: FetchArgs = {}): Promise<Page<Title>> {
  const payload = await requestJson<unknown>(ENDPOINTS.trending, { page }, { signal: args.signal })
  const items = extractSubjectArray(payload)
  const titles = dedupeTitles(items.map(normalizeSubject).filter((t): t is Title => t !== null))
  return { items: titles, page, hasMore: titles.length > 0 && page < 20 }
}

export async function getMovies(page = 1, perPage = 24, args: FetchArgs = {}): Promise<Page<Title>> {
  const payload = await requestJson<unknown>(ENDPOINTS.movies, { page, perPage }, { signal: args.signal })
  return normalizeList(payload)
}

export async function getSeries(page = 1, perPage = 24, args: FetchArgs = {}): Promise<Page<Title>> {
  const payload = await requestJson<unknown>(ENDPOINTS.series, { page, perPage }, { signal: args.signal })
  return normalizeList(payload)
}

export async function searchTitles(query: string, page = 1, perPage = 24, args: FetchArgs = {}): Promise<Page<Title>> {
  const q = query.trim()
  if (q.length === 0) return { items: [], page: 1, hasMore: false }
  const payload = await requestJson<unknown>(ENDPOINTS.search, { q, page, perPage }, { signal: args.signal, retries: 0 })
  return normalizeList(payload)
}

export async function getDetail(detailPath: string, args: FetchArgs = {}): Promise<TitleDetail | null> {
  const payload = await requestJson<unknown>(ENDPOINTS.detail, { detailPath }, { signal: args.signal })
  return normalizeDetail(payload)
}

export async function getRecommendations(subjectId: string, args: FetchArgs = {}): Promise<Title[]> {
  if (!subjectId) return []
  const payload = await requestJson<unknown>(ENDPOINTS.recs, { subjectId, page: 1, perPage: 18 }, { signal: args.signal, retries: 0 })
  const subjects = extractSubjectArray(payload)
  return dedupeTitles(subjects.map(normalizeSubject).filter((t): t is Title => t !== null))
}

export async function getPlayback(
  detailPath: string,
  subjectId: string,
  season = 0,
  episode = 0,
  args: FetchArgs = {},
): Promise<PlaybackSource> {
  const payload = await requestJson<unknown>(
    ENDPOINTS.play,
    { subjectId, detailPath, se: season, ep: episode },
    { signal: args.signal, timeoutMs: APP.requestTimeoutMs + 10000 },
  )
  return normalizePlay(payload)
}

export async function getCaptions(
  streamId: string,
  subjectId: string,
  detailPath: string,
  format = 'MP4',
  args: FetchArgs = {},
): Promise<SubtitleTrack[]> {
  if (!streamId || !subjectId) return []
  try {
    const payload = await requestJson<unknown>(
      ENDPOINTS.caption,
      { id: streamId, subjectId, detailPath, format },
      { signal: args.signal, retries: 0 },
    )
    return normalizeCaptions(payload)
  } catch {
    // Captions are an enhancement: a failure must never break playback.
    return []
  }
}

export async function getHome(args: FetchArgs = {}): Promise<{ sections: HomeSection[]; platforms: Platform[] }> {
  const payload = await requestJson<unknown>(ENDPOINTS.home, undefined, {
    signal: args.signal,
    // `/home` is a large aggregate payload; give it extra headroom.
    timeoutMs: APP.requestTimeoutMs + 15000,
    retries: 0,
  })
  return normalizeHome(payload)
}

export async function getPlatforms(args: FetchArgs = {}): Promise<Platform[]> {
  const { platforms } = await getHome(args)
  return platforms
}

/**
 * Seasons are not part of `/detail`; the catalogue exposes season-specific
 * entries ("Colony S2") that share a detailPath. We discover them with one
 * search request and surface only verified season numbers.
 */
export async function discoverSeasons(title: Title, args: FetchArgs = {}): Promise<number[]> {
  if (title.kind !== 'series') return []
  const base = title.title.replace(/\s+S\d+(-\s*S?\d+)?$/i, '').replace(/\[[^\]]*\]/g, '').trim()
  if (base.length < 2) return []
  try {
    const page = await searchTitles(base, 1, 20, args)
    const siblings = page.items.filter((item) => item.detailPath === title.detailPath || normalizeSearchKey(item.title).startsWith(normalizeSearchKey(base)))
    const seasons = new Set<number>()
    for (const sibling of siblings) {
      if (sibling.season > 0) seasons.add(sibling.season)
    }
    if (title.season > 0) seasons.add(title.season)
    return [...seasons].sort((a, b) => a - b)
  } catch {
    return []
  }
}

/* ------------------------------------------------------------- catalogue */

const pageCache = new Map<string, { at: number; page: Page<Title> }>()
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Fetch a single catalogue page for a browse surface.
 * `/movies` and `/tv-series` return a heterogeneous firehose (music videos,
 * kids content…), so `kind` filtering happens after normalisation.
 */
export async function fetchCatalogPage(kind: CatalogKind, page: number, args: FetchArgs = {}): Promise<Page<Title>> {
  const cacheKey = `${kind}:${page}`
  const cached = pageCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS && !args.signal?.aborted) {
    return cached.page
  }

  const primary = kind === 'movie' ? getMovies(page, 24, args) : getSeries(page, 24, args)
  const result = await primary
  pageCache.set(cacheKey, { at: Date.now(), page: result })
  return result
}

/** Clears the in-memory page cache (used when the user asks for fresh data). */
export function clearCatalogCache(): void {
  pageCache.clear()
}

/** Fetch several pages in sequence, stopping early once `target` matches exist. */
export async function sweepCatalog(
  kind: CatalogKind | 'trending',
  opts: {
    startPage?: number
    maxPages?: number
    target?: number
    predicate?: (title: Title) => boolean
    signal?: AbortSignal
    onPage?: (items: Title[], page: number) => void
  } = {},
): Promise<{ items: Title[]; nextPage: number; exhausted: boolean }> {
  const { startPage = 1, maxPages = APP.maxFilterSweepPages, target = 24, predicate, signal, onPage } = opts
  const collected: Title[] = []
  let page = startPage
  let exhausted = false
  let pagesFetched = 0

  while (pagesFetched < maxPages) {
    if (signal?.aborted) break
    const pageData =
      kind === 'trending' ? await getTrending(page, { signal }) : await fetchCatalogPage(kind, page, { signal })

    const kindFiltered =
      kind === 'trending'
        ? pageData.items
        : pageData.items.filter((item) => (kind === 'movie' ? item.kind === 'movie' : item.kind === 'series'))

    const matches = predicate ? kindFiltered.filter(predicate) : kindFiltered
    collected.push(...matches)
    onPage?.(matches, page)
    pagesFetched += 1

    if (!pageData.hasMore) {
      exhausted = true
      page += 1
      break
    }
    page += 1
    if (collected.length >= target) break
  }

  return { items: dedupeTitles(collected), nextPage: page, exhausted }
}

/* -------------------------------------------------------------- filtering */

export function matchesSearch(title: Title, query: string): boolean {
  const needle = normalizeSearchKey(query)
  if (!needle) return true
  const haystack = normalizeSearchKey(`${title.title} ${title.genres.join(' ')} ${title.country ?? ''}`)
  return haystack.includes(needle)
}

export function matchesFilters(title: Title, filters: CatalogFilters): boolean {
  if (filters.genres.length > 0) {
    const genres = title.genres.map((g) => g.toLowerCase())
    const hasAll = filters.genres.every((genre) => genres.includes(genre.toLowerCase()))
    if (!hasAll) return false
  }
  if (filters.year !== null && title.year !== filters.year) return false
  if (filters.country && (title.country ?? '').toLowerCase() !== filters.country.toLowerCase()) return false
  if (filters.subtitleLanguage) {
    const target = filters.subtitleLanguage.toLowerCase()
    if (!title.subtitleLanguages.some((language) => language.toLowerCase() === target)) return false
  }
  if (filters.audioLanguage) {
    const target = filters.audioLanguage.toLowerCase()
    const variant = (title.languageVariant ?? '').toLowerCase()
    if (variant !== target) return false
  }
  if (filters.minRating !== null) {
    if (title.rating === null || title.rating < filters.minRating) return false
  }
  return true
}

export function sortTitles(items: Title[], sort: SortKey): Title[] {
  const copy = [...items]
  switch (sort) {
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    case 'recent':
      return copy.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    default:
      return copy
  }
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.genres.length > 0 ||
    filters.year !== null ||
    filters.country !== null ||
    filters.subtitleLanguage !== null ||
    filters.audioLanguage !== null ||
    filters.minRating !== null
  )
}

/** Aggregate facet values from any set of titles (used by Genres / Languages). */
export function aggregateFacets(items: Title[]): {
  genres: { value: string; count: number }[]
  countries: { value: string; count: number }[]
  years: { value: number; count: number }[]
  subtitleLanguages: { value: string; count: number }[]
  audioLanguages: { value: string; count: number }[]
} {
  const genres = new Map<string, number>()
  const countries = new Map<string, number>()
  const years = new Map<number, number>()
  const subs = new Map<string, number>()
  const audio = new Map<string, number>()

  for (const item of items) {
    for (const genre of item.genres) {
      const label = genre.trim()
      if (!label) continue
      const key = label.charAt(0).toUpperCase() + label.slice(1)
      genres.set(key, (genres.get(key) ?? 0) + 1)
    }
    if (item.country) countries.set(item.country, (countries.get(item.country) ?? 0) + 1)
    if (item.year) years.set(item.year, (years.get(item.year) ?? 0) + 1)
    for (const language of item.subtitleLanguages) subs.set(language, (subs.get(language) ?? 0) + 1)
    if (item.languageVariant) audio.set(item.languageVariant, (audio.get(item.languageVariant) ?? 0) + 1)
  }

  const toSorted = (map: Map<string, number>) =>
    [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))

  return {
    genres: toSorted(genres),
    countries: toSorted(countries),
    years: [...years.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.value - a.value),
    subtitleLanguages: toSorted(subs),
    audioLanguages: toSorted(audio),
  }
}
