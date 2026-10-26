import { apiAbsoluteUrl } from './apiClient'
import { normalizeAssetUrl } from '@/utils/url'
import { yearOf } from '@/utils/format'
import type {
  CastMember,
  DubTrack,
  HomeSection,
  Page,
  Platform,
  PlaybackSource,
  Quality,
  RawCaptionResponse,
  RawDetailResponse,
  RawDub,
  RawHomeResponse,
  RawImage,
  RawListResponse,
  RawPlayResponse,
  RawStaff,
  RawSubject,
  SubtitleTrack,
  Title,
  TitleDetail,
  TitleKind,
} from './types'

/* --------------------------------------------------------------- helpers */

const MAX_REASONABLE_YEAR = new Date().getFullYear() + 3

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function imageUrl(image?: RawImage | string | null): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return normalizeAssetUrl(image)
  return normalizeAssetUrl(image.url)
}

function blurHashOf(image?: RawImage | string | null): string | null {
  if (!image || typeof image === 'string') return null
  const value = image.blurHash?.trim()
  return value && value.length > 8 ? value : null
}

export function splitCsv(value?: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/** Language names that appear as `[Hindi]`, `(Hindi)` or a `-hindi-` slug segment. */
const LANGUAGE_NAMES = [
  'Hindi',
  'English',
  'Urdu',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Bengali',
  'Punjabi',
  'Marathi',
  'Gujarati',
  'Arabic',
  'Spanish',
  'French',
  'Portuguese',
  'Russian',
  'Indonesian',
  'Malay',
  'Filipino',
  'Korean',
  'Japanese',
  'Chinese',
  'Thai',
  'Vietnamese',
  'Turkish',
]

export function detectLanguageVariant(title: string, detailPath?: string): string | null {
  for (const language of LANGUAGE_NAMES) {
    const bracket = new RegExp(`[[(]\\s*${language}\\b[^\\])]*[\\])]`, 'i')
    if (bracket.test(title)) return language
  }
  const slug = detailPath?.toLowerCase() ?? ''
  for (const language of LANGUAGE_NAMES) {
    const needle = `-${language.toLowerCase()}-`
    if (slug.includes(needle)) return language
  }
  return null
}

function kindOf(subjectType: number): TitleKind {
  if (subjectType === 1) return 'movie'
  if (subjectType === 2) return 'series'
  return 'music'
}

/** Best-effort deep search for the first array of subjects in an unknown payload. */
export function extractSubjectArray(payload: unknown): RawSubject[] {
  if (!payload || typeof payload !== 'object') return []
  const queue: unknown[] = [payload]
  let visited = 0
  while (queue.length > 0 && visited < 40) {
    visited += 1
    const current = queue.shift()
    if (Array.isArray(current)) {
      if (current.length > 0 && current.every((item) => item && typeof item === 'object')) {
        const looksLikeSubjects = current.some(
          (item) => typeof (item as RawSubject).subjectId === 'string' || typeof (item as RawSubject).title === 'string',
        )
        if (looksLikeSubjects) return current as RawSubject[]
      }
      continue
    }
    if (current && typeof current === 'object') {
      for (const key of ['items', 'subjectList', 'subjects', 'list', 'data', 'result']) {
        const value = (current as Record<string, unknown>)[key]
        if (value) queue.push(value)
      }
      for (const value of Object.values(current as Record<string, unknown>)) {
        if (value && typeof value === 'object') queue.push(value)
      }
    }
  }
  return []
}

/* -------------------------------------------------------------- subjects */

export function normalizeSubject(raw: RawSubject | null | undefined): Title | null {
  if (!raw || typeof raw !== 'object') return null
  // Never surface adult content — the upstream flags it explicitly.
  if (raw.isPornographic === true) return null

  const id = raw.subjectId !== undefined && raw.subjectId !== null ? String(raw.subjectId) : ''
  const detailPath = typeof raw.detailPath === 'string' ? raw.detailPath.trim() : ''
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!detailPath || !title) return null

  const subjectType = typeof raw.subjectType === 'number' ? raw.subjectType : raw.detailPath?.startsWith('') ? 1 : 0
  const releaseDate = typeof raw.releaseDate === 'string' && raw.releaseDate.length >= 4 ? raw.releaseDate : null
  const listedYear = asNumber(raw.year)
  const derivedYear = yearOf(releaseDate)
  const year = listedYear && listedYear > 1880 && listedYear <= MAX_REASONABLE_YEAR ? listedYear : derivedYear

  const poster = imageUrl(raw.cover) ?? null
  const backdrop = imageUrl(raw.stills) ?? poster

  const dubs: RawDub[] = Array.isArray(raw.dubs) ? raw.dubs : []
  const dubLanguages = dubs
    .filter((dub) => dub?.type === 0 && dub.original !== true && typeof dub.lanName === 'string')
    .map((dub) => (dub.lanName as string).replace(/\s*(dub|doblaje)\s*$/i, '').trim())

  const variant = detectLanguageVariant(title, detailPath) ?? dubLanguages[0] ?? null

  return {
    id: id || detailPath,
    detailPath,
    title,
    kind: kindOf(subjectType),
    subjectType,
    year,
    releaseDate,
    rating: asNumber(raw.imdbRatingValue) ?? asNumber(raw.rating),
    ratingCount: asNumber(raw.imdbRatingCount),
    genres: splitCsv(raw.genre),
    country: typeof raw.countryName === 'string' && raw.countryName.trim() ? raw.countryName.trim() : null,
    durationSeconds: asNumber(raw.duration),
    overview: typeof raw.description === 'string' ? raw.description.trim() : '',
    poster,
    backdrop,
    blurHash: blurHashOf(raw.stills) ?? blurHashOf(raw.cover),
    trailerUrl: normalizeAssetUrl(raw.trailer?.videoAddress?.url) ?? null,
    subtitleLanguages: splitCsv(raw.subtitles),
    languageVariant: variant,
    season: asNumber(raw.season) ?? 0,
    hasResource: raw.hasResource !== false,
    vipLevel: asNumber(raw.accessStrategy?.requiredVipLevel),
  }
}

