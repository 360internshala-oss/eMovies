import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

/** Native select (best mobile UX & a11y) with a matching visual shell. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, label, ...props }, ref) => (
  <label className="relative inline-flex w-full items-center">
    {label ? <span className="sr-only">{label}</span> : null}
    <select
      ref={ref}
      className={cn(
        'h-10 w-full appearance-none rounded-full border border-border bg-white/5 pl-4 pr-9 text-sm font-medium text-foreground focus-ring',
        '[&>option]:bg-popover [&>option]:text-popover-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
  </label>
))
Select.displayName = 'Select'
