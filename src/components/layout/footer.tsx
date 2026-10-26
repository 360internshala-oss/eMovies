import { APP, DESKTOP_NAV, SECONDARY_NAV } from '@/config/app'
import { Link } from '@/router/Link'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border/60 bg-black/20 px-4 pb-nav pt-8 text-sm lg:mt-16 lg:px-8 lg:pb-10 lg:pt-10">
      <div className="mx-auto grid max-w-[1440px] gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-xl font-extrabold tracking-tight">
            e<span className="bg-brand-gradient bg-clip-text text-transparent">Movies</span>
          </p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {APP.tagline} A discovery and playback client for the public Filmy Flow API. eMovies hosts no media; all metadata,
            artwork and streams are provided by the upstream catalogue.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Streaming availability depends on the upstream API and its CDNs. Only verified features are shown.
          </p>
        </div>

        <nav aria-label="Browse">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Browse</h2>
          <ul className="space-y-0.5 sm:space-y-1.5">
            {DESKTOP_NAV.filter((item) => item.to !== '/').map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="inline-flex min-h-7 items-center text-xs text-foreground/70 transition hover:text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Library">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your library</h2>
          <ul className="space-y-0.5 sm:space-y-1.5">
            {SECONDARY_NAV.filter((item) => ['/my-list', '/continue-watching', '/history', '/settings'].includes(item.to)).map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="inline-flex min-h-7 items-center text-xs text-foreground/70 transition hover:text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="About">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">About</h2>
          <ul className="space-y-0.5 sm:space-y-1.5">
            <li>
              <Link to="/capabilities" className="inline-flex min-h-7 items-center text-xs text-foreground/70 transition hover:text-primary">
                API capabilities
              </Link>
            </li>
            <li>
              <a href={APP.apiBaseUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-7 items-center text-xs text-foreground/70 transition hover:text-primary">
                Upstream API
              </a>
            </li>
            <li>
              <a href={APP.repoUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-7 items-center text-xs text-foreground/70 transition hover:text-primary">
                Source code
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-8 max-w-[1440px] border-t border-border/50 pt-4 text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} eMovies · Built with React, Vite &amp; Tailwind CSS · Not affiliated with any streaming provider.
      </div>
    </footer>
  )
}
