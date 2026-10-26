import { useCallback, useEffect, useRef } from 'react'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import { useCatalog, type CatalogSource } from '@/hooks/useCatalog'
import { useCatalogFilters } from '@/hooks/useCatalogFilters'
import { FilterBar } from './filter-bar'
import { ContentGrid } from './content-grid'
import { GridSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ErrorState, EmptyState, NoResults } from '@/components/ui/states'
import { PageHeader } from '@/components/layout/page-header'
import { Link } from '@/router/Link'
import { pluralize } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { CatalogFilters, SortKey, Title } from '@/services/types'

interface CatalogViewProps {
  eyebrow?: string
  heading: string
  description?: string
  source: CatalogSource
  /** Fixed predicate (e.g. anime-only or a specific genre) */
  predicate?: (title: Title) => boolean
  /** Additional fixed filters merged into the URL-driven ones */
  lockedFilters?: Partial<CatalogFilters>
  defaultSort?: SortKey
  showTypeNav?: boolean
  activeType?: 'movies' | 'series' | 'anime'
  emptyMessage?: string
}

const TYPE_LINKS = [
  { key: 'movies', label: 'Movies', to: '/movies' },
  { key: 'series', label: 'TV Series', to: '/series' },
  { key: 'anime', label: 'Anime', to: '/anime' },
] as const

export function CatalogView({
  eyebrow,
  heading,
  description,
  source,
  predicate,
  lockedFilters,
  defaultSort = 'recommended',
  showTypeNav = false,
  activeType,
  emptyMessage,
}: CatalogViewProps) {
  const { filters, setFilters, clearFilters, activeCount } = useCatalogFilters(defaultSort)

  const mergedFilters = { ...filters, ...lockedFilters }
  const catalog = useCatalog({ source, filters: mergedFilters, predicate })
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleChange = useCallback(
    (patch: Partial<CatalogFilters>) => {
      // Locked filters can't be removed from the UI.
      const next = { ...patch }
      if (lockedFilters) {
        for (const key of Object.keys(lockedFilters) as (keyof CatalogFilters)[]) {
          if (key in next) delete next[key]
        }
      }
      setFilters(next)
    },
    [setFilters, lockedFilters],
  )

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void catalog.loadMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [catalog])

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
      <PageHeader eyebrow={eyebrow} title={heading} description={description}>
        {showTypeNav ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1" role="tablist" aria-label="Catalogue type">
            {TYPE_LINKS.map((type) => (
              <Link
                key={type.key}
                to={type.to}
                role="tab"
                aria-selected={activeType === type.key}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                  activeType === type.key
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {type.label}
              </Link>
            ))}
          </div>
        ) : null}
      </PageHeader>

      <div className="mb-5 space-y-2">
        <FilterBar
          filters={mergedFilters}
          facets={catalog.facets}
          onChange={handleChange}
          onClear={clearFilters}
          activeCount={activeCount}
          showSort
        />
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <SlidersHorizontal className="mt-0.5 h-3 w-3 shrink-0" />
          The API ignores filter parameters, so filters and sorting are applied to the {pluralize(catalog.loadedCount, 'loaded title')}. Scroll
          to pull more of the catalogue into view.
        </p>
      </div>

      {catalog.error && catalog.items.length === 0 ? (
        <ErrorState error={catalog.error} onRetry={() => void catalog.reload()} />
      ) : catalog.loading && catalog.items.length === 0 ? (
        <GridSkeleton count={12} />
      ) : catalog.items.length === 0 ? (
        activeCount > 0 ? (
          <NoResults onClear={clearFilters} />
        ) : (
          <EmptyState title="Nothing here yet" message={emptyMessage ?? 'This surface returned no titles. Try again in a moment.'} />
        )
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {pluralize(catalog.items.length, 'title')}
              {catalog.exhausted ? ' · end of catalogue reached' : ''}
            </span>
            {catalog.error ? <span className="text-destructive">Last update failed — showing cached results</span> : null}
          </div>

          <ContentGrid items={catalog.items} />

          <div ref={sentinelRef} className="h-10" aria-hidden="true" />

          <div className="mt-4 flex flex-col items-center gap-2">
            {catalog.loadingMore ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading more titles…
              </span>
            ) : catalog.exhausted ? (
              <p className="text-xs text-muted-foreground">You have reached the end of the available catalogue.</p>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => void catalog.loadMore()}>
                Load more
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
