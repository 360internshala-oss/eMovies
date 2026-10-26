import { useMemo } from 'react'
import { Flame, Clock, Star, Sparkles, Play, Layers } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getHome, getMovies, getSeries, getTrending, sortTitles } from '@/services/api'
import { HeroBanner } from '@/components/content/hero-banner'
import { ContentRail } from '@/components/content/content-rail'
import { PosterCard } from '@/components/content/poster-card'
import { ContinueWatchingCard } from '@/components/content/continue-watching-card'
import { RailSkeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { Link } from '@/router/Link'
import { useLibrary } from '@/store/library'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { Title } from '@/services/types'

export function HomePage() {
  useDocumentTitle(null)
  const { continueWatching, removeFromHistory } = useLibrary()

  const trending = useAsync((signal) => getTrending(1, { signal }), [])
  const catalog = useAsync(async (signal) => {
    const [movies, series, series2] = await Promise.all([
      getMovies(1, 24, { signal }),
      getSeries(1, 24, { signal }),
      getSeries(2, 24, { signal }),
    ])
    return { movies: movies.items, series: [...series.items, ...series2.items] }
  }, [])

  // Optional extra collections come from /home (a large aggregate payload).
  const home = useAsync((signal) => getHome({ signal }), [])

  const heroItems = useMemo(() => (trending.data?.items ?? []).slice(0, 6), [trending.data])
  const heroArtwork = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const section of home.data?.sections ?? []) {
      if (section.type !== 'BANNER' || !section.images) continue
      Object.assign(map, section.images)
    }
    return map
  }, [home.data])

  const movies = useMemo(() => (catalog.data?.movies ?? []).filter((item) => item.kind === 'movie'), [catalog.data])
  const series = useMemo(() => (catalog.data?.series ?? []).filter((item) => item.kind === 'series'), [catalog.data])
  const newest = useMemo(() => sortTitles(movies, 'recent').slice(0, 18), [movies])
  const topMovies = useMemo(() => sortTitles(movies.filter((m) => (m.rating ?? 0) > 0), 'rating').slice(0, 18), [movies])
  const topSeries = useMemo(() => sortTitles(series.filter((s) => (s.rating ?? 0) > 0), 'rating').slice(0, 18), [series])
  const anime = useMemo(() => series.filter((item) => item.genres.some((g) => g.toLowerCase() === 'anime')).slice(0, 18), [series])
  const trendingItems = trending.data?.items ?? []

  const collections = useMemo(() => {
    return (home.data?.sections ?? [])
      .filter((section) => section.items.length >= 4)
      .filter((section) => section.type !== 'BANNER')
      .slice(0, 6)
  }, [home.data])

  const renderRail = (items: Title[], title: string, props: { icon?: React.ReactNode; href?: string; subtitle?: string; id: string }) => {
    if (items.length === 0) return null
    return (
      <ContentRail id={props.id} title={title} viewAllHref={props.href} subtitle={props.subtitle} icon={props.icon}>
        {items.map((item) => (
          <PosterCard key={`${item.detailPath}-${item.season}`} title={item} subtitle={item.genres.slice(0, 2).join(' · ')} />
        ))}
      </ContentRail>
    )
  }

  const loading = trending.loading || catalog.loading

  return (
    <div className="pb-16">
      {trending.loading ? (
        <div className="skeleton relative h-[78svh] min-h-[78svh] w-full">
          <div className="absolute inset-x-4 bottom-16 space-y-3 lg:px-4">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="h-12 w-2/3 max-w-lg rounded bg-white/10" />
            <div className="h-4 w-1/2 max-w-md rounded bg-white/10" />
            <div className="h-12 w-40 rounded-full bg-white/10" />
          </div>
        </div>
      ) : trending.error ? (
        <div className="mx-auto max-w-3xl px-4 pt-24">
          <ErrorState error={trending.error} onRetry={trending.reload} />
        </div>
      ) : (
        <HeroBanner items={heroItems} artwork={heroArtwork} />
      )}

      <div className="relative z-10 -mt-6 space-y-9">
        {/* Quick entries */}
        <nav aria-label="Shortcuts" className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-4 pb-1 no-scrollbar lg:px-8">
          {[
            { to: '/trending', label: 'Trending', icon: <Flame className="h-3.5 w-3.5" /> },
            { to: '/recent', label: 'Recently added', icon: <Clock className="h-3.5 w-3.5" /> },
            { to: '/top-rated', label: 'Top rated', icon: <Star className="h-3.5 w-3.5" /> },
            { to: '/anime', label: 'Anime', icon: <Sparkles className="h-3.5 w-3.5" /> },
            { to: '/genres', label: 'Genres', icon: <Layers className="h-3.5 w-3.5" /> },
            { to: '/continue-watching', label: 'Continue watching', icon: <Play className="h-3.5 w-3.5" /> },
          ].map((shortcut) => (
            <Link
              key={shortcut.to}
              to={shortcut.to}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-white/5 px-3.5 py-2 text-xs font-semibold text-foreground/80 transition hover:border-primary/50 hover:text-primary"
            >
              {shortcut.icon}
              {shortcut.label}
            </Link>
          ))}
        </nav>

        {continueWatching.length > 0 ? (
          <ContentRail id="continue" title="Continue watching" icon={<Play className="h-4 w-4 text-primary" />} viewAllHref="/continue-watching" subtitle="Resume where you left off — saved on this device">
            {continueWatching.slice(0, 10).map((entry) => (
              <ContinueWatchingCard key={entry.detailPath} entry={entry} onRemove={() => removeFromHistory(entry.detailPath)} />
            ))}
          </ContentRail>
        ) : null}

        {loading ? (
          <div className="space-y-8">
            <RailSkeleton />
            <RailSkeleton />
          </div>
        ) : catalog.error && trendingItems.length === 0 ? (
          <div className="mx-auto max-w-3xl px-4">
            <ErrorState error={catalog.error} onRetry={catalog.reload} />
          </div>
        ) : (
          <>
            {renderRail(trendingItems, 'Trending now', {
              id: 'trending',
              href: '/trending',
              icon: <Flame className="h-4 w-4 text-primary" />,
              subtitle: 'What the catalogue is serving most right now',
            })}
            {renderRail(newest, 'New on eMovies', { id: 'new', href: '/recent', icon: <Clock className="h-4 w-4 text-primary" />, subtitle: 'Latest releases in the movie catalogue' })}
            {renderRail(topMovies, 'Top rated movies', { id: 'top-movies', href: '/top-rated', icon: <Star className="h-4 w-4 text-primary" /> })}
            {renderRail(series.slice(0, 18), 'TV series', { id: 'series', href: '/series' })}
            {renderRail(topSeries, 'Binge-worthy series', { id: 'top-series', href: '/top-rated' })}
            {renderRail(anime, 'Anime', { id: 'anime', href: '/anime', icon: <Sparkles className="h-4 w-4 text-primary" /> })}
          </>
        )}

        {collections.map((section) => (
          <ContentRail key={section.id} id={`collection-${section.id}`} title={section.title} subtitle={`Upstream collection · ${section.items.length} titles`}>
            {section.items.map((item) => (
              <PosterCard key={`${section.id}-${item.detailPath}-${item.season}`} title={item} />
            ))}
          </ContentRail>
        ))}

        {home.data?.platforms?.length ? (
          <section className="mx-auto max-w-[1440px] px-4 lg:px-8" aria-labelledby="platforms-heading">
            <h2 id="platforms-heading" className="mb-2 text-base font-semibold sm:text-lg">
              Platforms the catalogue curates
            </h2>
            <p className="mb-3 max-w-2xl text-xs text-muted-foreground">
              The API publishes these provider collections, but individual titles carry no provider field — so eMovies does not pretend to
              filter by platform. Explore the directory for details.
            </p>
            <div className="flex flex-wrap gap-2">
              {home.data.platforms.map((platform) => (
                <Link
                  key={platform.name}
                  to={`/providers/${encodeURIComponent(platform.name)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/50 hover:text-primary"
                >
                  {platform.name}
                  {platform.curator ? <span className="text-[10px] font-normal text-muted-foreground">by {platform.curator}</span> : null}
                </Link>
              ))}
              <Link to="/providers" className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
                All platforms
              </Link>
            </div>
          </section>
        ) : null}

        <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-transparent to-transparent p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">Curious what this catalogue can actually do?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Episodes, live sports, provider filters and autocomplete behave differently — the capability map spells out exactly what is
                verified.
              </p>
            </div>
            <Link to="/capabilities" className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-xs font-semibold text-secondary-foreground">
              View capability map
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
