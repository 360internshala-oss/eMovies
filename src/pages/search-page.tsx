import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchTitles } from '@/services/api'
import { isAborted } from '@/services/apiClient'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRouter } from '@/router/RouterProvider'
import { PageHeader } from '@/components/layout/page-header'
import { ContentGrid } from '@/components/content/content-grid'
import { GridSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ErrorState, NoResults } from '@/components/ui/states'
import { Input } from '@/components/ui/input'
import { Link } from '@/router/Link'
import { readStorage, writeStorage, isStringArray } from '@/utils/storage'
import { pluralize } from '@/utils/format'
import type { Title } from '@/services/types'

const RECENT_KEY = 'recent-searches'

export function SearchPage() {
  const { route, navigate } = useRouter()
  const initial = route.query.get('q') ?? ''
  const [input, setInput] = useState(initial)
  const [query, setQuery] = useState(initial)
  const [recent, setRecent] = useState<string[]>(() => readStorage<string[]>(RECENT_KEY, [], isStringArray))
  const [items, setItems] = useState<Title[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<unknown>(null)
  const debounced = useDebouncedValue(input.trim(), 400)
  const firstRun = useRef(true)

  useDocumentTitle(query ? `Search: ${query}` : 'Search')

  // Keep the URL shareable without re-triggering the effect from itself.
  useEffect(() => {
    if (debounced === query) return
    setQuery(debounced)
    const params = new URLSearchParams(route.query)
    if (debounced) params.set('q', debounced)
    else params.delete('q')
    const qs = params.toString()
    navigate(`/search${qs ? `?${qs}` : ''}`, { replace: true, keepScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, loading, error, reload } = useAsync(
    (signal) => (query.length >= 2 ? searchTitles(query, 1, 24, { signal }) : Promise.resolve({ items: [], page: 1, hasMore: false })),
    [query],
  )

  useEffect(() => {
    if (!data) return
    setItems(data.items)
    setPage(1)
    setHasMore(data.hasMore)
    if (query.length >= 2 && data.items.length > 0) {
      const next = [query, ...recent.filter((term) => term.toLowerCase() !== query.toLowerCase())].slice(0, 8)
      setRecent(next)
      writeStorage(RECENT_KEY, next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setItems([])
  }, [query])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setMoreError(null)
    try {
      const next = await searchTitles(query, page + 1, 24)
      setItems((current) => {
        const seen = new Set(current.map((item) => `${item.detailPath}-${item.season}`))
        return [...current, ...next.items.filter((item) => !seen.has(`${item.detailPath}-${item.season}`))]
      })
      setPage((current) => current + 1)
      setHasMore(next.hasMore)
    } catch (loadError) {
      if (!isAborted(loadError)) setMoreError(loadError)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, page, query])

  const suggestions = useMemo(
    () => ['Action', 'Comedy', 'Anime', 'Hindi', 'Thriller', 'Romance', 'Crime', 'Drama'],
    [],
  )

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
      <PageHeader
        eyebrow="Search"
        title="Find something to watch"
        description="Live search across the whole catalogue (server-side relevance). Results are debounced and stale requests are cancelled automatically."
      />

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          setQuery(input.trim())
        }}
        className="relative mb-4 flex items-center gap-2"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search by title, e.g. Lucifer, Colony, Naruto…"
          aria-label="Search the catalogue"
          className="pl-10 pr-10"
          autoFocus
          enterKeyHint="search"
        />
        {input ? (
          <button
            type="button"
            onClick={() => {
              setInput('')
              setQuery('')
            }}
            aria-label="Clear search"
            className="absolute right-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      {recent.length > 0 && !query ? (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recent</span>
          {recent.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setInput(term)
                setQuery(term)
              }}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              {term}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setRecent([])
              writeStorage(RECENT_KEY, [])
            }}
            className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear
          </button>
        </div>
      ) : null}

      {query.length < 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setInput(suggestion)
                  setQuery(suggestion)
                }}
                className="rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <Link to="/trending" className="text-primary hover:underline">
              Trending now →
            </Link>
            <Link to="/top-rated" className="text-primary hover:underline">
              Top rated →
            </Link>
          </div>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && items.length === 0 ? (
        <GridSkeleton count={12} />
      ) : items.length === 0 ? (
        <NoResults query={query} onClear={() => setInput('')} />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {pluralize(items.length, 'result')} for “{query}”
          </p>
          <ContentGrid items={items} />
          <div className="mt-6 flex flex-col items-center gap-2">
            {moreError ? <p className="text-xs text-destructive">Could not load more results.</p> : null}
            {hasMore ? (
              <Button variant="secondary" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading
                  </>
                ) : (
                  'Load more results'
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">End of results.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
