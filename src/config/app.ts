/**
 * Application configuration & static brand data.
 * Everything that is environment-dependent lives here so the rest of the app
 * never reads `import.meta.env` directly.
 */

const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const rawProxy = import.meta.env.VITE_USE_DEV_PROXY === 'true'

export const APP = {
  name: 'eMovies',
  tagline: 'Cinema, series & anime — curated in one place.',
  /** Public, read-only API used for all catalogue data. */
  apiBaseUrl: (rawBase && rawBase.length > 0 ? rawBase : 'https://filmy-flow-api.vercel.app').replace(/\/+$/, ''),
  /**
   * When true the browser talks to a same-origin proxy (`/api-proxy`) instead of
   * the upstream API directly. Needed only when upstream CORS blocks the app —
   * see README → "CORS & proxy mode".
   */
  useProxy: rawProxy,
  /** Prefer re-signed CDN URLs over the API's `/stream` proxy for playback. */
  preferDirectStreams: import.meta.env.VITE_PREFER_DIRECT_STREAMS === 'true',
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? 20000),
  /** Number of catalogue pages a filter/search sweep will walk looking for matches. */
  maxFilterSweepPages: Number(import.meta.env.VITE_MAX_SWEEP_PAGES ?? 6),
  storagePrefix: 'emovies:v1',
  repoUrl: 'https://github.com/360internshala-oss/eMovies',
} as const

export type NavItem = {
  label: string
  to: string
  icon: 'home' | 'film' | 'tv' | 'sparkles' | 'search' | 'bookmark' | 'history' | 'flame' | 'star' | 'clock' | 'play' | 'settings' | 'layers' | 'globe'
  /** Show in the mobile bottom bar */
  primary?: boolean
}

export const DESKTOP_NAV: NavItem[] = [
  { label: 'Home', to: '/', icon: 'home' },
  { label: 'Movies', to: '/movies', icon: 'film' },
  { label: 'TV Series', to: '/series', icon: 'tv' },
  { label: 'Anime', to: '/anime', icon: 'sparkles' },
  { label: 'Genres', to: '/genres', icon: 'layers' },
  { label: 'Languages', to: '/languages', icon: 'globe' },
  { label: 'Platforms', to: '/providers', icon: 'star' },
]

export const MOBILE_NAV: NavItem[] = [
  { label: 'Home', to: '/', icon: 'home', primary: true },
  { label: 'Movies', to: '/movies', icon: 'film', primary: true },
  { label: 'Series', to: '/series', icon: 'tv', primary: true },
  { label: 'Search', to: '/search', icon: 'search', primary: true },
  { label: 'My List', to: '/my-list', icon: 'bookmark', primary: true },
]

export const SECONDARY_NAV: NavItem[] = [
  { label: 'Trending', to: '/trending', icon: 'flame' },
  { label: 'Recently Added', to: '/recent', icon: 'clock' },
  { label: 'Top Rated', to: '/top-rated', icon: 'star' },
  { label: 'Continue Watching', to: '/continue-watching', icon: 'play' },
  { label: 'Watch History', to: '/history', icon: 'history' },
  { label: 'My List', to: '/my-list', icon: 'bookmark' },
  { label: 'Settings', to: '/settings', icon: 'settings' },
]

/** Relative URLs of the upstream API that this build actually consumes. */
export const ENDPOINTS = {
  health: '/health',
  home: '/home',
  tabs: '/tabs',
  trending: '/trending',
  movies: '/movies',
  series: '/tv-series',
  search: '/search',
  detail: '/detail',
  cast: '/cast',
  recs: '/recs',
  play: '/play',
  caption: '/caption',
  streamProxy: '/stream',
} as const

/**
 * Language catalogue used for the language filters and the player's subtitle
 * preferences. Codes follow the labels the upstream API returns in
 * `subject.subtitles` (`lanName` in `/caption` responses).
 */
export const SUBTITLE_LANGUAGES: { code: string; label: string; native?: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ur', label: 'Urdu', native: 'اُردُو' },
  { code: 'ar', label: 'Arabic', native: 'اَلْعَرَبِيَّةُ' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'fil', label: 'Filipino' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'ko', label: 'Korean', native: '한국어' },
  { code: 'th', label: 'Thai', native: 'ภาษาไทย' },
  { code: 'vi', label: 'Vietnamese', native: 'tiếng Việt' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
  { code: 'fa', label: 'Persian', native: 'فارسی' },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili' },
  { code: 'ha', label: 'Hausa' },
  { code: 'el', label: 'Greek', native: 'Νέα Ελληνικά' },
]

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const
export const ASPECT_RATIOS = ['default', '16:9', '4:3', 'fill', 'cover'] as const
export type AspectRatio = (typeof ASPECT_RATIOS)[number]
