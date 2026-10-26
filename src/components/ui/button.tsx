import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-glow hover:brightness-110',
        brand: 'bg-brand-gradient text-white shadow-glow hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-transparent text-foreground hover:border-foreground/30 hover:bg-white/5',
        ghost: 'bg-transparent text-foreground hover:bg-white/10',
        subtle: 'bg-white/10 text-foreground backdrop-blur hover:bg-white/15',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
        link: 'rounded-none bg-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'
