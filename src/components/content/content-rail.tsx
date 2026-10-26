import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@/router/Link'
import { cn } from '@/utils/cn'

interface ContentRailProps {
  title: string
  children: ReactNode
  viewAllHref?: string
  subtitle?: string
  icon?: ReactNode
  id?: string
  className?: string
}

export function ContentRail({ title, children, viewAllHref, subtitle, icon, id, className }: ContentRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const update = useCallback(() => {
    const node = scrollerRef.current
    if (!node) return
    setCanScrollLeft(node.scrollLeft > 8)
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 8)
  }, [])

  useEffect(() => {
    update()
    const node = scrollerRef.current
    if (!node) return
    node.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => {
      node.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [update, children])

  const scrollBy = (direction: 1 | -1) => {
    const node = scrollerRef.current
    if (!node) return
    node.scrollBy({ left: direction * Math.min(node.clientWidth * 0.9, 900), behavior: 'smooth' })
  }

  return (
    <section className={cn('group/rail relative', className)} aria-labelledby={id ? `${id}-heading` : undefined}>
      <div className="mb-2.5 flex items-end justify-between gap-3 px-4 lg:px-8">
        <div className="min-w-0">
          <h2 id={id ? `${id}-heading` : undefined} className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
            {icon}
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-1">
          {viewAllHref ? (
            <Link
              to={viewAllHref}
              className="mr-1 hidden rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:text-primary focus-ring sm:block"
            >
              View all
            </Link>
          ) : null}
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background/70 text-foreground transition hover:border-primary/50 disabled:opacity-30 md:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-background/70 text-foreground transition hover:border-primary/50 disabled:opacity-30 md:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="rail px-4 lg:px-8"
        tabIndex={0}
        role="group"
        aria-label={`${title} carousel`}
      >
        {children}
      </div>
    </section>
  )
}
