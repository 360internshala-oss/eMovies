import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-5 space-y-2', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p> : null}
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  )
}
