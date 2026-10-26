import { useEffect, useState } from 'react'
import { Bookmark, Moon, Search, Settings, Sun } from 'lucide-react'
import { DESKTOP_NAV, SECONDARY_NAV } from '@/config/app'
import { Link } from '@/router/Link'
import { useRouter } from '@/router/RouterProvider'
import { Logo } from './logo'
import { useSettings } from '@/store/settings'
import { useLibrary } from '@/store/library'
import { cn } from '@/utils/cn'
import { Dropdown, DropdownItem, DropdownLabel } from '@/components/ui/dropdown'

interface TopNavProps {
  onOpenSearch: () => void
}

export function TopNav({ onOpenSearch }: TopNavProps) {
  const { route, navigate } = useRouter()
  const { settings, update } = useSettings()
  const { state } = useLibrary()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`))
  const nextTheme = settings.theme === 'dark' ? 'light' : 'dark'

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'glass border-b border-border/60' : 'bg-gradient-to-b from-black/70 to-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 lg:px-8">
        <Logo />

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {DESKTOP_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(item.to) ? 'page' : undefined}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition',
                isActive(item.to) ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-9 items-center gap-2 rounded-full border border-border/80 bg-white/5 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground focus-ring sm:pr-10"
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search titles</span>
            <kbd className="ml-1 hidden rounded border border-border px-1 text-[10px] sm:inline">/</kbd>
          </button>

          <Link
            to="/my-list"
            aria-label={`My List (${state.list.length} saved)`}
            className="relative hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground focus-ring sm:flex"
          >
            <Bookmark className="h-4 w-4" />
            {state.list.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {state.list.length > 99 ? '99+' : state.list.length}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => update({ theme: nextTheme })}
            aria-label={`Switch to ${nextTheme} theme`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground focus-ring"
          >
            {settings.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Dropdown
            label="More navigation"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Open more navigation"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground focus-ring"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <DropdownLabel>Discover</DropdownLabel>
                {SECONDARY_NAV.filter((item) => item.to !== 'settings').map((item) => (
                  <DropdownItem
                    key={item.to}
                    onSelect={() => {
                      close()
                      navigate(item.to)
                    }}
                  >
                    {item.label}
                  </DropdownItem>
                ))}
                <div className="my-1 h-px bg-border" />
                <DropdownItem
                  onSelect={() => {
                    close()
                    navigate('/settings')
                  }}
                >
                  Settings & Preferences
                </DropdownItem>
                <DropdownItem
                  onSelect={() => {
                    close()
                    navigate('/capabilities')
                  }}
                >
                  API capabilities
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  )
}
