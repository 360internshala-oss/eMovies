import { describe, expect, it } from 'vitest'
import { computeContinueWatching, libraryReducer, type HistoryEntry, type LibraryState } from '@/store/library'
import type { Title } from '@/services/types'

const title: Title = {
  id: '1',
  detailPath: 'lucifer-UQASHYbVPB2',
  title: 'Lucifer',
  kind: 'series',
  subjectType: 2,
  year: 2016,
  releaseDate: '2016-01-25',
  rating: 8,
  ratingCount: 1,
  genres: ['Crime'],
  country: 'United States',
  durationSeconds: 0,
  overview: '',
  poster: 'https://cdn/poster.jpg',
  backdrop: null,
  blurHash: null,
  trailerUrl: null,
  subtitleLanguages: [],
  languageVariant: null,
  season: 0,
  hasResource: true,
  vipLevel: null,
}

const initial: LibraryState = { list: [], history: [] }

function historyEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    detailPath: 'lucifer-UQASHYbVPB2',
    title: 'Lucifer',
    poster: null,
    backdrop: null,
    kind: 'series',
    season: 1,
    episode: 1,
    position: 300,
    duration: 2700,
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('library reducer — My List', () => {
  it('toggles a title in and out of the list', () => {
    const added = libraryReducer(initial, { type: 'toggle-list', title })
    expect(added.list).toHaveLength(1)
    expect(added.list[0]).toMatchObject({ detailPath: title.detailPath, title: 'Lucifer', poster: title.poster })

    const removed = libraryReducer(added, { type: 'toggle-list', title })
    expect(removed.list).toHaveLength(0)
  })

  it('adds once even when called repeatedly', () => {
    const once = libraryReducer(initial, { type: 'add-list', title })
    const twice = libraryReducer(once, { type: 'add-list', title })
    expect(twice.list).toHaveLength(1)
  })

  it('removes by detailPath', () => {
    const added = libraryReducer(initial, { type: 'toggle-list', title })
    expect(libraryReducer(added, { type: 'remove-list', detailPath: title.detailPath }).list).toHaveLength(0)
  })
})

describe('library reducer — progress', () => {
  it('records progress and replaces the previous entry for the same title', () => {
    const first = libraryReducer(initial, { type: 'record-progress', entry: historyEntry({ position: 100 }) })
    const second = libraryReducer(first, { type: 'record-progress', entry: historyEntry({ position: 900, episode: 2 }) })
    expect(second.history).toHaveLength(1)
    expect(second.history[0]).toMatchObject({ position: 900, episode: 2 })
  })

  it('keeps the most recent first', () => {
    const state = libraryReducer(
      libraryReducer(initial, { type: 'record-progress', entry: historyEntry({ detailPath: 'a', updatedAt: 1 }) }),
      { type: 'record-progress', entry: historyEntry({ detailPath: 'b', updatedAt: 2 }) },
    )
    // reducer stamps updatedAt itself, so the newly recorded entry leads.
    expect(state.history[0].detailPath).toBe('b')
  })

  it('clears history on demand', () => {
    const state = libraryReducer(initial, { type: 'record-progress', entry: historyEntry() })
    expect(libraryReducer(state, { type: 'clear-history' }).history).toHaveLength(0)
  })

  it('caps history length', () => {
    let state = initial
    for (let index = 0; index < 140; index += 1) {
      state = libraryReducer(state, { type: 'record-progress', entry: historyEntry({ detailPath: `title-${index}` }) })
    }
    expect(state.history.length).toBeLessThanOrEqual(120)
  })
})

describe('computeContinueWatching', () => {
  it('excludes barely-started and finished titles', () => {
    const entries = [
      historyEntry({ detailPath: 'started', position: 3 }),
      historyEntry({ detailPath: 'in-progress', position: 600 }),
      historyEntry({ detailPath: 'finished', position: 2695, duration: 2700 }),
      historyEntry({ detailPath: 'series-any-progress', position: 100, duration: 0 }),
    ]
    expect(computeContinueWatching(entries).map((entry) => entry.detailPath)).toEqual(['in-progress', 'series-any-progress'])
  })

  it('orders by most recent activity', () => {
    const entries = [
      historyEntry({ detailPath: 'older', updatedAt: 1000 }),
      historyEntry({ detailPath: 'newer', updatedAt: 5000 }),
    ]
    expect(computeContinueWatching(entries)[0].detailPath).toBe('newer')
  })
})
