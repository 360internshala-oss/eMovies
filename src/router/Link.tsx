import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useRouter } from './RouterProvider'
import { cn } from '@/utils/cn'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  children: ReactNode
  /** Keep the current scroll position (used by filter chips). */
  keepScroll?: boolean
  replace?: boolean
}

/**
 * Internal link that participates in client-side routing but stays a real
 * anchor (middle-click / open-in-new-tab keeps working).
 */
export function Link({ to, children, className, onClick, keepScroll, replace, ...rest }: LinkProps) {
  const { navigate } = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (rest.target && rest.target !== '_self') return
    event.preventDefault()
    navigate(to, { keepScroll, replace })
  }

  return (
    <a href={to} onClick={handleClick} className={cn(className)} {...rest}>
      {children}
    </a>
  )
}
