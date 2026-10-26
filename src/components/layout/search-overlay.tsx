import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Clock, Search, X } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchTitles } from '@/services/api'
import { useRouter } from '@/router/RouterProvider'
import { titlePath } from '@/router/routes'
import { SmartImage } from '@/components/ui/smart-image'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/states'
import { readStorage, writeStorage, isStringArray } from '@/utils/storage'
import { formatRating, yearOf } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Title } from '@/services/types'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

const RECENT_KEY = 'recent-searches'

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(() => readStorage<string[]>(RECENT_KEY, [], isStringArray))
  const [activeIndex, setActiveIndex] = useState(0)
  const debounced = useDebouncedValue(query.trim(), 380)
  const inputRef = useRef<HTMLInputElement>(null)
  const { navigate } = useRouter()

  const { data, loading, error } = useAsync(
    (signal) => (debounced.length >= 2 ? searchTitles(debounced, 1, 7, { signal }) : Promise.resolve({ items: [], page: 1, hasMore: false })),
    [debounced],
  )

  const results = useMemo(() => data?.items ?? [], [data])
  const trendingFallback: Title[] = []

  useEffect(() => {
    setActiveIndex(0)
  }, [debounced])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => Math.min(current + 1, Math.max(0, results.length - 1)))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => Math.max(0, current - 1))
      }
      if (event.key === 'Enter') {
        const target = results[activeIndex]
        if (target) {
          remember(debounced)
          navigate(titlePath(target.detailPath))
          onClose()
        } else if (query.trim().length > 0) {
          remember(query.trim())
          navigate(`/search?q=${encodeURIComponent(query.trim())}`)
          onClose()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, results, activeIndex, navigate, query, debounced])

  const remember = (term: string) => {
    if (term.length < 2) return
    const next = [term, ...recent.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 8)
    setRecent(next)
    writeStorage(RECENT_KEY, next)
  }

  const submitAll = () => {
    const term = query.trim()
    if (!term) return
    remember(term)
    navigate(`/search?q=${encodeURIComponent(term)}`)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search eMovies">
      <button type="button" aria-label="Close search" onClick={onClose} className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md" />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-2xl backdrop-blur-xl animate-fade-up">
        <div className="flex items-center gap-3 border-b border-border/70 px-4">
          <Search className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies, series, anime…"
            aria-label="Search titles"
            className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
            autoComplete="off"
            spellCheck={false}
          />
          {loading ? <Spinner className="text-muted-foreground" /> : null}
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
          {debounced.length < 2 ? (
            <div className="p-2">
              {recent.length > 0 ? (
                <>
                  <div className="mb-1 flex items-center justify-between px-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recent searches</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecent([])
                        writeStorage(RECENT_KEY, [])
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                    {recent.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                      >
                        <Clock className="h-3 w-3" />
                        {term}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Type at least two characters. Search runs against the live catalogue; autocomplete suggestions are not offered by this API,
                so results appear after a short debounce.
              </p>
            </div>
          ) : error ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">Search failed. Check your connection and try again.</p>
          ) : results.length === 0 && !loading ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">No titles found for “{debounced}”.</p>
          ) : (
            <ul role="listbox" aria-label="Search results" className="space-y-1">
              {results.map((item, index) => (
                <li key={`${item.detailPath}-${index}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      remember(debounced)
                      navigate(titlePath(item.detailPath))
                      onClose()
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-2 text-left transition',
                      index === activeIndex ? 'bg-white/10' : 'hover:bg-white/5',
                    )}
                  >
                    <SmartImage src={item.poster} alt="" wrapperClassName="h-16 w-11 shrink-0 rounded-md" fallbackLabel={item.title} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        <span>{item.year ?? yearOf(item.releaseDate) ?? '—'}</span>
                        <span>· {item.kind === 'series' ? 'Series' : item.kind === 'movie' ? 'Movie' : 'Video'}</span>
                        {formatRating(item.rating) ? <span>· ★ {formatRating(item.rating)}</span> : null}
                        {item.genres[0] ? <span>· {item.genres[0]}</span> : null}
                      </span>
                    </span>
                    {item.languageVariant ? <Badge variant="muted">{item.languageVariant}</Badge> : null}
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {trendingFallback.length > 0 ? null : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="hidden sm:inline">↑↓ to navigate · Enter to open · Esc to close</span>
          <button type="button" onClick={submitAll} className="ml-auto font-semibold text-primary hover:underline">
            See all results
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
