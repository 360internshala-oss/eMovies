import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { readStorage, writeStorage, isRecord } from '@/utils/storage'
import type { AspectRatio } from '@/config/app'

export type ThemeMode = 'dark' | 'light' | 'system'
export type SubtitleSize = 'sm' | 'md' | 'lg'
export type QualityPreference = 'auto' | 'lowest' | 'highest' | `${number}`

export interface Settings {
  theme: ThemeMode
  /** Preferred subtitle language code (subtitle menu auto-selects it when present). */
  subtitleLanguage: string | null
  subtitleSize: SubtitleSize
  autoplayNext: boolean
  quality: QualityPreference
  volume: number
  muted: boolean
  aspectRatio: AspectRatio
  reduceMotion: boolean
  /** Preferred audio language label (e.g. "Hindi") used to preselect an available dub. */
  audioLanguage: string | null
}

const DEFAULTS: Settings = {
  theme: 'dark',
  subtitleLanguage: null,
  subtitleSize: 'md',
  autoplayNext: true,
  quality: 'auto',
  volume: 1,
  muted: false,
  aspectRatio: 'default',
  reduceMotion: false,
  audioLanguage: null,
}

function sanitize(value: unknown): Settings {
  if (!isRecord(value)) return DEFAULTS
  const theme = value.theme
  const subtitleSize = value.subtitleSize
  const quality = value.quality
  return {
    theme: theme === 'light' || theme === 'system' || theme === 'dark' ? theme : DEFAULTS.theme,
    subtitleLanguage: typeof value.subtitleLanguage === 'string' ? value.subtitleLanguage : null,
    subtitleSize: subtitleSize === 'sm' || subtitleSize === 'md' || subtitleSize === 'lg' ? subtitleSize : DEFAULTS.subtitleSize,
    autoplayNext: typeof value.autoplayNext === 'boolean' ? value.autoplayNext : DEFAULTS.autoplayNext,
    quality: typeof quality === 'string' ? (quality as QualityPreference) : DEFAULTS.quality,
    volume: typeof value.volume === 'number' && value.volume >= 0 && value.volume <= 1 ? value.volume : DEFAULTS.volume,
    muted: typeof value.muted === 'boolean' ? value.muted : DEFAULTS.muted,
    aspectRatio: typeof value.aspectRatio === 'string' ? (value.aspectRatio as AspectRatio) : DEFAULTS.aspectRatio,
    reduceMotion: typeof value.reduceMotion === 'boolean' ? value.reduceMotion : DEFAULTS.reduceMotion,
    audioLanguage: typeof value.audioLanguage === 'string' ? value.audioLanguage : null,
  }
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
  setTheme: (theme: ThemeMode) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#07080c' : '#f7f7fa')
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => sanitize(readStorage('settings', DEFAULTS)))
  const mediaQuery = useRef<MediaQueryList | null>(null)

  useEffect(() => {
    writeStorage('settings', settings)
    applyTheme(settings.theme)
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
  }, [settings])

  useEffect(() => {
    mediaQuery.current = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null
    const listener = () => {
      if (settings.theme === 'system') applyTheme('system')
    }
    mediaQuery.current?.addEventListener?.('change', listener)
    return () => mediaQuery.current?.removeEventListener?.('change', listener)
  }, [settings.theme])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => sanitize({ ...current, ...patch }))
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      update,
      reset: () => setSettings(DEFAULTS),
      setTheme: (theme) => update({ theme }),
    }),
    [settings, update],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>')
  return context
}
