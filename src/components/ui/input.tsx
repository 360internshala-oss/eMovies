import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-full border border-border bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus-ring',
      'bg-white/5 backdrop-blur',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'
