import { Bookmark, Film, Home, Search, Tv } from 'lucide-react'
import { MOBILE_NAV } from '@/config/app'
import { Link } from '@/router/Link'
import { useRouter } from '@/router/RouterProvider'
import { cn } from '@/utils/cn'

const ICONS = { home: Home, film: Film, tv: Tv, search: Search, bookmark: Bookmark } as const

export function BottomNav({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { route } = useRouter()

  const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`))

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 glass pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Home
          const active = isActive(item.to)
          if (item.icon === 'search') {
            return (
              <li key={item.to}>
                <button
                  type="button"
                  onClick={onOpenSearch}
                  aria-label="Open search"
                  className="flex w-full flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              </li>
            )
          }
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5 transition-transform', active && 'scale-110')} />
                {item.label}
                <span className={cn('mt-0.5 h-0.5 w-5 rounded-full transition-opacity', active ? 'bg-primary opacity-100' : 'opacity-0')} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
