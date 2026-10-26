import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { readStorage, writeStorage } from '@/utils/storage'
import type { Title } from '@/services/types'

/**
 * Local-first library: My List + watch history / resume positions.
 * The upstream API has no accounts or watch-state endpoints, so this is the
 * only honest place to persist it (documented in the capability map).
 */

export interface ListEntry {
  detailPath: string
  title: string
  poster: string | null
  kind: Title['kind']
  year: number | null
  rating: number | null
  addedAt: number
}

export interface HistoryEntry {
  detailPath: string
  title: string
  poster: string | null
  backdrop: string | null
  kind: Title['kind']
  season: number
  episode: number
  position: number
  duration: number
  updatedAt: number
}

interface LibraryState {
  list: ListEntry[]
  history: HistoryEntry[]
}

type LibraryAction =
  | { type: 'hydrate'; state: LibraryState }
  | { type: 'toggle-list'; title: Title }
  | { type: 'add-list'; title: Title }
  | { type: 'remove-list'; detailPath: string }
  | { type: 'record-progress'; entry: Omit<HistoryEntry, 'updatedAt'> }
  | { type: 'remove-history'; detailPath: string }
  | { type: 'clear-history' }

const MAX_HISTORY = 120

const initialState: LibraryState = { list: [], history: [] }

function snapshot(title: Title): ListEntry {
  return {
    detailPath: title.detailPath,
    title: title.title,
    poster: title.poster,
    kind: title.kind,
    year: title.year,
    rating: title.rating,
    addedAt: Date.now(),
  }
}

export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'hydrate':
      return action.state
    case 'toggle-list': {
      const exists = state.list.some((entry) => entry.detailPath === action.title.detailPath)
      return {
        ...state,
        list: exists
          ? state.list.filter((entry) => entry.detailPath !== action.title.detailPath)
          : [snapshot(action.title), ...state.list].slice(0, 500),
      }
    }
    case 'add-list': {
      if (state.list.some((entry) => entry.detailPath === action.title.detailPath)) return state
      return { ...state, list: [snapshot(action.title), ...state.list].slice(0, 500) }
    }
    case 'remove-list':
      return { ...state, list: state.list.filter((entry) => entry.detailPath !== action.detailPath) }
    case 'record-progress': {
      const entry: HistoryEntry = { ...action.entry, updatedAt: Date.now() }
      // A finished title keeps its seat in history but leaves "Continue watching".
      const rest = state.history.filter((item) => item.detailPath !== entry.detailPath)
      return { ...state, history: [entry, ...rest].slice(0, MAX_HISTORY) }
    }
    case 'remove-history':
      return { ...state, history: state.history.filter((entry) => entry.detailPath !== action.detailPath) }
    case 'clear-history':
      return { ...state, history: [] }
    default:
      return state
  }
}

function isLibraryState(value: unknown): value is LibraryState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as LibraryState
  return Array.isArray(candidate.list) && Array.isArray(candidate.history)
}

/** Shared selector so tests and UI agree on what "continue watching" means. */
export function computeContinueWatching(history: HistoryEntry[]): HistoryEntry[] {
  return history
    .filter((entry) => entry.position > 5 && (entry.duration === 0 || entry.position < entry.duration - 20))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export type { LibraryState, LibraryAction }

interface LibraryContextValue {
  state: LibraryState
  isInList: (detailPath: string) => boolean
  toggleList: (title: Title) => void
  addToList: (title: Title) => void
  removeFromList: (detailPath: string) => void
  recordProgress: (entry: Omit<HistoryEntry, 'updatedAt'>) => void
  removeFromHistory: (detailPath: string) => void
  clearHistory: () => void
  continueWatching: HistoryEntry[]
  getProgress: (detailPath: string) => HistoryEntry | undefined
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(libraryReducer, initialState, () =>
    readStorage<LibraryState>('library', initialState, isLibraryState),
  )

  useEffect(() => {
    writeStorage('library', state)
  }, [state])

  const isInList = useCallback((detailPath: string) => state.list.some((entry) => entry.detailPath === detailPath), [state.list])

  const value = useMemo<LibraryContextValue>(() => {
    const continueWatching = computeContinueWatching(state.history)

    return {
      state,
      isInList,
      toggleList: (title) => dispatch({ type: 'toggle-list', title }),
      addToList: (title) => dispatch({ type: 'add-list', title }),
      removeFromList: (detailPath) => dispatch({ type: 'remove-list', detailPath }),
      recordProgress: (entry) => dispatch({ type: 'record-progress', entry }),
      removeFromHistory: (detailPath) => dispatch({ type: 'remove-history', detailPath }),
      clearHistory: () => dispatch({ type: 'clear-history' }),
      continueWatching,
      getProgress: (detailPath) => state.history.find((entry) => entry.detailPath === detailPath),
    }
  }, [state, isInList])

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext)
  if (!context) throw new Error('useLibrary must be used inside <LibraryProvider>')
  return context
}
