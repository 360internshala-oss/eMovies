import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  SkipForward,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Link } from '@/router/Link'
import { titlePath } from '@/router/routes'
import { APP } from '@/config/app'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/store/settings'
import { useLibrary } from '@/store/library'
import { getCaptions, getPlayback } from '@/services/api'
import { pickDefaultQuality } from '@/services/normalize'
import { describeError } from '@/services/apiClient'
import { formatRemaining, formatTime, progressPercent } from '@/utils/format'
import { cn } from '@/utils/cn'
import { useToast } from '@/components/ui/toast'
import { SeekBar } from './seek-bar'
import { AspectMenu, AudioMenu, EpisodeMenu, QualityMenu, SpeedMenu, SubtitleMenu } from './player-menus'
import { MobileSettingsSheet } from './mobile-settings-sheet'
import { probeMedia } from './media-diagnostics'
import { loadSubtitleTrack } from './subtitles'
import { revokeBlobUrl } from './srt'
import type { Quality, SubtitleTrack, TitleDetail } from '@/services/types'
import type { AspectRatio } from '@/config/app'

interface VideoPlayerProps {
  detail: TitleDetail
  season: number
  episode: number
  onEpisodeChange: (season: number, episode: number) => void
  onVariantChange: (detailPath: string, label: string) => void
  /** Returns true when the next episode exists and navigation was triggered. */
  onNextEpisode?: () => Promise<boolean>
}

const HIDE_DELAY_MS = 3200

