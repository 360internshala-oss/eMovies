import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-white/15 bg-black/55 text-white backdrop-blur',
        primary: 'border-transparent bg-primary/20 text-primary',
        gold: 'border-transparent bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]',
        outline: 'border-border text-muted-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        success: 'border-transparent bg-emerald-500/15 text-emerald-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
