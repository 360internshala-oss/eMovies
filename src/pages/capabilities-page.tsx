import { CheckCircle2, CircleSlash, ShieldAlert, TriangleAlert } from 'lucide-react'
import { APP } from '@/config/app'
import { CAPABILITIES } from '@/services/capabilities'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/router/Link'

const ENDPOINTS = [
  { path: '/home', use: 'Banner collections + platform list (large payload, loaded lazily)' },
  { path: '/trending?page=', use: 'Trending rail and Trending page' },
  { path: '/movies?page=&perPage=', use: 'Movie catalogue browsing' },
  { path: '/tv-series?page=&perPage=', use: 'Series catalogue + anime (genre tag)' },
  { path: '/search?q=&page=&perPage=', use: 'Search with real pagination' },
  { path: '/detail?detailPath=', use: 'Synopsis, cast, dubs, trailer, subtitle languages' },
  { path: '/play?subjectId=&detailPath=&se=&ep=', use: 'MP4 renditions for a title or episode' },
  { path: '/caption?id=&subjectId=&detailPath=&format=MP4', use: 'Signed SRT subtitle tracks' },
  { path: '/recs?subjectId=', use: '“More like this” rail' },
  { path: '/stream?u=', use: 'Same-origin media/subtitle proxy (CORS-safe)' },
]

const statusMeta = {
  supported: { icon: CheckCircle2, className: 'text-emerald-400', label: 'Verified' },
  partial: { icon: TriangleAlert, className: 'text-[hsl(var(--gold))]', label: 'Partial' },
  unsupported: { icon: CircleSlash, className: 'text-muted-foreground', label: 'Not available' },
} as const

export function CapabilitiesPage() {
  useDocumentTitle('API capabilities')
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-20 lg:pt-24">
      <PageHeader
        eyebrow="Transparency"
        title="API capability map"
        description="Every feature in eMovies is gated on data that actually exists. This page mirrors docs/API_CAPABILITIES.md and is verified against live responses."
      />

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Upstream: <a className="text-primary hover:underline" href={APP.apiBaseUrl} target="_blank" rel="noreferrer noopener">{APP.apiBaseUrl}</a>. eMovies never
          fabricates quality levels, subtitle tracks, dubs, episodes or providers. Unsupported controls are hidden rather than mocked.
        </p>
      </div>

      <ul className="space-y-2">
        {CAPABILITIES.map((capability) => {
          const meta = statusMeta[capability.status]
          const Icon = meta.icon
          return (
            <li key={capability.id} className="rounded-xl border border-border bg-white/[0.02] p-3">
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.className}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">{capability.label}</h2>
                    <Badge variant={capability.status === 'supported' ? 'success' : capability.status === 'partial' ? 'gold' : 'muted'}>
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{capability.detail}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Endpoints consumed</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Endpoint</th>
                <th className="px-3 py-2 font-semibold">Used for</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((endpoint) => (
                <tr key={endpoint.path} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-foreground/80">{endpoint.path}</td>
                  <td className="px-3 py-2 text-muted-foreground">{endpoint.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <h2 className="text-sm font-semibold text-foreground">Known limitations</h2>
        <p>
          <span className="font-semibold text-foreground">CORS.</span> The app talks to the API directly from the browser. If a deployment
          blocks cross-origin reads, enable proxy mode (<code>VITE_USE_DEV_PROXY=true</code> plus <code>npm run proxy</code>) — a server-side
          allow-listed proxy, never a client-side CORS trick.
        </p>
        <p>
          <span className="font-semibold text-foreground">Signed URLs.</span> Stream and subtitle links expire. eMovies re-resolves streams on
          every play and re-fetches captions with the current stream id.
        </p>
        <p>
          <span className="font-semibold text-foreground">DASH.</span> The API returns a DASH manifest with HEVC renditions. This build plays
          MP4 (H.264) only, so no extra player dependency is needed — and no fake quality options are shown.
        </p>
        <p>
          <span className="font-semibold text-foreground">Pagination.</span> <code>totalCount</code> is a placeholder (1,000,000); the UI relies
          on <code>hasMore</code> instead of trusting the count.
        </p>
        <p>
          <span className="font-semibold text-foreground">Catalogue noise.</span> Catalogue endpoints mix movies, series and music/kids
          videos. eMovies filters to movies and series using <code>subjectType</code> and hides adult-flagged entries.
        </p>
        <p>
          Read the full write-up in <code>docs/API_CAPABILITIES.md</code>, or head back to the{' '}
          <Link to="/" className="text-primary hover:underline">
            home page
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
