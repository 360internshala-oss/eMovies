import { Bookmark, Clock, History, Play, Trash2 } from 'lucide-react'
import { Link } from '@/router/Link'
import { watchPath } from '@/router/routes'
import { useLibrary, type HistoryEntry, type ListEntry } from '@/store/library'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/components/layout/page-header'
import { PosterCard } from '@/components/content/poster-card'
import { ContinueWatchingCard } from '@/components/content/continue-watching-card'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { relativeTime, formatTime, progressPercent } from '@/utils/format'
import type { Title } from '@/services/types'

/** Rebuild a Title-shaped object from a stored library entry. */
function titleFromListEntry(entry: ListEntry): Title {
  return {
    id: entry.detailPath,
    detailPath: entry.detailPath,
    title: entry.title,
    kind: entry.kind,
    subjectType: entry.kind === 'series' ? 2 : 1,
    year: entry.year,
    releaseDate: null,
    rating: entry.rating,
    ratingCount: null,
    genres: [],
    country: null,
    durationSeconds: null,
    overview: '',
    poster: entry.poster,
    backdrop: entry.poster,
    blurHash: null,
    trailerUrl: null,
    subtitleLanguages: [],
    languageVariant: null,
    season: 0,
    hasResource: true,
    vipLevel: null,
  }
}

export function MyListPage() {
  useDocumentTitle('My List')
  const { state, removeFromList } = useLibrary()

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-20 lg:px-8 lg:pb-16 lg:pt-24">
      <PageHeader
        eyebrow="Your library"
        title="My List"
        description="Saved on this device. The API has no accounts, so your list never leaves your browser."
        actions={
          state.list.length > 0 ? (
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">{state.list.length} saved</span>
          ) : undefined
        }
      />

      {state.list.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-5 w-5" />}
          title="Your list is empty"
          message="Tap the bookmark on any poster or title page to keep it here for later."
          action={
            <div className="flex gap-2">
              <Link to="/movies" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                Browse movies
              </Link>
              <Link to="/series" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
                Browse series
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {state.list.map((entry) => (
            <div key={entry.detailPath} className="relative">
              <PosterCard title={titleFromListEntry(entry)} width="grid" subtitle={relativeTime(entry.addedAt) ?? undefined} />
              <button
                type="button"
                onClick={() => removeFromList(entry.detailPath)}
                aria-label={`Remove ${entry.title} from My List`}
                className="absolute -right-1 -top-1 rounded-full bg-black/80 p-1.5 text-white/70 backdrop-blur transition hover:text-destructive focus-ring"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ContinueWatchingPage() {
  useDocumentTitle('Continue watching')
  const { continueWatching, removeFromHistory } = useLibrary()

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-20 lg:px-8 lg:pb-16 lg:pt-24">
      <PageHeader
        eyebrow="Your library"
        title="Continue watching"
        description="Playback positions saved in this browser. Resume picks up exactly where you stopped."
      />

      {continueWatching.length === 0 ? (
        <EmptyState
          icon={<Play className="h-5 w-5" />}
          title="Nothing in progress"
          message="Start any title and your position will appear here — even for series episodes."
          action={
            <Link to="/" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Find something to watch
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {continueWatching.map((entry) => (
            <ContinueWatchingCard key={entry.detailPath} entry={entry} onRemove={() => removeFromHistory(entry.detailPath)} />
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryRow({ entry, onRemove }: { entry: HistoryEntry; onRemove: () => void }) {
  const percent = progressPercent(entry.position, entry.duration)
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-2.5">
      <Link
        to={watchPath(entry.detailPath, { season: entry.season, episode: entry.episode })}
        className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted focus-ring"
        aria-label={`Resume ${entry.title}`}
      >
        {entry.poster ? <img src={entry.poster} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={watchPath(entry.detailPath, { season: entry.season, episode: entry.episode })} className="block truncate text-sm font-semibold hover:text-primary">
          {entry.title}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {entry.kind === 'series' ? `S${entry.season} · E${entry.episode} · ` : ''}
          {formatTime(entry.position)}
          {entry.duration > 0 ? ` of ${formatTime(entry.duration)} (${Math.round(percent)}%)` : ''}
        </p>
        <div className="mt-1.5 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground/70">Watched {relativeTime(entry.updatedAt)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entry.title} from history`}
        className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-destructive focus-ring"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

export function HistoryPage() {
  useDocumentTitle('Watch history')
  const { state, removeFromHistory, clearHistory } = useLibrary()

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-20 lg:pt-24">
      <PageHeader
        eyebrow="Your library"
        title="Watch history"
        description="Everything you have played on this device, newest first. Stored locally — clear it any time."
        actions={
          state.history.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Clear your entire watch history on this device?')) clearHistory()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </Button>
          ) : undefined
        }
      />

      {state.history.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="No watch history yet"
          message="Playback you start will be listed here with position and timestamp."
          action={
            <Link to="/trending" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              See what's trending
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {state.history.map((entry) => (
            <HistoryRow key={entry.detailPath} entry={entry} onRemove={() => removeFromHistory(entry.detailPath)} />
          ))}
        </ul>
      )}

      <p className="mt-6 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="mt-0.5 h-3 w-3 shrink-0" /> Progress is capped at 120 entries and lives in localStorage. Clearing browser data
        removes it.
      </p>
    </div>
  )
}
