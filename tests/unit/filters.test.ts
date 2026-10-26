import { describe, expect, it } from 'vitest'
import { aggregateFacets, hasActiveFilters, matchesFilters, matchesSearch, sortTitles } from '@/services/api'
import type { CatalogFilters, Title } from '@/services/types'

function makeTitle(overrides: Partial<Title> = {}): Title {
  return {
    id: '1',
    detailPath: 'sample-title-AbC',
    title: 'Sample Title',
    kind: 'movie',
    subjectType: 1,
    year: 2021,
    releaseDate: '2021-05-01',
    rating: 7.5,
    ratingCount: 1000,
    genres: ['Action', 'Thriller'],
    country: 'United States',
    durationSeconds: 6000,
    overview: '',
    poster: null,
    backdrop: null,
    blurHash: null,
    trailerUrl: null,
    subtitleLanguages: ['English', 'हिन्दी'],
    languageVariant: null,
    season: 0,
    hasResource: true,
    vipLevel: null,
    ...overrides,
  }
}

const emptyFilters: CatalogFilters = {
  genres: [],
  year: null,
  country: null,
  subtitleLanguage: null,
  audioLanguage: null,
  minRating: null,
  sort: 'recommended',
}

describe('matchesFilters', () => {
  const title = makeTitle()

  it('passes everything with empty filters', () => {
    expect(matchesFilters(title, emptyFilters)).toBe(true)
  })

  it('matches genres case-insensitively and requires all selected genres', () => {
    expect(matchesFilters(title, { ...emptyFilters, genres: ['action'] })).toBe(true)
    expect(matchesFilters(title, { ...emptyFilters, genres: ['Action', 'Thriller'] })).toBe(true)
    expect(matchesFilters(title, { ...emptyFilters, genres: ['Action', 'Comedy'] })).toBe(false)
  })

  it('filters by year, country and rating', () => {
    expect(matchesFilters(title, { ...emptyFilters, year: 2021 })).toBe(true)
    expect(matchesFilters(title, { ...emptyFilters, year: 2020 })).toBe(false)
    expect(matchesFilters(title, { ...emptyFilters, country: 'united states' })).toBe(true)
    expect(matchesFilters(title, { ...emptyFilters, country: 'India' })).toBe(false)
    expect(matchesFilters(title, { ...emptyFilters, minRating: 7 })).toBe(true)
    expect(matchesFilters(title, { ...emptyFilters, minRating: 8 })).toBe(false)
    expect(matchesFilters(makeTitle({ rating: null }), { ...emptyFilters, minRating: 5 })).toBe(false)
  })

  it('distinguishes subtitle languages from audio variants', () => {
    expect(matchesFilters(title, { ...emptyFilters, subtitleLanguage: 'हिन्दी' })).toBe(true)
    expect(matchesFilters(title, { ...emptyFilters, subtitleLanguage: 'English' })).toBe(true)
    expect(matchesFilters(title, { ...emptyFilters, subtitleLanguage: 'Urdu' })).toBe(false)
    // Audio variant filtering must not be satisfied by subtitle metadata.
    expect(matchesFilters(title, { ...emptyFilters, audioLanguage: 'English' })).toBe(false)
    expect(matchesFilters(makeTitle({ languageVariant: 'Hindi' }), { ...emptyFilters, audioLanguage: 'Hindi' })).toBe(true)
  })
})

describe('sortTitles', () => {
  const items = [
    makeTitle({ detailPath: 'b', rating: 8.9, releaseDate: '2019-01-01', title: 'Beta' }),
    makeTitle({ detailPath: 'a', rating: null, releaseDate: '2024-06-01', title: 'Alpha' }),
    makeTitle({ detailPath: 'c', rating: 6.1, releaseDate: '2021-01-01', title: 'Charlie' }),
  ]

  it('sorts by rating with unrated titles last', () => {
    expect(sortTitles(items, 'rating').map((item) => item.detailPath)).toEqual(['b', 'c', 'a'])
  })

  it('sorts by recency', () => {
    expect(sortTitles(items, 'recent').map((item) => item.detailPath)).toEqual(['a', 'c', 'b'])
  })

  it('sorts alphabetically and keeps "recommended" order stable', () => {
    expect(sortTitles(items, 'title').map((item) => item.detailPath)).toEqual(['a', 'b', 'c'])
    expect(sortTitles(items, 'recommended').map((item) => item.detailPath)).toEqual(['b', 'a', 'c'])
  })

  it('does not mutate the input array', () => {
    const copy = [...items]
    sortTitles(items, 'rating')
    expect(items).toEqual(copy)
  })
})

describe('aggregateFacets', () => {
  it('counts genres, countries, years, subtitle and audio languages', () => {
    const facets = aggregateFacets([
      makeTitle({ genres: ['Action', 'action', 'Drama'], country: 'India', year: 2020, languageVariant: 'Hindi' }),
      makeTitle({ genres: ['Action'], country: 'India', year: 2021, subtitleLanguages: ['English'] }),
    ])
    expect(facets.genres[0]).toEqual({ value: 'Action', count: 3 })
    expect(facets.countries[0]).toEqual({ value: 'India', count: 2 })
    expect(facets.years.map((year) => year.value)).toEqual([2021, 2020])
    expect(facets.audioLanguages).toEqual([{ value: 'Hindi', count: 1 }])
    expect(facets.subtitleLanguages.find((language) => language.value === 'English')?.count).toBe(2)
  })
})

describe('matchesSearch + hasActiveFilters', () => {
  it('normalises accents and punctuation', () => {
    const title = makeTitle({ title: 'Amélie' })
    expect(matchesSearch(title, 'amelie')).toBe(true)
    expect(matchesSearch(title, 'AME')).toBe(true)
    expect(matchesSearch(title, 'zzz')).toBe(false)
  })

  it('knows when filters are active', () => {
    expect(hasActiveFilters(emptyFilters)).toBe(false)
    expect(hasActiveFilters({ ...emptyFilters, minRating: 7 })).toBe(true)
    expect(hasActiveFilters({ ...emptyFilters, genres: ['Drama'] })).toBe(true)
  })
})
