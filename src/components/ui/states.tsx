import type { ReactNode } from 'react'
import { CloudOff, Film, RefreshCw, SearchX, TriangleAlert, WifiOff } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/utils/cn'
import { describeError } from '@/services/apiClient'

export function EmptyState({
  title,
  message,
  icon,
  action,
  className,
}: {
  title: string
  message?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-white/[0.02] px-6 py-14 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon ?? <Film className="h-5 w-5" />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {message ? <p className="max-w-md text-sm text-muted-foreground">{message}</p> : null}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { title, message, retryable } = describeError(error)
  const isNetwork = title.toLowerCase().includes('unavailable') || title.toLowerCase().includes('offline')
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        {isNetwork ? <WifiOff className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && retryable ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      ) : null}
    </div>
  )
}

export function OfflineBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-destructive/15 px-4 py-2 text-xs font-medium text-destructive">
      <CloudOff className="h-3.5 w-3.5" /> You are offline — cached pages remain, new content will not load.
    </div>
  )
}

export function NoResults({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={<SearchX className="h-5 w-5" />}
      title={query ? `No matches for “${query}”` : 'No titles match these filters'}
      message="Try a different spelling, or clear a filter to widen the search. The catalogue is region-limited, so not every title is available."
      action={
        onClear ? (
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : undefined
      }
    />
  )
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex', className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </span>
  )
}
