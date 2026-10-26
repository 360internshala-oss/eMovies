/**
 * Raw upstream shapes (defensive: every field optional) and the normalized
 * domain models the UI consumes. Shapes below were verified against live
 * responses of the Filmy Flow API — see docs/API_CAPABILITIES.md.
 */

/* ------------------------------------------------------------------ raw */

export interface RawImage {
  url?: string
  width?: number
  height?: number
  blurHash?: string
  format?: string
}

export interface RawTrailer {
  videoAddress?: { url?: string; duration?: number; width?: number; height?: number; videoId?: string }
  cover?: RawImage
}

export interface RawDub {
  subjectId?: string
  lanName?: string
  lanCode?: string
  original?: boolean
  /** 0 = audio dub, 1 = subtitle-only variant (verified from live data) */
  type?: number
  detailPath?: string
}

export interface RawAccessStrategy {
  ruleType?: number
  requiredVipLevel?: number
  freeEpisodeCount?: number
  previewSeconds?: number
}

export interface RawStaff {
  staffId?: string
  staffType?: number
  name?: string
  character?: string
  avatarUrl?: string
  detailPath?: string
}

/** A subject as returned by /movies, /tv-series, /trending, /search, /home */
export interface RawSubject {
  subjectId?: string | number
  subjectType?: number
  title?: string
  description?: string
  releaseDate?: string
  duration?: number
  genre?: string
  cover?: RawImage | string
  countryName?: string
  imdbRatingValue?: string | number
  imdbRatingCount?: number
  subtitles?: string
  trailer?: RawTrailer | null
  detailPath?: string
  stills?: RawImage | null
  season?: number
  dubs?: RawDub[]
  corner?: string
  accessStrategy?: RawAccessStrategy | null
  hasResource?: boolean
  isPornographic?: boolean
  staffList?: RawStaff[]
  /** Legacy list endpoints return a flat cover + these convenience fields */
  rating?: string | number
  year?: string | number
}

export interface RawPager {
  hasMore?: boolean
  nextPage?: string | number
  page?: string | number
  perPage?: number
  totalCount?: number
}

export interface RawListResponse {
  page?: number
  items?: RawSubject[]
  pager?: RawPager
  upstream?: { data?: { pager?: RawPager; items?: RawSubject[] } }
}

export interface RawHomeBannerItem {
  subject?: RawSubject
  image?: RawImage
  detailPath?: string
  title?: string
}

export interface RawHomeSection {
  type?: string
  position?: number
  title?: string
  subjects?: RawSubject[]
  banner?: { items?: RawHomeBannerItem[] }
}

export interface RawHomeResponse {
  code?: number
  message?: string
  data?: {
    platformList?: { name?: string; uploadBy?: string }[]
    operatingList?: RawHomeSection[]
  }
}

export interface RawDetailResponse {
  subject?: RawSubject
  description?: string
  dubs?: RawDub[]
  cast?: RawStaff[]
  stars?: RawStaff[]
  crew?: RawStaff[]
  raw?: { code?: number; data?: { subject?: RawSubject; stars?: RawStaff[]; crew?: RawStaff[] } }
  postList?: unknown[]
  accessStrategy?: RawAccessStrategy | null
}

export interface RawStream {
  id?: string
  format?: string
  resolutions?: string
  size?: string | number
  duration?: number
  codecName?: string
  vipLocked?: boolean
  playable?: boolean
  url?: string
  proxy_url?: string
}

export interface RawPlayResponse {
  subjectId?: string
  detailPath?: string
  se?: number
  ep?: number
  streams?: RawStream[]
  upstream?: {
    data?: {
      streams?: RawStream[]
      dash?: RawStream[]
      hls?: RawStream[]
      hasResource?: boolean
      vipLocked?: boolean
      limited?: boolean
    }
  }
}

export interface RawCaption {
  id?: string
  lan?: string
  lanName?: string
  url?: string
  size?: string | number
  delay?: number
}

export interface RawCaptionResponse {
  code?: number
  message?: string
  data?: { captions?: RawCaption[] }
}

/* ----------------------------------------------------------- normalized */

export type TitleKind = 'movie' | 'series' | 'music'

export interface Title {
  id: string
  detailPath: string
  title: string
  kind: TitleKind
  subjectType: number
  year: number | null
  releaseDate: string | null
  rating: number | null
  ratingCount: number | null
  genres: string[]
  country: string | null
  durationSeconds: number | null
  overview: string
  poster: string | null
  backdrop: string | null
  blurHash: string | null
  trailerUrl: string | null
  /** Subtitle language labels advertised in `subject.subtitles` (CSV upstream). */
  subtitleLanguages: string[]
  /** Language variant detected from the title/slug (e.g. "Hindi" in "Colony [Hindi]"). */
  languageVariant: string | null
  season: number
  hasResource: boolean
  vipLevel: number | null
}

export interface DubTrack {
  subjectId: string
  detailPath: string
  label: string
  code: string | null
  original: boolean
  /** 'audio' → dubbed audio; 'subtitle' → subtitle-only variant */
  kind: 'audio' | 'subtitle'
}

export interface CastMember {
  id: string
  name: string
  role: string | null
  avatar: string | null
  department: 'cast' | 'director' | 'writer' | 'crew'
}

export interface TitleDetail {
  title: Title
  overview: string
  dubs: DubTrack[]
  cast: CastMember[]
  /** Seasons advertised by sibling catalogue entries (verified via /search). */
  seasons: number[]
  hasResource: boolean
}

export interface Quality {
  /** Upstream stream id — required by /caption for subtitle lookup. */
  id: string
  resolution: number
  label: string
  url: string
  /** Same track routed through the API's `/stream` proxy (CORS/referer safe). */
  proxyUrl: string | null
  format: 'MP4' | 'DASH' | 'HLS'
  sizeBytes: number | null
  durationSeconds: number | null
  codec: string | null
}

export interface PlaybackSource {
  qualities: Quality[]
  dashUrl: string | null
  hlsUrl: string | null
  durationSeconds: number | null
  hasResource: boolean
}

export interface SubtitleTrack {
  id: string
  code: string
  label: string
  url: string
  sizeBytes: number | null
}

export interface Platform {
  name: string
  curator: string | null
}

export interface HomeSection {
  id: string
  title: string
  type: string
  items: Title[]
  /** Banner art for BANNER sections (16:9 images) */
  images?: Record<string, string | null>
}

export interface Page<T> {
  items: T[]
  page: number
  hasMore: boolean
}

export type CatalogKind = 'movie' | 'series' | 'anime'

export type SortKey = 'recommended' | 'recent' | 'rating' | 'title'

export interface CatalogFilters {
  genres: string[]
  year: number | null
  country: string | null
  /** Subtitle language label, e.g. "हिन्दी" — matches subject.subtitles */
  subtitleLanguage: string | null
  /** Audio/language variant detected from the title, e.g. "Hindi" */
  audioLanguage: string | null
  minRating: number | null
  sort: SortKey
}
