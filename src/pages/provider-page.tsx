import { ArrowLeft, Info } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getHome } from '@/services/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRoute } from '@/router/RouterProvider'
import { PageHeader } from '@/components/layout/page-header'
import { Link } from '@/router/Link'
import { ErrorState, EmptyState } from '@/components/ui/states'
import { CAPABILITIES } from '@/services/capabilities'
import { PosterCard } from '@/components/content/poster-card'

export function ProviderPage() {
  const route = useRoute()
  const name = decodeURIComponent(route.params.provider ?? '')
  useDocumentTitle(name)

  const { data, loading, error, reload } = useAsync((signal) => getHome({ signal }), [])
  const platform = data?.platforms.find((item) => item.name.toLowerCase() === name.toLowerCase())
  const capability = CAPABILITIES.find((item) => item.id === 'providers')

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
      <Link to="/providers" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All platforms
      </Link>

      <PageHeader
        eyebrow="Platform"
        title={platform?.name ?? name}
        description={
          platform?.curator
            ? `Curated for eMovies by ${platform.curator} in the upstream catalogue.`
            : 'This platform is listed by the upstream catalogue.'
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <div className="h-32 rounded-2xl skeleton" />
      ) : !platform ? (
        <EmptyState
          title="Platform not listed"
          message="The upstream platform list no longer includes this provider. It may have been renamed or drop-off the curated list."
        />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-base font-extrabold text-white shadow-glow">
                {platform.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Provider-scoped browsing isn't exposed by this API</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {capability?.detail} Instead of an empty grid, here are honest alternatives: browse the full catalogue, or open the
                  editorial collections on the platform directory.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/movies" className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black">
                    Browse movies
                  </Link>
                  <Link to="/series" className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                    Browse series
                  </Link>
                  <Link to="/providers" className="rounded-full border border-dashed border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
                    Upstream collections
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--gold))]" />
            <p>
              eMovies is not affiliated with {platform.name}. Artwork and availability are controlled by the upstream catalogue and may include
              titles from other distributors.
            </p>
          </div>

          {data?.sections.length ? (
            <section className="mt-8">
              <h2 className="mb-3 text-base font-semibold">While you're here</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {data.sections.flatMap((section) => section.items).slice(0, 12).map((item) => (
                  <PosterCard key={`${item.detailPath}-${item.season}`} title={item} width="grid" subtitle={item.genres.slice(0, 2).join(' · ')} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
