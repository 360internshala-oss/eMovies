import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  side?: 'right' | 'bottom' | 'center'
  className?: string
}

/**
 * Accessible overlay (drawer / modal). Closes on Escape and backdrop click,
 * moves focus inside on open and restores it on close.
 */
export function Sheet({ open, onClose, title, description, children, side = 'right', className }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input, button, a[href]')?.focus()
    }, 30)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title ?? 'Panel'}>
      <button
        type="button"
        aria-label="Close overlay"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm animate-fade-in"
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute flex flex-col overflow-hidden border-border bg-popover text-popover-foreground shadow-2xl animate-fade-in',
          side === 'right' && 'inset-y-0 right-0 w-full max-w-sm border-l',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t safe-bottom',
          side === 'center' && 'left-1/2 top-1/2 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div>
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
