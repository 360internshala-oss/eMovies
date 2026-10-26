import { Play, X } from 'lucide-react'
import { Link } from '@/router/Link'
import { watchPath } from '@/router/routes'
import { SmartImage } from '@/components/ui/smart-image'
import { episodeLabel, formatTime, progressPercent } from '@/utils/format'
import type { HistoryEntry } from '@/store/library'

export function ContinueWatchingCard({ entry, onRemove }: { entry: HistoryEntry; onRemove?: () => void }) {
  const percent = progressPercent(entry.position, entry.duration)
  const label = episodeLabel(entry.kind === 'series' ? entry.season : null, entry.kind === 'series' ? entry.episode : null)

  return (
    <div className="group relative w-[62vw] shrink-0 snap-start sm:w-72">
      <Link
        to={watchPath(entry.detailPath, { season: entry.season, episode: entry.episode })}
        className="block overflow-hidden rounded-xl border border-white/5 bg-card shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 focus-ring"
        aria-label={`Resume ${entry.title}${label ? ` (${label})` : ''}`}
      >
        <div className="relative">
          <SmartImage
            src={entry.backdrop ?? entry.poster}
            alt=""
            wrapperClassName="aspect-[16/9] w-full"
            fallbackLabel={entry.title}
            sizes="(max-width: 640px) 62vw, 288px"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-black">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </span>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="p-2.5">
          <p className="truncate text-sm font-semibold">{entry.title}</p>
          <p className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {label ?? `${formatTime(entry.position)} watched`}
              {entry.duration > 0 ? ` · ${Math.round(percent)}%` : ''}
            </span>
            {entry.duration > 0 ? <span>{formatTime(Math.max(0, entry.duration - entry.position))} left</span> : null}
          </p>
        </div>
      </Link>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${entry.title} from continue watching`}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white/80 opacity-0 backdrop-blur transition hover:bg-black hover:text-white group-hover:opacity-100 focus:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
