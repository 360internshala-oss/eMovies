import { Link } from '@/router/Link'
import { titlePath, watchPath } from '@/router/routes'
import { Play, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SmartImage } from '@/components/ui/smart-image'
import { formatRating } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Title } from '@/services/types'

interface PosterCardProps {
  title: Title
  className?: string
  priority?: boolean
  /** 0–100 resume bar */
  progress?: number
  width?: 'rail' | 'grid'
  subtitle?: string
}

export function PosterCard({ title, className, priority = false, progress, width = 'rail', subtitle }: PosterCardProps) {
  const rating = formatRating(title.rating)
  const href = titlePath(title.detailPath)

  return (
    <div className={cn('group relative', width === 'rail' && 'w-[42vw] shrink-0 snap-start sm:w-40 md:w-44 lg:w-48', className)}>
      <Link
        to={href}
        aria-label={`${title.title}${title.year ? ` (${title.year})` : ''} — view details`}
        className="block focus-ring rounded-xl"
      >
        <div className="relative overflow-hidden rounded-xl border border-white/5 bg-muted shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-glow">
          <SmartImage
            src={title.poster}
            alt={`${title.title} poster`}
            wrapperClassName="aspect-[2/3] w-full"
            fallbackLabel={title.title}
            priority={priority}
            sizes="(max-width: 640px) 42vw, 200px"
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-1.5">
            {rating ? (
              <Badge variant="default" className="gap-0.5">
                <Star className="h-2.5 w-2.5 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
                {rating}
              </Badge>
            ) : (
              <span />
            )}
            {title.vipLevel ? <Badge variant="gold">VIP</Badge> : null}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-2 pt-8">
            <div className="flex items-end justify-between gap-1">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold leading-tight text-white/90">
                  {title.year ?? '—'}
                  {title.kind === 'series' ? ' · Series' : title.kind === 'movie' ? ' · Movie' : ''}
                </p>
                {title.languageVariant ? (
                  <p className="truncate text-[10px] font-medium text-white/55">{title.languageVariant}</p>
                ) : null}
              </div>
            </div>
            {typeof progress === 'number' ? (
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
              </div>
            ) : null}
          </div>

          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-glow">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
        </div>

        <div className="mt-2 px-0.5">
          <h3 className="clamp-2 text-[13px] font-semibold leading-snug text-foreground/95 group-hover:text-primary">{title.title}</h3>
          {subtitle ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
        </div>
      </Link>

      {/* Explicit play affordance (keyboard + touch friendly) */}
      <Link
        to={watchPath(title.detailPath)}
        aria-label={`Play ${title.title}`}
        className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/70 p-2 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 focus:opacity-100 md:block"
        tabIndex={-1}
      >
        <Play className="h-4 w-4 fill-current" />
      </Link>
    </div>
  )
}