export function dedupeTitles(items: Title[]): Title[] {
  const seen = new Set<string>()
  const out: Title[] = []
  for (const item of items) {
    const key = `${item.detailPath}|${item.season}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/* ----------------------------------------------------------------- lists */

export function normalizeList(payload: unknown): Page<Title> {
  const record = (payload ?? {}) as RawListResponse
  const fromItems = Array.isArray(record.items) ? record.items : []
  const fromUpstream = Array.isArray(record.upstream?.data?.items) ? record.upstream?.data?.items ?? [] : []
  const rawItems = fromItems.length > 0 ? fromItems : fromUpstream
  const pager = record.pager ?? record.upstream?.data?.pager ?? {}
  const items = dedupeTitles(rawItems.map(normalizeSubject).filter((item): item is Title => item !== null))

  return {
    items,
    page: asNumber(record.page) ?? asNumber(pager.page) ?? 1,
    // The upstream reports `totalCount: 1000000` (a placeholder) — only trust hasMore.
    hasMore: pager.hasMore === true && items.length > 0,
  }
}

/* ------------------------------------------------------------------ home */

export function normalizeHome(payload: unknown): { sections: HomeSection[]; platforms: Platform[] } {
  const response = (payload ?? {}) as RawHomeResponse
  const data = response.data ?? {}
  const platforms: Platform[] = Array.isArray(data.platformList)
    ? data.platformList
        .filter((p) => typeof p?.name === 'string' && p.name.trim().length > 0)
        .map((p) => ({ name: (p.name as string).trim(), curator: p.uploadBy?.trim() || null }))
    : []

  const sections: HomeSection[] = []
  const operating = Array.isArray(data.operatingList) ? data.operatingList : []

  for (const [index, rawSection] of operating.entries()) {
    const type = (rawSection.type ?? 'LIST').toUpperCase()
    const rawItems: RawSubject[] = []
    const images: Record<string, string | null> = {}

    if (Array.isArray(rawSection.banner?.items)) {
      for (const bannerItem of rawSection.banner.items) {
        if (bannerItem?.subject) {
          rawItems.push(bannerItem.subject)
          const art = imageUrl(bannerItem.image)
          if (art && bannerItem.subject.detailPath) images[bannerItem.subject.detailPath] = art
        }
      }
    }
    if (Array.isArray(rawSection.subjects)) rawItems.push(...rawSection.subjects)

    const items = dedupeTitles(rawItems.map(normalizeSubject).filter((item): item is Title => item !== null))
    if (items.length === 0) continue

    sections.push({
      id: `${index}-${rawSection.position ?? index}`,
      title: rawSection.title?.replace(/_/g, ' ').trim() || `Collection ${index + 1}`,
      type,
      items,
      images: Object.keys(images).length > 0 ? images : undefined,
    })
  }

  return { sections, platforms }
}

/* ---------------------------------------------------------------- detail */

function cleanDubLabel(label: string): { label: string; kind: 'audio' | 'subtitle' } {
  const trimmed = label.trim()
  if (/\bsub\b/i.test(trimmed)) {
    return { label: trimmed.replace(/\s*sub\b/i, '').trim() || trimmed, kind: 'subtitle' }
  }
  if (/\bdub\b/i.test(trimmed)) {
    return { label: trimmed.replace(/\s*dub\b/i, '').trim() || trimmed, kind: 'audio' }
  }
  return { label: trimmed, kind: 'audio' }
}

export function normalizeDubs(rawDubs: RawDub[] | undefined): DubTrack[] {
  if (!Array.isArray(rawDubs)) return []
  const seen = new Set<string>()
  const out: DubTrack[] = []
  for (const dub of rawDubs) {
    if (!dub || typeof dub.detailPath !== 'string' || !dub.detailPath.trim()) continue
    const lanName = typeof dub.lanName === 'string' && dub.lanName.trim() ? dub.lanName.trim() : 'Original Audio'
    const original = dub.original === true
    const { label, kind } = original ? { label: 'Original Audio', kind: 'audio' as const } : cleanDubLabel(lanName)
    const key = `${dub.detailPath}|${kind}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      subjectId: dub.subjectId !== undefined ? String(dub.subjectId) : '',
      detailPath: dub.detailPath,
      label,
      code: typeof dub.lanCode === 'string' ? dub.lanCode : null,
      original,
      kind: dub.type === 1 ? 'subtitle' : kind,
    })
  }
  // Original audio first, then alphabetically by label.
  return out.sort((a, b) => Number(b.original) - Number(a.original) || a.label.localeCompare(b.label))
}

