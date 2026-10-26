import { useEffect, useState } from 'react'
import { RouterProvider, useRoute } from '@/router/RouterProvider'
import { SettingsProvider } from '@/store/settings'
import { LibraryProvider } from '@/store/library'
import { ToastProvider } from '@/components/ui/toast'
import { TopNav } from '@/components/layout/top-nav'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Footer } from '@/components/layout/footer'
import { SearchOverlay } from '@/components/layout/search-overlay'
import { OfflineBanner } from '@/components/ui/states'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { HomePage } from '@/pages/home-page'
import { MoviesPage, SeriesPage, AnimePage, TrendingPage, RecentPage, TopRatedPage } from '@/pages/catalog-pages'
import { GenresPage } from '@/pages/genres-page'
import { GenrePage } from '@/pages/genre-page'
import { LanguagesPage } from '@/pages/languages-page'
import { LanguagePage } from '@/pages/language-page'
import { ProvidersPage } from '@/pages/providers-page'
import { ProviderPage } from '@/pages/provider-page'
import { TitleDetailPage } from '@/pages/title-detail-page'
import { WatchPage } from '@/pages/watch-page'
import { SearchPage } from '@/pages/search-page'
import { MyListPage, ContinueWatchingPage, HistoryPage } from '@/pages/library-pages'
import { SettingsPage } from '@/pages/settings-page'
import { CapabilitiesPage } from '@/pages/capabilities-page'
import { NotFoundPage } from '@/pages/not-found-page'

function RouteView() {
  const route = useRoute()

  switch (route.name) {
    case 'home':
      return <HomePage />
    case 'movies':
      return <MoviesPage />
    case 'series':
      return <SeriesPage />
    case 'anime':
      return <AnimePage />
    case 'trending':
      return <TrendingPage />
    case 'recent':
      return <RecentPage />
    case 'top-rated':
      return <TopRatedPage />
    case 'genres':
      return <GenresPage />
    case 'genre':
      return <GenrePage />
    case 'languages':
      return <LanguagesPage />
    case 'language':
      return <LanguagePage />
    case 'providers':
      return <ProvidersPage />
    case 'provider':
      return <ProviderPage />
    case 'title':
      return <TitleDetailPage />
    case 'watch':
      return <WatchPage />
    case 'search':
      return <SearchPage />
    case 'my-list':
      return <MyListPage />
    case 'continue-watching':
      return <ContinueWatchingPage />
    case 'history':
      return <HistoryPage />
    case 'settings':
      return <SettingsPage />
    case 'capabilities':
      return <CapabilitiesPage />
    default:
      return <NotFoundPage />
  }
}

function Shell() {
  const route = useRoute()
  const [searchOpen, setSearchOpen] = useState(false)
  const online = useOnlineStatus()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      if (typing) return
      if (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const immersive = route.name === 'watch'

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {!online ? <OfflineBanner /> : null}
      <TopNav onOpenSearch={() => setSearchOpen(true)} />
      <main id="main-content" className={immersive ? 'flex-1 pb-16 md:pb-0' : 'flex-1 pb-20 md:pb-0'}>
        <RouteView />
      </main>
      {!immersive ? <Footer /> : null}
      <BottomNav onOpenSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <LibraryProvider>
        <ToastProvider>
          <RouterProvider>
            <Shell />
          </RouterProvider>
        </ToastProvider>
      </LibraryProvider>
    </SettingsProvider>
  )
}
