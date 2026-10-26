import { describe, expect, it } from 'vitest'
import { buildPath, parseLocation, titlePath, watchPath } from '@/router/routes'

describe('parseLocation', () => {
  it('resolves every primary route', () => {
    const cases: [string, string][] = [
      ['/', 'home'],
      ['/movies', 'movies'],
      ['/series', 'series'],
      ['/anime', 'anime'],
      ['/genres', 'genres'],
      ['/languages', 'languages'],
      ['/providers', 'providers'],
      ['/trending', 'trending'],
      ['/recent', 'recent'],
      ['/top-rated', 'top-rated'],
      ['/continue-watching', 'continue-watching'],
      ['/history', 'history'],
      ['/my-list', 'my-list'],
      ['/search', 'search'],
      ['/settings', 'settings'],
      ['/capabilities', 'capabilities'],
    ]
    for (const [path, name] of cases) {
      expect(parseLocation(path).name).toBe(name)
    }
  })

  it('extracts dynamic params and decodes them', () => {
    expect(parseLocation('/title/lucifer-UQASHYbVPB2').params.detailPath).toBe('lucifer-UQASHYbVPB2')
    expect(parseLocation('/genres/sci-fi').params.genre).toBe('sci-fi')
    expect(parseLocation('/languages/%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80').params.language).toBe('हिन्दी')
    expect(parseLocation('/providers/PrimeVideo').params.provider).toBe('PrimeVideo')
  })

  it('parses query strings', () => {
    const route = parseLocation('/watch/lucifer-UQASHYbVPB2', '?se=2&ep=5')
    expect(route.name).toBe('watch')
    expect(route.query.get('se')).toBe('2')
    expect(route.query.get('ep')).toBe('5')
  })

  it('tolerates trailing slashes and unknown routes', () => {
    expect(parseLocation('/movies/').name).toBe('movies')
    expect(parseLocation('/does-not-exist').name).toBe('not-found')
    expect(parseLocation('/title').name).toBe('not-found')
  })
})

describe('buildPath', () => {
  it('builds encoded paths', () => {
    expect(buildPath('title', { detailPath: 'colony-hindi-WrHlMwhDfc7' })).toBe('/title/colony-hindi-WrHlMwhDfc7')
    expect(buildPath('genre', { genre: 'sci fi' })).toBe('/genres/sci%20fi')
    expect(titlePath('a b')).toBe('/title/a%20b')
  })

  it('omits empty query values', () => {
    expect(watchPath('movie-abc')).toBe('/watch/movie-abc')
    expect(watchPath('movie-abc', { season: 0, episode: 0 })).toBe('/watch/movie-abc')
    expect(watchPath('show-abc', { season: 2, episode: 7 })).toBe('/watch/show-abc?se=2&ep=7')
  })
})
