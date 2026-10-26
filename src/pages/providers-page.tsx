import { useMemo } from 'react'
import { Info, Star, Tv2 } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getHome } from '@/services/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/components/layout/page-header'
import { Link } from '@/router/Link'
import { ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export function ProvidersPage() {
  useDocumentTitle('Platforms')
  const { data, loading, error, reload } = useAsync((signal) => getHome({ signal }), [])
  const platforms = data?.platforms ?? []

  const collections = useMemo(() => (data?.sections ?? []).filter((section) => section.items.length >= 4).slice(0, 4), [data])

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
      <PageHeader
        eyebrow="Browse"
        title="Platforms & providers"
        description="The catalogue publishes a curated provider list. Titles themselves carry no provider field, so eMovies shows the directory — not fake per-platform catalogues."
      />

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/5 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--gold))]" />
        <p>
          Verified limitation: <code className="rounded bg-muted px-1">/home</code> returns a <code className="rounded bg-muted px-1">platformList</code> (name + curator) but no
          subject-level platform metadata. Clicking a platform explains what is and isn't possible instead of showing an empty grid.
        </p>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : platforms.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          The platform list is unavailable right now. The catalogue itself may still be reachable.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {platforms.map((platform) => {
            const initials = platform.name.slice(0, 2).toUpperCase()
            return (
              <Link
                key={platform.name}
                to={`/providers/${encodeURIComponent(platform.name)}`}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-border bg-gradient-to-br from-white/[0.06] to-transparent p-4 transition hover:border-primary/50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-sm font-extrabold text-white shadow-glow">
                  {initials}
                </span>
                <span>
                  <span className="block text-sm font-bold">{platform.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="h-3 w-3" /> Curated by {platform.curator ?? 'the catalogue team'}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {collections.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold sm:text-lg">
            <Tv2 className="h-4 w-4 text-primary" /> Upstream collections
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            These editorial collections are the closest verified thing to a provider catalogue. Open one to browse it end to end.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {collections.map((section) => (
              <div key={section.id} className="rounded-xl border border-border bg-white/[0.03] p-3">
                <p className="text-sm font-semibold">{section.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {section.items.length} titles · {section.type}
                </p>
                <div className="mt-2 flex -space-x-2 overflow-hidden">
                  {section.items.slice(0, 6).map((item) => (
                    <Link
                      key={`${section.id}-${item.detailPath}`}
                      to={`/title/${item.detailPath}`}
                      className="h-16 w-11 shrink-0 overflow-hidden rounded-md border border-black/40 bg-muted"
                      aria-label={item.title}
                    >
                      {item.poster ? (
                        <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : null}
                    </Link>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 px-0 text-primary" onClick={() => undefined}>
                  <Link to={`/title/${section.items[0]?.detailPath ?? ''}`} className="text-xs font-semibold">
                    Open first title
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
