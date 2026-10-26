// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { payloadFor } from '../fixtures/api'
import App from '@/App'
import { clearCatalogCache } from '@/services/api'

/**
 * Route-level smoke tests: every navigation target must render real content
 * from the API fixtures without crashing, and every poster must link to its
 * own title page.
 */

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input.toString()
  const payload = payloadFor(url)
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})

function goTo(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeAll(() => {
  vi.stubGlobal('fetch', fetchMock)
  // jsdom lacks these browser APIs that the UI relies on.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', { configurable: true, value: vi.fn() })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'load', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, value: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) })
})

beforeEach(() => {
  window.localStorage.clear()
  fetchMock.mockClear()
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    return new Response(JSON.stringify(payloadFor(url)), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  })
  clearCatalogCache()
})

afterEach(() => {
  cleanup()
})

describe('home', () => {
  it('renders the hero from trending and rails from the catalogue', async () => {
    goTo('/')
    await waitFor(() => expect(screen.getAllByText('Trending now').length).toBeGreaterThan(0))
    // Hero headline comes from the first trending title.
    expect(screen.getAllByText('Lucifer').length).toBeGreaterThan(0)
    // Poster links point at their own title routes.
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '')
    expect(links).toContain('/title/lucifer-UQASHYbVPB2')
    expect(links).toContain('/title/colony-06FbDRS87x3')
    // Music/kids videos (subjectType 6) are filtered out of poster grids.
    expect(screen.queryByText('Silent Sanctuary Playlist')).toBeNull()
  })
})

describe('catalogue routes', () => {
  it('/movies shows the Movies heading, filters and movie posters', async () => {
    goTo('/movies')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Movies'))
    await waitFor(() => expect(screen.getByText('Colony')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    // Anime titles never leak into the movie grid.
    expect(screen.queryByText('Boruto: Naruto Next Generations')).toBeNull()
  })

  it('/series lists series only', async () => {
    goTo('/series')
    await waitFor(() => expect(screen.getByText('The Rookie')).toBeInTheDocument())
    expect(screen.queryByText('Colony')).toBeNull()
  })

  it('/anime filters the series catalogue by the Anime genre', async () => {
    goTo('/anime')
    await waitFor(() => expect(screen.getByText('Boruto: Naruto Next Generations')).toBeInTheDocument())
    expect(screen.queryByText('The Rookie')).toBeNull()
  })

  it.each([
    ['/genres', 'Genres'],
    ['/languages', 'Languages'],
    ['/providers', 'Platforms & providers'],
    ['/settings', 'Settings'],
    ['/capabilities', 'API capability map'],
    ['/my-list', 'My List'],
    ['/history', 'Watch history'],
    ['/continue-watching', 'Continue watching'],
    ['/search', 'Find something to watch'],
    ['/trending', 'Trending now'],
    ['/recent', 'Recently added'],
    ['/top-rated', 'Top rated'],
  ])('%s renders its heading', async (path, heading) => {
    goTo(path)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument())
  })

  it('/genres lists aggregated genres that link to genre pages', async () => {
    goTo('/genres')
    await waitFor(() => expect(screen.getAllByText('Action').length).toBeGreaterThan(0))
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '')
    expect(links).toContain('/genres/action')
  })

  it('/providers shows the verified platform directory', async () => {
    goTo('/providers')
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
    expect(screen.getByText('PrimeVideo')).toBeInTheDocument()
    // Honest limitation copy is present rather than fake catalogues.
    expect(screen.getAllByText(/Verified limitation/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/no subject-level platform metadata/i).length).toBeGreaterThan(0)
  })

  it('/languages separates subtitle and audio variants', async () => {
    goTo('/languages')
    await waitFor(() => expect(screen.getAllByText(/subtitle languages/i).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/Audio variants/i).length).toBeGreaterThan(0)
  })
})

describe('title + player routes', () => {
  it('/title/:detailPath renders metadata, cast, dubs and seasons note', async () => {
    goTo('/title/lucifer-UQASHYbVPB2')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lucifer S1-S6'))
    expect(screen.getByText(/Lucifer Morningstar has decided/)).toBeInTheDocument()
    expect(screen.getByText('Tom Ellis')).toBeInTheDocument()
    // Hindi dub is surfaced as a real, separate audio variant.
    const dubLinks = screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '')
    expect(dubLinks).toContain('/title/lucifer-Aq2Bzbvyte1')
    // And offers playback of the original entry.
    expect(dubLinks.some((href) => href.startsWith('/watch/lucifer-UQASHYbVPB2'))).toBe(true)
  })

  it('/watch/:detailPath resolves a real stream and shows the player chrome', async () => {
    goTo('/watch/lucifer-UQASHYbVPB2?se=1&ep=1')
    await waitFor(() => expect(screen.getByLabelText('Playback quality')).toBeInTheDocument())
    expect(screen.getByLabelText(/subtitles/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Seek')).toBeInTheDocument()
    // Quality labels reflect real API renditions only.
    expect(screen.getByLabelText('Playback quality')).toHaveTextContent(/auto/i)
    // The resolved rendition is a real API stream, not a fabricated quality.
    expect(document.querySelector('video')?.getAttribute('src')).toContain('1080.mp4')
  })

  it('renders a clear empty state when the API has no streams', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ detail: 'Not Found' }), { status: 404 }))
    goTo('/watch/lucifer-UQASHYbVPB2')
    await waitFor(() => expect(screen.getAllByText(/error|not found|no playable stream/i).length).toBeGreaterThan(0))
  })
})

describe('search', () => {
  it('renders results for a query in the URL', async () => {
    goTo('/search?q=colony')
    await waitFor(() => expect(screen.getByText('Colony [Hindi]')).toBeInTheDocument())
    expect(screen.getByText(/result for/i)).toBeInTheDocument()
  })
})

describe('navigation + fallbacks', () => {
  it('exposes a five-item mobile bottom navigation and desktop links', () => {
    goTo('/')
    const mobileNav = screen.getByRole('navigation', { name: /primary mobile navigation/i })
    expect(within(mobileNav).getAllByRole('link').length + within(mobileNav).getAllByRole('button').length).toBe(5)
    const primaryNav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(primaryNav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
      'Movies',
      'TV Series',
      'Anime',
      'Genres',
      'Languages',
      'Platforms',
    ])
  })

  it('renders the 404 page for unknown routes', async () => {
    goTo('/nope/nope')
    await waitFor(() => expect(screen.getByRole('heading', { name: /doesn't exist/i })).toBeInTheDocument())
  })

  it('surfaces an API error state instead of an empty page', async () => {
    fetchMock.mockImplementation(async () => new Response('boom', { status: 500 }))
    goTo('/movies')
    await waitFor(
      () => expect(screen.getAllByText(/the api returned an error|try again/i).length).toBeGreaterThan(0),
      { timeout: 5000 },
    )
  })
})
