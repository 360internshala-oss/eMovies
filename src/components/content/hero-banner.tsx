import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bookmark, ChevronLeft, ChevronRight, Info, Play, Star } from 'lucide-react'
import { Link } from '@/router/Link'
import { titlePath, watchPath } from '@/router/routes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SmartImage } from '@/components/ui/smart-image'
import { useLibrary } from '@/store/library'
import { useSettings } from '@/store/settings'
import { cn } from '@/utils/cn'
import { formatRating, formatRuntime, truncate } from '@/utils/format'
import type { Title } from '@/services/types'

interface HeroBannerProps {
  items: Title[]
  /** Optional map of 16:9 artwork keyed by detailPath (from /home banners) */
  artwork?: Record<string, string | null>
}

export function HeroBanner({ items, artwork }: HeroBannerProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const { isInList, toggleList } = useLibrary()
  const { settings } = useSettings()

  const slides = useMemo(() => items.slice(0, 6), [items])
  const active = slides[index]

  const go = useCallback(
    (direction: 1 | -1) => {
      setIndex((current) => (current + direction + slides.length) % slides.length)
    },
    [slides.length],
  )

  useEffect(() => {
    setIndex(0)
  }, [items])

  useEffect(() => {
    if (paused || settings.reduceMotion || slides.length < 2) return
    const timer = window.setTimeout(() => go(1), 9000)
    return () => window.clearTimeout(timer)
  }, [index, paused, go, slides.length, settings.reduceMotion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (!active) return null

  const rating = formatRating(active.rating)
  const runtime = formatRuntime(active.durationSeconds)
  const saved = isInList(active.detailPath)

  return (
    <section
      aria-label="Featured titles"
      className="relative isolate min-h-[64svh] w-full overflow-hidden sm:min-h-[70svh] lg:min-h-[76svh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        {slides.map((slide, slideIndex) => {
          const src = artwork?.[slide.detailPath] ?? slide.backdrop ?? slide.poster
          return (
            <div
              key={`${slide.detailPath}-${slide.season}`}
              className={cn(
                'absolute inset-0 transition-opacity duration-700',
                slideIndex === index ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden={slideIndex !== index}
            >
              <SmartImage
                src={src}
                alt=""
                wrapperClassName="h-full w-full"
                className="scale-105 object-cover"
                priority={slideIndex === 0}
                sizes="100vw"
                fallbackLabel={slide.title}
              />
            </div>
          )
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-4 pb-8 pt-24 sm:pb-16 sm:pt-28 lg:px-8 lg:pb-20">
        <div key={active.detailPath} className="max-w-2xl animate-fade-up">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="primary" className="uppercase tracking-widest">
              {active.kind === 'series' ? 'Series' : active.kind === 'movie' ? 'Film' : 'Featured'}
            </Badge>
            {active.languageVariant ? <Badge>{active.languageVariant}</Badge> : null}
            {active.vipLevel ? <Badge variant="gold">VIP {active.vipLevel}</Badge> : null}
          </div>

          <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.08] tracking-tight text-balance sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            {active.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
            {rating ? (
              <span className="flex items-center gap-1 text-foreground">
                <Star className="h-3.5 w-3.5 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
                {rating}
              </span>
            ) : null}
            {active.year ? <span>{active.year}</span> : null}
            {runtime ? <span>{runtime}</span> : null}
            {active.country ? <span>{active.country}</span> : null}
            {active.subtitleLanguages.length > 0 ? (
              <span className="text-foreground/70">{active.subtitleLanguages.length} subtitle languages</span>
            ) : null}
          </div>

          <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {active.genres.slice(0, 4).map((genre) => (
              <Link
                key={genre}
                to={`/genres/${encodeURIComponent(genre.toLowerCase())}`}
                className="inline-flex min-h-7 items-center rounded-full border border-border/80 px-2.5 transition hover:border-primary/60 hover:text-primary"
              >
                {genre}
              </Link>
            ))}
          </p>

          {active.overview ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80 sm:text-[15px]">
              {truncate(active.overview, 200)}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No synopsis is provided for this title by the catalogue API.</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-2.5">
            <Link
              to={watchPath(active.detailPath)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black shadow-xl transition hover:bg-white/90 focus-ring sm:flex-none"
            >
              <Play className="h-4 w-4 fill-current" /> Play now
            </Link>
            <Link
              to={titlePath(active.detailPath)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus-ring sm:flex-none"
            >
              <Info className="h-4 w-4" /> More info
            </Link>
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label={saved ? `Remove ${active.title} from My List` : `Add ${active.title} to My List`}
              aria-pressed={saved}
              onClick={() => toggleList(active)}
              className="rounded-full"
            >
              <Bookmark className={cn('h-4 w-4', saved && 'fill-current text-primary')} />
            </Button>
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous featured title"
              onClick={() => go(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur transition hover:text-white focus-ring sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Featured title slides">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.detailPath}
                  role="tab"
                  aria-selected={slideIndex === index}
                  aria-label={`Show ${slide.title}`}
                  onClick={() => setIndex(slideIndex)}
                  className="group flex h-9 min-w-8 items-center justify-center rounded-full px-1 focus-ring"
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-all',
                      slideIndex === index ? 'w-7 bg-primary' : 'w-1.5 bg-white/30 group-hover:bg-white/60',
                    )}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Next featured title"
              onClick={() => go(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur transition hover:text-white focus-ring sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
