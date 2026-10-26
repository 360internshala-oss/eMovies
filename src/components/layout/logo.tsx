import { Link } from '@/router/Link'
import { cn } from '@/utils/cn'

/** eMovies wordmark — a ticket/play glyph plus the brand name. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" aria-label="eMovies home" className={cn('group flex items-center gap-2 focus-ring rounded-lg', className)}>
      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-brand-gradient shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
          <path d="M9 7.5v9l7-4.5-7-4.5Z" fill="white" />
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="white" strokeOpacity="0.55" strokeWidth="1.4" />
        </svg>
      </span>
      {!compact ? (
        <span className="font-display text-lg font-extrabold tracking-tight">
          e<span className="bg-brand-gradient bg-clip-text text-transparent">Movies</span>
        </span>
      ) : null}
    </Link>
  )
}
