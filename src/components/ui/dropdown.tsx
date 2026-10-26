import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (props: { close: () => void }) => ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  label?: string
}

/** Lightweight popover: click outside + Escape to dismiss, no portal needed. */
export function Dropdown({ trigger, children, align = 'right', className, label }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute bottom-full z-50 mb-2 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-2xl backdrop-blur animate-fade-in',
            align === 'right' && 'right-0',
            align === 'left' && 'left-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            'bottom-auto top-full mt-2',
            className,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownItem({
  children,
  onSelect,
  active,
  disabled,
  hint,
}: {
  children: ReactNode
  onSelect: () => void
  active?: boolean
  disabled?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active === true}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition',
        'hover:bg-white/10 focus-ring disabled:opacity-40',
        active && 'text-primary',
      )}
    >
      <span className="flex items-center gap-2">{children}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  )
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</div>
}
