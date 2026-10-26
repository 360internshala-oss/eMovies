/**
 * API capability map — the single source of truth for what the UI is allowed
 * to show. Every flag below was verified against live responses of
 * https://filmy-flow-api.vercel.app (see docs/API_CAPABILITIES.md for the
 * evidence). Unsupported features are hidden or clearly labelled; nothing is
 * faked.
 */

export interface Capability {
  id: string
  label: string
  supported: boolean
  /** `partial` = supported only through a documented workaround */
  status: 'supported' | 'partial' | 'unsupported'
  detail: string
}

export const FEATURES = {
  /** Verified: /play returns up to 4 real MP4 renditions (360–1080). */
  qualitySelection: true,
  /** Verified: /caption returns signed .srt tracks per language (converted to VTT in-app). */
  subtitleTracks: true,
  /** Verified: /detail exposes `dubs` with their own detailPath → separate audio stream. */
  audioDubs: true,
  /** Verified: no episode list endpoint exists; se/ep are resolved on demand by /play. */
  episodeList: false,
  /** Not provided by any verified endpoint. */
  skipIntro: false,
  liveSports: false,
  /** /suggest exists in the OpenAPI spec but returns `404 page not found` upstream. */
  autocomplete: false,
  /** Catalogue endpoints ignore genre/year/country/sort parameters. */
  serverSideFilter: false,
  serverSideSort: false,
  /** No provider/platform field on subjects — only /home.platformList. */
  providerCatalog: false,
  /** No `/genres` endpoint — facets are aggregated from catalogue pages. */
  genreEndpoint: false,
  /** DASH manifests are returned but need MSE + a dash.js-class player; this build uses MP4. */
  dashPlayback: false,
  trailers: true,
  cast: true,
  /** /recs exists; shape is normalised defensively and hidden when empty. */
  recommendations: true,
  search: true,
  totalCount: false,
} as const

export const CAPABILITIES: Capability[] = [
  { id: 'catalog', label: 'Movies & TV catalogue', supported: true, status: 'supported', detail: '/movies and /tv-series, 24 items per page, real `hasMore` pagination (upstream totalCount is a placeholder).' },
  { id: 'trending', label: 'Trending', supported: true, status: 'supported', detail: '/trending?page= returns trending subjects with 16:9 `stills` usable as hero art.' },
  { id: 'search', label: 'Search', supported: true, status: 'supported', detail: '/search?q=&page=&perPage= returns relevance-ranked results with a real `upstream.pager.totalCount`.' },
  { id: 'filters', label: 'Genre / year / country filters', supported: true, status: 'partial', detail: 'Catalogue endpoints ignore filter params, so filters run client-side over loaded pages (the UI says so and loads more pages on demand).' },
  { id: 'sort', label: 'Sorting', supported: true, status: 'partial', detail: 'The `sort` parameter is ignored upstream; sorting is applied to the loaded result set.' },
  { id: 'detail', label: 'Title detail', supported: true, status: 'supported', detail: '/detail?detailPath= — synopsis, cast, crew, dubs, trailer, rating, country, subtitles.' },
  { id: 'playback', label: 'Playback', supported: true, status: 'supported', detail: '/play returns signed MP4 renditions plus a DASH manifest; this build streams MP4 through the API media proxy.' },
  { id: 'quality', label: 'Quality selection', supported: true, status: 'supported', detail: 'Only real renditions returned for that title/episode are listed (typically 360p–1080p).' },
  { id: 'subtitles', label: 'Subtitles', supported: true, status: 'supported', detail: '/caption?id=<streamId> returns signed .srt tracks per language; the player converts them to WebVTT locally.' },
  { id: 'audio', label: 'Audio languages / dubs', supported: true, status: 'partial', detail: 'Dubs are separate catalogue entries with their own stream (e.g. “Hindi dub”); the app switches by resolving that variant — never by faking multiple tracks in one file.' },
  { id: 'episodes', label: 'Episode lists & season counts', supported: false, status: 'unsupported', detail: 'No endpoint exposes episodes or season counts. Seasons are derived from sibling catalogue entries; episodes are resolved on demand through /play and reported honestly when missing.' },
  { id: 'skipintro', label: 'Skip intro / recap', supported: false, status: 'unsupported', detail: 'No intro/recap timestamps exist in any verified response.' },
  { id: 'live', label: 'Live sports / channels', supported: false, status: 'unsupported', detail: 'No live endpoint, EPG or channel data is exposed by the API.' },
  { id: 'providers', label: 'Provider catalogues', supported: false, status: 'partial', detail: '/home exposes a platformList (Netflix, PrimeVideo, Disney…) but subjects carry no platform field, so per-provider catalogues cannot be built honestly.' },
  { id: 'autocomplete', label: 'Search autocomplete', supported: false, status: 'unsupported', detail: '/suggest is declared in the OpenAPI spec but answers `404 page not found` upstream.' },
  { id: 'progress', label: 'Resume / continue watching', supported: true, status: 'supported', detail: 'Stored locally (localStorage) — the API has no user accounts or progress endpoints.' },
  { id: 'watchlist', label: 'My List', supported: true, status: 'supported', detail: 'Stored locally (localStorage).' },
  { id: 'accounts', label: 'Accounts, sync, ratings', supported: false, status: 'unsupported', detail: 'No auth, watch-state or rating endpoints are exposed.' },
]

export function capabilityStatus(id: string): Capability['status'] {
  return CAPABILITIES.find((capability) => capability.id === id)?.status ?? 'unsupported'
}
