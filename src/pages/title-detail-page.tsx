import { useMemo } from 'react'
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  Languages,
  Play,
  Share2,
  Star,
  Subtitles,
  Tv2,
} from 'lucide-react'
import { Link } from '@/router/Link'
import { titlePath, watchPath } from '@/router/routes'
import { useRoute, useRouter } from '@/router/RouterProvider'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { discoverSeasons, getDetail, getRecommendations } from '@/services/api'
import { useLibrary } from '@/store/library'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SmartImage } from '@/components/ui/smart-image'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { ContentRail } from '@/components/content/content-rail'
import { PosterCard } from '@/components/content/poster-card'
import { formatCount, formatDate, formatRating, formatRuntime, progressPercent, truncate } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { CastMember } from '@/services/types'

export function TitleDetailPage() {
  const route = useRoute()
  const { navigate } = useRouter()
  const detailPath = route.params.detailPath ?? ''
  const { isInList, toggleList, getProgress } = useLibrary()
  const { push } = useToast()

  const detail = useAsync((signal) => getDetail(detailPath, { signal }), [detailPath])
  const title = detail.data?.title

  useDocumentTitle(title?.title ?? null)

  const seasons = useAsync(
    (signal) => (title ? discoverSeasons(title, { signal }) : Promise.resolve([])),
    [title?.detailPath, title?.season],
    { enabled: Boolean(title) },
  )

  const recs = useAsync(
    (signal) => (title ? getRecommendations(title.id, { signal }) : Promise.resolve([])),
    [title?.id],
    { enabled: Boolean(title) },
  )

  const progress = title ? getProgress(title.detailPath) : undefined
  const resume = useMemo(() => {
    if (!title) return { season: 0, episode: 0 }
    if (title.kind !== 'series') return { season: 0, episode: 0 }
    if (progress) return { season: progress.season || 1, episode: progress.episode || 1 }
    return { season: 1, episode: 1 }
  }, [title, progress])

  const cast = detail.data?.cast ?? []
  const castMembers = cast.filter((member) => member.department === 'cast')
  const directors = cast.filter((member) => member.department === 'director')
  const writers = cast.filter((member) => member.department === 'writer')
  const audioDubs = (detail.data?.dubs ?? []).filter((dub) => dub.kind === 'audio' && !dub.original)

  const share = async () => {
    const url = `${window.location.origin}${titlePath(detailPath)}`
    try {
      if (navigator.share) await navigator.share({ title: title?.title ?? 'eMovies', url })
      else {
        await navigator.clipboard.writeText(url)
        push('Link copied to clipboard', 'success')
      }
    } catch {
      push('Copy failed — you can copy the address bar URL.', 'error')
    }
  }

  if (detail.loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
        <Skeleton className="h-[42svh] w-full rounded-2xl" />
        <div className="mt-4 flex gap-6">
          <Skeleton className="hidden h-60 w-40 shrink-0 rounded-xl sm:block" />
          <div className="w-full space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-48 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (detail.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-24">
        <ErrorState error={detail.error} onRetry={detail.reload} />
      </div>
    )
  }

  if (!title) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-24">
        <EmptyState
          title="Title not found"
          message="The catalogue returned no metadata for this title. It may have been removed or the identifier is wrong."
          action={
            <Link to="/" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Back to home
            </Link>
          }
        />
      </div>
    )
  }

  const saved = isInList(title.detailPath)
  const rating = formatRating(title.rating)
  const runtime = formatRuntime(title.durationSeconds)
  const availableSeasons = seasons.data && seasons.data.length > 0 ? seasons.data : title.season > 0 ? [title.season] : []

  const castBlock = (label: string, members: CastMember[]) =>
    members.length > 0 ? (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</h3>
        <div className="rail gap-3 px-0">
          {members.map((member) => (
            <div key={`${member.id}-${member.role ?? label}`} className="w-24 shrink-0 text-center">
              <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-border bg-muted">
                {member.avatar ? (
                  <img src={member.avatar} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">
                    {member.name.slice(0, 1)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 clamp-2 text-[11px] font-semibold leading-tight">{member.name}</p>
              {member.role ? <p className="clamp-2 text-[10px] text-muted-foreground">{member.role}</p> : null}
            </div>
          ))}
        </div>
      </div>
    ) : null

  return (
    <article className="pb-16">
      {/* backdrop */}
      <div className="relative h-[46svh] min-h-[300px] w-full overflow-hidden sm:h-[52svh]">
        <SmartImage src={title.backdrop ?? title.poster} alt="" wrapperClassName="h-full w-full" className="object-cover" priority fallbackLabel={title.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <Link
          to="/"
          className="absolute left-4 top-20 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/70 lg:left-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      </div>

      <div className="relative z-10 mx-auto -mt-28 max-w-[1440px] px-4 lg:-mt-32 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
          <div className="mx-auto w-36 shrink-0 sm:mx-0 sm:w-44 lg:w-52">
            <SmartImage
              src={title.poster}
              alt={`${title.title} poster`}
              wrapperClassName="aspect-[2/3] w-full rounded-xl border border-white/10 shadow-2xl"
              fallbackLabel={title.title}
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="primary">{title.kind === 'series' ? 'TV Series' : title.kind === 'movie' ? 'Movie' : 'Video'}</Badge>
              {title.languageVariant ? <Badge>{title.languageVariant}</Badge> : null}
              {title.vipLevel ? <Badge variant="gold">VIP {title.vipLevel}</Badge> : null}
              {!title.hasResource ? <Badge variant="muted">No stream advertised</Badge> : null}
            </div>

            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">{title.title}</h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
              {rating ? (
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
                  {rating}
                  {title.ratingCount ? <span className="font-normal text-muted-foreground">({formatCount(title.ratingCount)})</span> : null}
                </span>
              ) : (
                <span>No rating published</span>
              )}
              {title.year ? <span>{title.year}</span> : null}
              {runtime ? <span>{runtime}</span> : null}
              {title.country ? (
                <span className="flex items-center gap-1">
                  <Globe2 className="h-3.5 w-3.5" /> {title.country}
                </span>
              ) : null}
            </div>

            {title.genres.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {title.genres.map((genre) => (
                  <Link
                    key={genre}
                    to={`/genres/${encodeURIComponent(genre.toLowerCase())}`}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                to={watchPath(title.detailPath, resume)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition hover:bg-white/90 focus-ring"
              >
                <Play className="h-4 w-4 fill-current" />
                {progress && progress.position > 5 ? `Resume ${formatRuntime(progress.position) ?? ''}`.trim() : 'Play'}
              </Link>
              {title.trailerUrl ? (
                <a
                  href={title.trailerUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
                >
                  Trailer
                </a>
              ) : null}
              <Button
                variant="secondary"
                size="md"
                onClick={() => toggleList(title)}
                aria-pressed={saved}
                className="h-11"
              >
                {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {saved ? 'In My List' : 'My List'}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void share()} aria-label="Share this title" className="h-11 w-11 rounded-full border border-border">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {progress && progress.position > 5 && title.kind === 'series' ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Last watched S{progress.season}E{progress.episode} · {Math.round(progressPercent(progress.position, progress.duration))}% complete
              </p>
            ) : null}
          </div>
        </div>

        {/* overview + facts */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Synopsis</h2>
            {detail.data?.overview ? (
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">{detail.data.overview}</p>
            ) : (
              <p className="max-w-3xl rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                This title ships without a synopsis in the upstream metadata. eMovies does not invent plot summaries.
              </p>
            )}

            {availableSeasons.length > 0 ? (
              <section className="mt-6">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  <Tv2 className="h-3.5 w-3.5" /> Seasons
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {availableSeasons.map((season) => (
                    <button
                      key={season}
                      type="button"
                      onClick={() => navigate(watchPath(title.detailPath, { season, episode: 1 }))}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                        progress?.season === season ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/50',
                      )}
                    >
                      Season {season}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Season numbers come from sibling catalogue entries. Episode lists aren't published by the API — pick an episode inside the
                  player and eMovies verifies the stream before playing.
                </p>
              </section>
            ) : title.kind === 'series' ? (
              <p className="mt-6 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                The catalogue does not list seasons for this series. Playback starts at S01E01 and episode availability is verified on demand.
              </p>
            ) : null}

            {castMembers.length > 0 || directors.length > 0 || writers.length > 0 ? (
              <section className="mt-8 space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cast &amp; crew</h2>
                {castBlock('Cast', castMembers.slice(0, 20))}
                {castBlock('Directors', directors.slice(0, 10))}
                {castBlock('Writers', writers.slice(0, 10))}
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
              <h2 className="mb-2 text-sm font-semibold">Details</h2>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Released</dt>
                  <dd className="flex items-center gap-1 text-right font-medium">
                    <CalendarDays className="h-3 w-3" /> {formatDate(title.releaseDate) ?? title.year ?? 'Unknown'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Runtime</dt>
                  <dd className="flex items-center gap-1 font-medium">
                    <Clock3 className="h-3 w-3" /> {runtime ?? (title.kind === 'series' ? 'Per episode' : 'Not published')}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Country</dt>
                  <dd className="font-medium">{title.country ?? 'Unknown'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Catalogue ID</dt>
                  <dd className="max-w-[55%] truncate font-mono text-[10px] text-muted-foreground" title={title.id}>
                    {title.id}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Languages className="h-3.5 w-3.5" /> Audio &amp; subtitles
              </h2>
              {audioDubs.length > 0 ? (
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Audio variants</p>
                  <div className="flex flex-wrap gap-1.5">
                    {audioDubs.map((dub) => (
                      <Link
                        key={dub.detailPath}
                        to={titlePath(dub.detailPath)}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium transition hover:border-primary/60 hover:text-primary"
                      >
                        {dub.label} {dub.code ? <span className="text-muted-foreground">({dub.code})</span> : null}
                      </Link>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                    Each dub is a separate catalogue entry with its own stream, so switching is real, verified playback.
                  </p>
                </div>
              ) : (
                <p className="mb-3 text-[11px] text-muted-foreground">No dubbed audio variants are published for this title.</p>
              )}

              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Subtitles className="h-3 w-3" /> Subtitle languages
              </p>
              {title.subtitleLanguages.length > 0 ? (
                <>
                  <p className="text-[11px] leading-relaxed text-foreground/80">
                    {title.subtitleLanguages.slice(0, 18).join(' · ')}
                    {title.subtitleLanguages.length > 18 ? ` +${title.subtitleLanguages.length - 18} more` : ''}
                  </p>
                  <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                    Advertised by the catalogue; exact tracks are confirmed by the caption endpoint once playback starts.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No subtitle languages are advertised. The player still queries the caption endpoint and will list any real tracks.
                </p>
              )}
            </div>

            {detail.data && detail.data.dubs.some((dub) => dub.kind === 'subtitle') ? (
              <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <h2 className="mb-2 text-sm font-semibold">Subtitle-only variants</h2>
                <div className="flex flex-wrap gap-1.5">
                  {detail.data.dubs
                    .filter((dub) => dub.kind === 'subtitle')
                    .map((dub) => (
                      <Link
                        key={dub.detailPath}
                        to={titlePath(dub.detailPath)}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium transition hover:border-primary/60 hover:text-primary"
                      >
                        {dub.label}
                      </Link>
                    ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
              <h2 className="mb-1 text-sm font-semibold">Verified playback</h2>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Streams are resolved through the API's <code className="rounded bg-muted px-1">/play</code> endpoint. Only real MP4 renditions
                (typically 360p–1080p) are offered, with subtitle tracks fetched from{' '}
                <code className="rounded bg-muted px-1">/caption</code>.
              </p>
            </div>
          </aside>
        </div>

        {recs.data && recs.data.length > 0 ? (
          <div className="mt-10">
            <ContentRail id="more-like-this" title="More like this" subtitle="Recommendations from the catalogue">
              {recs.data.map((item) => (
                <PosterCard key={`${item.detailPath}-${item.season}`} title={item} />
              ))}
            </ContentRail>
          </div>
        ) : null}

        {detail.data?.overview && detail.data.overview.length > 600 ? <p className="sr-only">{truncate(detail.data.overview, 2000)}</p> : null}
      </div>
    </article>
  )
}