export function VideoPlayer({ detail, season, episode, onEpisodeChange, onVariantChange, onNextEpisode }: VideoPlayerProps) {
  const { title } = detail
  const { settings, update } = useSettings()
  const { recordProgress, getProgress } = useLibrary()
  const { push } = useToast()

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | null>(null)
  const lastTap = useRef<{ time: number; x: number }>({ time: 0, x: 0 })
  const lastPersist = useRef(0)
  const mountedRef = useRef(true)

  const [qualityChoice, setQualityChoice] = useState<'auto' | number>('auto')
  const [urlIndex, setUrlIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(settings.volume)
  const [muted, setMuted] = useState(settings.muted)
  const [rate, setRate] = useState(1)
  const [waiting, setWaiting] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [pip, setPip] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)
  const [ended, setEnded] = useState(false)
  const [mediaError, setMediaError] = useState<{ message: string; detail: string | null; canRefresh: boolean } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const recoveryRef = useRef({ urls: new Set<string>(), resolutions: new Set<number>(), refreshed: false })
  const [seekFeedback, setSeekFeedback] = useState<'forward' | 'back' | null>(null)
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([])
  const [subtitleLoading, setSubtitleLoading] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleTrack | null>(null)
  const [vttUrl, setVttUrl] = useState<string | null>(null)
  const [subtitleError, setSubtitleError] = useState<string | null>(null)

  const playback = useAsync(
    (signal) => getPlayback(title.detailPath, title.id, season, episode, { signal }),
    [title.detailPath, title.id, season, episode],
  )

  const qualities = playback.data?.qualities ?? []

  const quality: Quality | null = useMemo(() => {
    if (qualities.length === 0) return null
    if (qualityChoice === 'auto') {
      const cap = typeof window !== 'undefined' && window.innerWidth < 768 ? 720 : 1080
      return pickDefaultQuality(qualities, cap)
    }
    return qualities.find((item) => item.resolution === qualityChoice) ?? qualities[0]
  }, [qualities, qualityChoice])

  const candidateUrls = useMemo(() => {
    if (!quality) return []
    const list = APP.preferDirectStreams ? [quality.url, quality.proxyUrl] : [quality.proxyUrl, quality.url]
    return list.filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
  }, [quality])

  const activeUrl = candidateUrls[urlIndex] ?? null

  const audioLabel = useMemo(() => {
    const variant = title.languageVariant
    return variant ? `${variant} audio` : 'Original audio'
  }, [title.languageVariant])

  const resumePoint = useMemo(() => {
    const entry = getProgress(title.detailPath)
    if (!entry) return 0
    if (title.kind === 'series' && (entry.season !== season || entry.episode !== episode)) return 0
    return entry.position
  }, [getProgress, title.detailPath, title.kind, season, episode])

  /* ------------------------------------------------------------ controls */

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !scrubbing) setControlsVisible(false)
    }, HIDE_DELAY_MS)
  }, [scrubbing])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => push('Playback was blocked by the browser. Tap play again.', 'error'))
    } else {
      video.pause()
    }
  }, [push])

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    const clamped = Math.max(0, Math.min(time, video.duration || time))
    try {
      video.currentTime = clamped
      setCurrentTime(clamped)
    } catch {
      /* seeking before metadata is ready */
    }
  }, [])

  const skip = useCallback(
    (delta: number) => {
      const video = videoRef.current
      if (!video) return
      seekTo(video.currentTime + delta)
      setSeekFeedback(delta > 0 ? 'forward' : 'back')
      window.setTimeout(() => setSeekFeedback(null), 550)
    },
    [seekTo],
  )

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
        if (window.innerWidth < 900) {
          try {
            await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape')
          } catch {
            /* orientation lock is best-effort */
          }
        }
      } else {
        await document.exitFullscreen()
      }
    } catch {
      push('Fullscreen is not available in this browser.', 'error')
    }
  }, [push])

  const togglePip = useCallback(async () => {
    const video = videoRef.current
    if (!video || !document.pictureInPictureEnabled) {
      push('Picture-in-picture is not supported in this browser.', 'error')
      return
    }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      push('Picture-in-picture could not be started.', 'error')
    }
  }, [push])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  /* ------------------------------------------------------------- captions */

  useEffect(() => {
    if (!quality?.id) {
      setSubtitleTracks([])
      return
    }
    const controller = new AbortController()
    setSubtitleLoading(true)
    getCaptions(quality.id, title.id, title.detailPath, quality.format === 'DASH' ? 'DASH' : 'MP4', { signal: controller.signal })
      .then((tracks) => {
        if (controller.signal.aborted) return
        setSubtitleTracks(tracks)
        setSubtitleLoading(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setSubtitleLoading(false)
      })
    return () => controller.abort()
  }, [quality?.id, quality?.format, title.id, title.detailPath])

  // Auto-select the preferred subtitle language (never pretends to be available).
  useEffect(() => {
    if (!settings.subtitleLanguage) return
    const match = subtitleTracks.find((track) => track.code === settings.subtitleLanguage)
    if (match && activeSubtitle?.code !== match.code) setActiveSubtitle(match)
  }, [subtitleTracks, settings.subtitleLanguage, activeSubtitle?.code])

  useEffect(() => {
    let revoked: string | null = null
    setSubtitleError(null)
    if (!activeSubtitle) {
      revokeBlobUrl(vttUrl)
      setVttUrl(null)
      return
    }
    const controller = new AbortController()
    loadSubtitleTrack(activeSubtitle.url, controller.signal)
      .then(({ vttUrl: url }) => {
        if (controller.signal.aborted) {
          revokeBlobUrl(url)
          return
        }
        revoked = vttUrl
        setVttUrl(url)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSubtitleError('This subtitle track could not be downloaded (it may have expired).')
          setActiveSubtitle(null)
        }
      })
    return () => {
      controller.abort()
      revokeBlobUrl(revoked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubtitle?.id])

  /* -------------------------------------------------------------- persist */

  const persist = useCallback(
    (position: number, total: number) => {
      if (!Number.isFinite(position) || position < 3) return
      recordProgress({
        detailPath: title.detailPath,
        title: title.title,
        poster: title.poster,
        backdrop: title.backdrop,
        kind: title.kind,
        season,
        episode,
        position: Math.floor(position),
        duration: Number.isFinite(total) ? Math.floor(total) : 0,
      })
    },
    [recordProgress, title, season, episode],
  )

  useEffect(() => {
    return () => {
      const video = videoRef.current
      if (video && video.currentTime > 3) persist(video.currentTime, video.duration)
    }
  }, [persist])

  /* ---------------------------------------------------------------- video */

  useEffect(() => {
    setUrlIndex(0)
    setMediaError(null)
    setEnded(false)
    recoveryRef.current = { urls: new Set(), resolutions: new Set(), refreshed: false }
    setRecovering(false)
  }, [quality?.id, season, episode])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeUrl) return
    setWaiting(true)
    video.load()
    if (qualityChoice === 'auto' || playing) {
      void video.play().catch(() => {
        /* autoplay policies — the big play button remains */
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = muted
    video.playbackRate = rate
    // Not in React's typings for <video>, but supported by browsers: the CDN
    // signs the URL, so no Referer is needed (and hot-link filters dislike it).
    video.setAttribute('referrerpolicy', 'no-referrer')
  }, [volume, muted, rate, activeUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const enter = () => setPip(true)
    const leave = () => setPip(false)
    video.addEventListener('enterpictureinpicture', enter)
    video.addEventListener('leavepictureinpicture', leave)
    return () => {
      video.removeEventListener('enterpictureinpicture', enter)
      video.removeEventListener('leavepictureinpicture', leave)
    }
  }, [activeUrl])

  const aspectClass: Record<AspectRatio, string> = {
    default: 'object-contain',
    '16:9': 'object-contain',
    '4:3': 'object-contain',
    fill: 'object-fill',
    cover: 'object-cover',
  }

  /* ---------------------------------------------------------- interactions */

  /**
   * Recovers from a failed source in three ordered steps before giving up:
   *   1. another URL for the same rendition (signed CDN ⇄ API proxy),
   *   2. a lower rendition (codec/container mismatch),
   *   3. a freshly signed /play response (expired or refused signature).
   * Then it asks the URL what actually went wrong and reports that.
   */
  const handleMediaFailure = useCallback(async () => {
    const video = videoRef.current
    if (!video || recovering) return
    const code = video.error?.code
    const recovery = recoveryRef.current
    setWaiting(false)

    // 1. alternative transport for the same rendition
    if (urlIndex + 1 < candidateUrls.length) {
      recovery.urls.add(activeUrl ?? '')
      setUrlIndex((index) => index + 1)
      return
    }

    // 2. a smaller rendition often uses a different codec profile / path
    const lower =
      qualities
        .filter((item) => item.resolution > 0 && quality && item.resolution < quality.resolution)
        .sort((a, b) => b.resolution - a.resolution)[0] ?? null
    if ((code === 3 || code === 4) && lower && !recovery.resolutions.has(lower.resolution)) {
      recovery.resolutions.add(lower.resolution)
      setQualityChoice(lower.resolution)
      setUrlIndex(0)
      return
    }

    // 3. diagnose, then refresh the signed link once if that could help
    setRecovering(true)
    setWaiting(false)
    const probe = activeUrl ? await probeMedia(activeUrl) : null
    if (probe?.refreshable && !recovery.refreshed) {
      recovery.refreshed = true
      setMediaError({
        message: 'The stream link was rejected — requesting a fresh one.',
        detail: probe.summary,
        canRefresh: true,
      })
      setRecovering(false)
      playback.reload()
      return
    }

    const fallback: Record<number, string> = {
      1: 'Playback was aborted by the browser.',
      2: 'The download was interrupted before the video could start.',
      3: 'This stream uses a codec this browser cannot decode (the API serves H.265/DASH for some titles).',
      4: 'The stream host did not return a playable video file.',
    }
    setMediaError({
      message: probe?.summary ?? fallback[code ?? 4] ?? 'The stream could not be played.',
      detail: probe ? `HTTP ${probe.status || '—'}${probe.contentType ? ` · ${probe.contentType}` : ''}` : null,
      canRefresh: Boolean(probe?.refreshable),
    })
    setRecovering(false)
  }, [activeUrl, candidateUrls.length, playback, qualities, quality, qualityChoice, recovering, urlIndex])

  const handleSurfaceClick = (event: React.MouseEvent<HTMLElement>) => {
    const now = Date.now()
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const isDouble = now - lastTap.current.time < 320 && Math.abs(x - lastTap.current.x) < 60

    if (isDouble) {
      // Double-tap/click on the left or right third seeks ±10s.
      if (x < rect.width * 0.35) skip(-10)
      else if (x > rect.width * 0.65) skip(10)
      else togglePlay()
      lastTap.current = { time: 0, x: 0 }
      return
    }
    lastTap.current = { time: now, x }
    togglePlay()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return
      const video = videoRef.current
      if (!video) return
      const key = event.key.toLowerCase()

      switch (key) {
        case ' ':
        case 'k':
          event.preventDefault()
          togglePlay()
          break
        case 'arrowright':
        case 'l':
          event.preventDefault()
          skip(10)
          break
        case 'arrowleft':
        case 'j':
          event.preventDefault()
          skip(-10)
          break
        case 'arrowup':
          event.preventDefault()
          setVolume((value) => Math.min(1, Number((value + 0.1).toFixed(2))))
          break
        case 'arrowdown':
          event.preventDefault()
          setVolume((value) => Math.max(0, Number((value - 0.1).toFixed(2))))
          break
        case 'm':
          setMuted((value) => !value)
          break
        case 'f':
          void toggleFullscreen()
          break
        case 'p':
          void togglePip()
          break
        case 'c':
          if (subtitleTracks.length > 0) {
            setActiveSubtitle((current) => (current ? null : subtitleTracks.find((track) => track.code === 'en') ?? subtitleTracks[0]))
          }
          break
        default:
          if (/^[0-9]$/.test(key) && video.duration) {
            seekTo((Number(key) / 10) * video.duration)
          }
      }
      showControls()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, skip, toggleFullscreen, togglePip, subtitleTracks, showControls, seekTo])

  /* ---------------------------------------------------------------- render */

  if (playback.loading) {
    return (
      <PlayerShell detail={detail} season={season} episode={episode}>
        <div className="flex h-full flex-col items-center justify-center gap-3 text-white/80">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Resolving the stream for this title…</p>
        </div>
      </PlayerShell>
    )
  }

  if (playback.error) {
    const info = describeError(playback.error)
    return (
      <PlayerShell detail={detail} season={season} episode={episode}>
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <TriangleAlert className="h-8 w-8 text-destructive" />
          <h2 className="text-lg font-semibold">{info.title}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{info.message}</p>
          <button type="button" onClick={playback.reload} className="mt-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            Try again
          </button>
          <Link to={titlePath(title.detailPath)} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Back to title details
          </Link>
        </div>
      </PlayerShell>
    )
  }

  if (qualities.length === 0) {
    return (
      <PlayerShell detail={detail} season={season} episode={episode}>
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <TriangleAlert className="h-8 w-8 text-[hsl(var(--gold))]" />
          <h2 className="text-lg font-semibold">No playable stream for this title</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The API returned no MP4 rendition {title.kind === 'series' ? `for S${season}E${episode}` : 'for this title'}. That usually means
            the source is unavailable, VIP-locked or still processing.
            {playback.data?.lockedCount ? ` ${playback.data.lockedCount} rendition(s) are VIP-locked upstream.` : ''}
            {playback.data?.dashUrl ? ' A DASH (H.265) manifest exists, but browsers need an MSE player for it — this build streams MP4 only.' : ''}
            {playback.data?.hlsUrl ? ' An HLS playlist exists but Safari-only HLS is not enabled here.' : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Link to={titlePath(title.detailPath)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              View title details
            </Link>
            {title.kind === 'series' ? (
              <button
                type="button"
                onClick={() => onEpisodeChange(season, Math.max(1, episode - 1))}
                className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white"
              >
                Try previous episode
              </button>
            ) : null}
          </div>
        </div>
      </PlayerShell>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative isolate w-full overflow-hidden bg-black',
        fullscreen ? 'h-screen' : 'aspect-video max-h-[88svh] rounded-none md:rounded-2xl',
      )}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
    >
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          key={activeUrl ?? 'none'}
          src={activeUrl ?? undefined}
          className={cn('h-full w-full bg-black', aspectClass[settings.aspectRatio])}
          playsInline
          preload="metadata"
          poster={title.backdrop ?? title.poster ?? undefined}
          onClick={handleSurfaceClick}
          onPlay={() => {
            setPlaying(true)
            setEnded(false)
            showControls()
          }}
          onPause={() => {
            setPlaying(false)
            setControlsVisible(true)
            const video = videoRef.current
            if (video) persist(video.currentTime, video.duration)
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget
            setDuration(video.duration || playback.data?.durationSeconds || 0)
            video.volume = volume
            video.muted = muted
            video.playbackRate = rate
            if (resumePoint > 5 && resumePoint < (video.duration || Infinity) - 20) {
              video.currentTime = resumePoint
              setCurrentTime(resumePoint)
              push(`Resumed from ${formatTime(resumePoint)}`, 'info')
            }
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget
            if (!scrubbing) setCurrentTime(video.currentTime)
            try {
              const ranges = video.buffered
              if (ranges.length > 0) setBuffered(ranges.end(ranges.length - 1))
            } catch {
              /* ignore */
            }
            if (Date.now() - lastPersist.current > 5000 && !video.paused) {
              lastPersist.current = Date.now()
              persist(video.currentTime, video.duration)
            }
          }}
          onVolumeChange={(event) => {
            setVolume(event.currentTarget.volume)
            setMuted(event.currentTarget.muted)
          }}
          onRateChange={(event) => setRate(event.currentTarget.playbackRate)}
          onEnded={() => {
            setPlaying(false)
            setControlsVisible(true)
            setEnded(true)
            const video = videoRef.current
            if (video) persist(video.duration, video.duration)
          }}
          onError={() => void handleMediaFailure()}
        >
          {vttUrl ? (
            <track
              key={vttUrl}
              kind="subtitles"
              src={vttUrl}
              srcLang={activeSubtitle?.code ?? 'en'}
              label={activeSubtitle?.label ?? 'Subtitles'}
              default
            />
          ) : null}
        </video>
      </div>

      {/* top bar */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent p-3 pb-10 transition-opacity duration-300 sm:p-4',
          controlsVisible && !mediaError ? 'opacity-100' : 'hidden',
        )}
      >
        <div className="pointer-events-auto flex min-w-0 items-start gap-2">
          <Link
            to={titlePath(title.detailPath)}
            aria-label="Back to title details"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white sm:text-base">{title.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/60">
              {title.kind === 'series' ? <span>S{String(season).padStart(2, '0')} · E{String(episode).padStart(2, '0')}</span> : null}
              {quality ? <span>· {quality.label}</span> : null}
              {quality?.codec ? <span>· {quality.codec.toUpperCase()}</span> : null}
              <span>· {audioLabel}</span>
            </p>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {title.kind === 'series' ? (
            <button
              type="button"
              onClick={() => onEpisodeChange(season, Math.max(1, episode - 1))}
              disabled={episode <= 1}
              className="player-chip"
              aria-label="Previous episode"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Prev
            </button>
          ) : null}
          {title.kind === 'series' ? (
            <button type="button" onClick={() => onEpisodeChange(season, episode + 1)} className="player-chip" aria-label="Next episode">
              Next <RotateCw className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* center state */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 flex items-center justify-center',
          mediaError && 'z-30 overflow-y-auto overscroll-contain p-2 sm:p-0',
        )}
      >
        {mediaError ? (
          <div
            role="alert"
            className="pointer-events-auto my-auto w-full max-w-md rounded-2xl border border-white/15 bg-black/85 p-3.5 text-center backdrop-blur sm:p-5"
          >
            <TriangleAlert className="mx-auto mb-2 h-7 w-7 text-destructive" />
            <h2 className="text-sm font-semibold text-white sm:text-base">Playback failed</h2>
            <p className="mt-1 text-[13px] leading-snug text-white/75 sm:text-sm">{mediaError.message}</p>
            {mediaError.detail ? <p className="mt-1 text-[11px] uppercase tracking-widest text-white/40">{mediaError.detail}</p> : null}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {mediaError.canRefresh ? (
                <button
                  type="button"
                  onClick={() => {
                    setMediaError(null)
                    recoveryRef.current = { urls: new Set(), resolutions: new Set(), refreshed: false }
                    playback.reload()
                  }}
                  className="min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-black"
                >
                  Get a fresh link
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setMediaError(null)
                  recoveryRef.current = { urls: new Set(), resolutions: new Set(), refreshed: false }
                  setUrlIndex(0)
                  videoRef.current?.load()
                  void videoRef.current?.play().catch(() => undefined)
                }}
                className={cn(
                  'min-h-10 rounded-full px-4 text-sm font-semibold',
                  mediaError.canRefresh ? 'border border-white/25 text-white' : 'bg-white text-black',
                )}
              >
                Retry
              </button>
              <Link
                to={titlePath(title.detailPath)}
                className="inline-flex min-h-10 items-center rounded-full border border-white/25 px-4 text-sm font-semibold text-white"
              >
                Details
              </Link>
            </div>
            <p className="mt-2.5 hidden text-[11px] leading-snug text-white/40 sm:block">
              Only the renditions listed by the API are used. If every one fails, the fault is in the upstream stream or CDN — not in this
              player.
            </p>
          </div>
        ) : waiting && !ended ? (
          <Loader2 className="h-10 w-10 animate-spin text-white/80" aria-label="Buffering" />
        ) : !playing && !ended ? (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-black shadow-2xl transition hover:scale-105"
          >
            <Play className="ml-1 h-7 w-7 fill-current" />
          </button>
        ) : null}

        {seekFeedback && !mediaError ? (
          <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
              {seekFeedback === 'forward' ? <RotateCw className="h-7 w-7" /> : <RotateCcw className="h-7 w-7" />}
            </div>
          </div>
        ) : null}
      </div>

      {/* ended overlay */}
      {ended ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Finished</p>
          <h2 className="max-w-lg px-6 text-center text-xl font-semibold text-white">{title.title}</h2>
          {title.kind === 'series' ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setEnded(false)
                  const started = await onNextEpisode?.()
                  if (!started) {
                    setEnded(true)
                    push('No stream was found for the next episode.', 'error')
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
              >
                <SkipForward className="h-4 w-4" /> Next episode
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnded(false)
                  seekTo(0)
                  void videoRef.current?.play()
                }}
                className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Replay
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEnded(false)
                seekTo(0)
                void videoRef.current?.play()
              }}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              Watch again
            </button>
          )}
        </div>
      ) : null}

      {/* bottom controls */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300 sm:px-4',
          mediaError ? 'hidden' : controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <SeekBar
          currentTime={currentTime}
          duration={duration || playback.data?.durationSeconds || 0}
          buffered={buffered}
          onSeek={seekTo}
          onScrub={setScrubbing}
        />

        <div className="mt-1 flex items-center gap-0.5 text-white sm:gap-1.5">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 sm:h-9 sm:w-9"
          >
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </button>

          <button
            type="button"
            onClick={() => skip(-10)}
            aria-label="Back 10 seconds"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 sm:h-9 sm:w-9"
          >
            <RotateCcw className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => skip(10)}
            aria-label="Forward 10 seconds"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 sm:h-9 sm:w-9"
          >
            <RotateCw className="h-[18px] w-[18px]" />
          </button>

          <span className="ml-0.5 select-none whitespace-nowrap text-[11px] font-medium tabular-nums text-white/80">
            {formatTime(currentTime)} <span className="text-white/40">/</span> {formatRemaining(currentTime, duration || playback.data?.durationSeconds || 0)}
          </span>

          <div className="group/volume ml-auto flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => {
                setMuted(!muted)
                update({ muted: !muted })
              }}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 sm:h-9 sm:w-9"
            >
              {muted || volume === 0 ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const next = Number(event.target.value)
                setVolume(next)
                setMuted(next === 0)
                update({ volume: next, muted: next === 0 })
              }}
              aria-label="Volume"
              className="h-1.5 w-0 cursor-pointer appearance-none rounded-full bg-white/30 transition-all duration-300 group-hover/volume:w-20 focus:w-20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          <div className="hidden items-center gap-1.5 sm:flex">
          <SpeedMenu speed={rate} onSelect={setRate} />
          <QualityMenu
            qualities={qualities}
            active={qualityChoice === 'auto' ? 'auto' : quality?.resolution ?? 'auto'}
            autoLabel={quality?.label ?? 'Auto'}
            onSelect={(value) => setQualityChoice(value)}
          />
          <SubtitleMenu tracks={subtitleTracks} activeCode={activeSubtitle?.code ?? null} loading={subtitleLoading} onSelect={setActiveSubtitle} />
          <AudioMenu
            dubs={detail.dubs}
            activeLabel={audioLabel}
            onSelect={(track) => {
              if (!track.original) onVariantChange(track.detailPath, track.label)
            }}
          />
          {title.kind === 'series' ? (
            <EpisodeMenu seasons={detail.seasons} season={season} episode={episode} hasEpisodes={detail.seasons.length > 0} onSelect={onEpisodeChange} />
          ) : null}
          <AspectMenu value={settings.aspectRatio} onSelect={(value) => update({ aspectRatio: value })} />
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Playback settings"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 sm:hidden"
          >
            <Settings2 className="h-[18px] w-[18px]" />
          </button>

          <button
            type="button"
            onClick={togglePip}
            aria-label="Picture in picture"
            aria-pressed={pip}
            className="hidden h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 sm:flex"
          >
            <PictureInPicture2 className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 sm:h-9 sm:w-9"
          >
            {fullscreen ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}
          </button>
        </div>

        {subtitleError ? <p className="mt-1 text-[11px] text-[hsl(var(--gold))]">{subtitleError}</p> : null}
        {playback.refreshing ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-white/50">
            <Gauge className="h-3 w-3" /> Refreshing stream…
          </p>
        ) : null}
      </div>

      <MobileSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        qualities={qualities}
        qualityChoice={qualityChoice}
        onQuality={(value) => {
          setQualityChoice(value)
          setSettingsOpen(false)
        }}
        speed={rate}
        onSpeed={setRate}
        tracks={subtitleTracks}
        activeSubtitle={activeSubtitle}
        subtitleLoading={subtitleLoading}
        onSubtitle={(track) => {
          setActiveSubtitle(track)
          setSettingsOpen(false)
        }}
        dubs={detail.dubs}
        audioLabel={audioLabel}
        onAudio={(track) => {
          if (!track.original) onVariantChange(track.detailPath, track.label)
        }}
        aspect={settings.aspectRatio}
        onAspect={(value) => update({ aspectRatio: value })}
        seasons={detail.seasons}
        season={season}
        episode={episode}
        onEpisode={onEpisodeChange}
      />

      <ProgressBarSeo currentTime={currentTime} duration={duration} />
    </div>
  )
}

function ProgressBarSeo({ currentTime, duration }: { currentTime: number; duration: number }) {
  const percent = progressPercent(currentTime, duration)
  return (
    <div className="sr-only" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label="Playback progress" />
  )
}

function PlayerShell({
  detail,
  season,
  episode,
  children,
}: {
  detail: TitleDetail
  season: number
  episode: number
  children: React.ReactNode
}) {
  return (
    <div className="relative flex aspect-video max-h-[88svh] w-full flex-col overflow-hidden rounded-none bg-black text-white md:rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <Link
          to={titlePath(detail.title.detailPath)}
          aria-label="Back to title details"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{detail.title.title}</p>
          {detail.title.kind === 'series' ? (
            <p className="text-[11px] text-white/50">
              Season {season} · Episode {episode}
            </p>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
