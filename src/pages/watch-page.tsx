import { useCallback, useMemo } from 'react'
import { ArrowLeft, Info, ListVideo, Star } from 'lucide-react'
import { Link } from '@/router/Link'
import { titlePath, watchPath } from '@/router/routes'
import { useRoute, useRouter } from '@/router/RouterProvider'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getDetail, getPlayback } from '@/services/api'
import { VideoPlayer } from '@/features/player/video-player'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, EmptyState } from '@/components/ui/states'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { formatRating, formatRuntime } from '@/utils/format'
import { useLibrary } from '@/store/library'

export function WatchPage() {
  const route = useRoute()
  const { navigate } = useRouter()
  const { push } = useToast()
  const { state } = useLibrary()

  const detailPath = route.params.detailPath ?? ''
  const seasonParam = Number.parseInt(route.query.get('se') ?? '', 10)
  const episodeParam = Number.parseInt(route.query.get('ep') ?? '', 10)

  const detail = useAsync((signal) => getDetail(detailPath, { signal }), [detailPath])
  const title = detail.data?.title

  const resume = state.history.find((entry) => entry.detailPath === detailPath)
  const season = Number.isFinite(seasonParam) && seasonParam > 0 ? seasonParam : resume?.season || (title?.kind === 'series' ? 1 : 0)
  const episode = Number.isFinite(episodeParam) && episodeParam > 0 ? episodeParam : resume?.episode || (title?.kind === 'series' ? 1 : 0)

  useDocumentTitle(title ? `${title.title}${title.kind === 'series' ? ` S${season}E${episode}` : ''}` : 'Watch')

  const changeEpisode = useCallback(
    (nextSeason: number, nextEpisode: number) => {
      navigate(watchPath(detailPath, { season: nextSeason, episode: Math.max(1, nextEpisode) }))
    },
    [detailPath, navigate],
  )

  const nextEpisode = useCallback(async () => {
    if (!title || title.kind !== 'series') return false
    const candidateSeason = season || 1
    const candidateEpisode = episode + 1
    try {
      const source = await getPlayback(title.detailPath, title.id, candidateSeason, candidateEpisode)
      if (source.qualities.length === 0) return false
      navigate(watchPath(title.detailPath, { season: candidateSeason, episode: candidateEpisode }), { replace: true })
      return true
    } catch {
      return false
    }
  }, [title, season, episode, navigate])

  const meta = useMemo(() => {
    if (!title) return null
    const rating = formatRating(title.rating)
    const runtime = formatRuntime(title.durationSeconds)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {rating ? (
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Star className="h-3 w-3 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" /> {rating}
          </span>
        ) : null}
        {title.year ? <span>{title.year}</span> : null}
        {runtime ? <span>{runtime}</span> : null}
        {title.kind === 'series' ? (
          <span>
            S{String(season).padStart(2, '0')} · E{String(episode).padStart(2, '0')}
          </span>
        ) : null}
        {title.country ? <span>{title.country}</span> : null}
      </div>
    )
  }, [title, season, episode])

  if (detail.loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 lg:px-8 lg:pt-24">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="mt-4 h-8 w-1/2" />
        <Skeleton className="mt-2 h-4 w-1/3" />
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

  if (!detail.data || !title) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-24">
        <EmptyState
          title="Nothing to play"
          message="This title's metadata could not be loaded, so playback cannot start."
          action={
            <Link to="/" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Back to home
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-0 pb-24 pt-16 md:px-4 md:pt-20 lg:px-8 lg:pt-24">
      <div className="mb-2 hidden items-center gap-2 px-4 md:flex">
        <Link
          to={titlePath(detailPath)}
          className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to details
        </Link>
      </div>

      <VideoPlayer
        detail={detail.data}
        season={title.kind === 'series' ? season || 1 : 0}
        episode={title.kind === 'series' ? episode || 1 : 0}
        onEpisodeChange={changeEpisode}
        onVariantChange={(variantPath, label) => {
          push(`Switching to ${label} audio…`, 'info')
          navigate(watchPath(variantPath, { season, episode }))
        }}
        onNextEpisode={nextEpisode}
      />

      <div className="mt-4 px-4 md:px-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="primary">{title.kind === 'series' ? 'TV Series' : title.kind === 'movie' ? 'Movie' : 'Video'}</Badge>
              {title.languageVariant ? <Badge>{title.languageVariant} audio</Badge> : null}
              {title.vipLevel ? <Badge variant="gold">VIP {title.vipLevel}</Badge> : null}
            </div>
            <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
              {title.title}
              {title.kind === 'series' ? (
                <span className="ml-2 text-sm font-semibold text-muted-foreground">
                  S{String(season).padStart(2, '0')}E{String(episode).padStart(2, '0')}
                </span>
              ) : null}
            </h1>
            <div className="mt-1.5">{meta}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={titlePath(detailPath)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-semibold transition hover:border-primary/50 hover:text-primary"
            >
              <Info className="h-3.5 w-3.5" /> Details
            </Link>
            {title.kind === 'series' ? (
              <button
                type="button"
                onClick={() => changeEpisode(season || 1, (episode || 1) + 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-semibold transition hover:border-primary/50 hover:text-primary"
              >
                <ListVideo className="h-3.5 w-3.5" /> Next episode
              </button>
            ) : null}
          </div>
        </div>

        {detail.data.overview ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/80">{detail.data.overview}</p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No synopsis is published for this title.</p>
        )}

        <div className="mt-4 grid gap-2 rounded-xl border border-border bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-semibold text-foreground">Keyboard:</span> Space/K play · ←/→ 10s · ↑/↓ volume · M mute · F fullscreen · P
            picture-in-picture · C subtitles · 0–9 jump
          </p>
          <p>
            <span className="font-semibold text-foreground">Mobile:</span> tap to toggle controls, double-tap the left/right edge to seek 10s.
            Progress is saved on this device automatically.
          </p>
        </div>

        {title.kind === 'series' ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Episode availability is verified against the API before playback. The catalogue does not publish episode lists, so eMovies never
            shows invented episode titles.
          </p>
        ) : null}
      </div>
    </div>
  )
}
