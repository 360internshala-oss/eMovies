import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getMovies, getSeries, aggregateFacets } from '@/services/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/components/layout/page-header'
import { Link } from '@/router/Link'
import { ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { PosterCard } from '@/components/content/poster-card'

export function GenresPage() {
  useDocumentTitle('Genres')
  const { data, loading, error, reload } = useAsync(async (signal) => {
    const [movies, series] = await Promise.all([getMovies(1, 24, { signal }), getSeries(1, 24, { signal })])
    return [...movies.items, ...series.items]
  }, [])

  const facets = useMemo(() => aggregateFacets(data ?? []), [data])
  const spotlight = useMemo(
    () => (data ?? []).filter((item) => (item.rating ?? 0) >= 7).slice(0, 12),
    [data],
  )

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
      <PageHeader
        eyebrow="Browse"
        title="Genres"
        description="Genres are aggregated from the catalogue pages loaded in this session — the API exposes no genre index, so counts reflect the sample, not the whole library."
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 20 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {facets.genres.map((genre) => (
            <Link
              key={genre.value}
              to={`/genres/${encodeURIComponent(genre.value.toLowerCase())}`}
              className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-white/[0.03] px-3.5 py-3 transition hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Layers className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="truncate text-sm font-semibold">{genre.value}</span>
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{genre.count}</span>
            </Link>
          ))}
        </div>
      )}

      {spotlight.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-base font-semibold sm:text-lg">Highly rated in this sample</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {spotlight.map((item) => (
              <PosterCard key={item.detailPath} title={item} width="grid" subtitle={item.genres.slice(0, 2).join(' · ')} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold sm:text-lg">Top countries</h2>
        <div className="flex flex-wrap gap-1.5">
          {facets.countries.slice(0, 24).map((country) => (
            <Link
              key={country.value}
              to={`/movies?country=${encodeURIComponent(country.value)}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
            >
              {country.value} <span className="text-[10px]">{country.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