function departmentOf(staff: RawStaff): CastMember['department'] {
  const role = (staff.character ?? '').toLowerCase()
  if (staff.staffType === 2 || role === 'director') return 'director'
  if (staff.staffType === 3 || role === 'writer') return 'writer'
  if (staff.staffType === 1) return 'cast'
  return 'crew'
}

export function normalizeCast(raw: RawDetailResponse): CastMember[] {
  const candidates: RawStaff[] = [
    ...(Array.isArray(raw.cast) ? raw.cast : []),
    ...(Array.isArray(raw.stars) ? raw.stars : []),
    ...(Array.isArray(raw.crew) ? raw.crew : []),
    ...(Array.isArray(raw.raw?.data?.stars) ? raw.raw?.data?.stars ?? [] : []),
    ...(Array.isArray(raw.raw?.data?.crew) ? raw.raw?.data?.crew ?? [] : []),
  ]

  const seen = new Set<string>()
  const out: CastMember[] = []
  for (const staff of candidates) {
    if (!staff || typeof staff.name !== 'string' || !staff.name.trim()) continue
    const department = departmentOf(staff)
    const role = typeof staff.character === 'string' && staff.character.trim() ? staff.character.trim() : null
    const key = `${staff.staffId ?? staff.name}|${role ?? department}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: staff.staffId ? String(staff.staffId) : staff.detailPath ?? staff.name,
      name: staff.name.trim(),
      role,
      avatar: normalizeAssetUrl(staff.avatarUrl) ?? null,
      department,
    })
  }
  return out.slice(0, 40)
}

export function normalizeDetail(payload: unknown, seasons: number[] = []): TitleDetail | null {
  const raw = (payload ?? {}) as RawDetailResponse
  const rawSubject = raw.subject ?? raw.raw?.data?.subject
  const baseTitle = normalizeSubject(rawSubject)
  if (!baseTitle) return null

  const overview = (raw.description ?? baseTitle.overview ?? '').trim()
  return {
    title: { ...baseTitle, overview: overview || baseTitle.overview },
    overview,
    dubs: normalizeDubs(raw.dubs),
    cast: normalizeCast(raw),
    seasons,
    hasResource: baseTitle.hasResource,
  }
}

/* ------------------------------------------------------------------ play */

function parseResolution(value?: string): number {
  if (!value) return 0
  const match = /(\d{3,4})/.exec(value)
  const n = match ? Number.parseInt(match[1], 10) : 0
  // Normalise the odd 144/240/360/480/540/720/1080/1440/2160 ladder values.
  return Number.isFinite(n) ? n : 0
}

function toQuality(stream: NonNullable<RawPlayResponse['streams']>[number], format: Quality['format']): Quality | null {
  const url = typeof stream.url === 'string' ? stream.url : ''
  if (!url) return null
  const resolution = parseResolution(stream.resolutions)
  const sizeBytes = asNumber(stream.size)
  const proxy = typeof stream.proxy_url === 'string' && stream.proxy_url.startsWith('/')
    ? apiAbsoluteUrl(stream.proxy_url)
    : null
  return {
    id: stream.id !== undefined ? String(stream.id) : '',
    resolution,
    label: resolution > 0 ? `${resolution}p` : format,
    url,
    proxyUrl: proxy,
    format,
    sizeBytes: sizeBytes && sizeBytes > 0 ? sizeBytes : null,
    durationSeconds: asNumber(stream.duration),
    codec: typeof stream.codecName === 'string' ? stream.codecName : null,
  }
}

export function normalizePlay(payload: unknown): PlaybackSource {
  const raw = (payload ?? {}) as RawPlayResponse
  const upstream = raw.upstream?.data
  const mp4Streams = Array.isArray(raw.streams) && raw.streams.length > 0 ? raw.streams : upstream?.streams ?? []

  const qualities: Quality[] = []
  const seen = new Set<number>()
  for (const stream of mp4Streams) {
    const quality = toQuality(stream, 'MP4')
    if (!quality) continue
    const signature = quality.resolution
    if (signature > 0 && seen.has(signature)) continue
    if (signature > 0) seen.add(signature)
    qualities.push(quality)
  }
  qualities.sort((a, b) => b.resolution - a.resolution)

  const dash = Array.isArray(upstream?.dash) ? upstream?.dash[0] : undefined
  const hls = Array.isArray(upstream?.hls) ? upstream?.hls[0] : undefined

  return {
    qualities,
    dashUrl: dash?.url && typeof dash.url === 'string' ? dash.url : null,
    hlsUrl: hls?.url && typeof hls.url === 'string' ? hls.url : null,
    durationSeconds: qualities[0]?.durationSeconds ?? null,
    hasResource: qualities.length > 0 || Boolean(dash?.url) || Boolean(hls?.url),
  }
}

/** Highest quality whose resolution is ≤ the screen budget, else the lowest. */
export function pickDefaultQuality(qualities: Quality[], maxHeight = 1080): Quality | null {
  if (qualities.length === 0) return null
  const sorted = [...qualities].sort((a, b) => b.resolution - a.resolution)
  const withinBudget = sorted.find((q) => q.resolution > 0 && q.resolution <= maxHeight)
  return withinBudget ?? sorted[sorted.length - 1] ?? null
}

/* -------------------------------------------------------------- captions */

const CAPTION_CODE_FIXES: Record<string, string> = {
  in_id: 'id',
  ptbr: 'pt',
  esla: 'es',
  zhtw: 'zh',
  zhcn: 'zh',
}

export function normalizeCaptions(payload: unknown): SubtitleTrack[] {
  const response = (payload ?? {}) as RawCaptionResponse
  const captions = response.data?.captions
  if (!Array.isArray(captions)) return []
  return captions
    .filter((caption) => typeof caption?.url === 'string' && caption.url.startsWith('http'))
    .map((caption) => {
      const rawCode = (caption.lan ?? '').toLowerCase()
      const code = CAPTION_CODE_FIXES[rawCode] ?? (rawCode || 'und')
      return {
        id: caption.id ?? `${code}-${caption.url?.slice(-12)}`,
        code,
        label: caption.lanName?.trim() || code.toUpperCase(),
        url: caption.url as string,
        sizeBytes: asNumber(caption.size),
      }
    })
}

/* ------------------------------------------------------------- filtering */

export function normalizeSearchKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
