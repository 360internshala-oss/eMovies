import { SUBTITLE_LANGUAGES } from '@/config/app'

/** Language helpers for subtitles, dubs and the language filters. */

const byCode = new Map(SUBTITLE_LANGUAGES.map((language) => [language.code, language]))
const byLabel = new Map(SUBTITLE_LANGUAGES.map((language) => [language.label.toLowerCase(), language]))

export function languageByCode(code?: string | null): { code: string; label: string; native?: string } | undefined {
  if (!code) return undefined
  return byCode.get(code.toLowerCase())
}

export function languageLabel(code?: string | null): string {
  if (!code) return 'Unknown'
  return languageByCode(code)?.label ?? code.toUpperCase()
}

/** Map an upstream display name (`हिन्दी`, `Español`, `in_id`) to a code. */
export function codeForLabel(label?: string | null): string | undefined {
  if (!label) return undefined
  const normalized = label.trim()
  const direct = byLabel.get(normalized.toLowerCase())
  if (direct) return direct.code
  const found = SUBTITLE_LANGUAGES.find(
    (language) => language.native?.toLowerCase() === normalized.toLowerCase() || language.code.toLowerCase() === normalized.toLowerCase(),
  )
  return found?.code
}

export function isRtlLanguage(code?: string | null): boolean {
  if (!code) return false
  return ['ar', 'ur', 'fa', 'he', 'ps', 'sd'].includes(code.toLowerCase())
}

/** Human description of a dub/subtitle variant coming from `/detail.dubs`. */
export function describeDub(track: { label: string; kind: 'audio' | 'subtitle'; original: boolean; code: string | null }): string {
  if (track.original) return 'Original audio'
  if (track.kind === 'subtitle') return `${track.label} subtitles`
  return `${track.label} audio`
}

export const LANGUAGE_FILTER_OPTIONS = SUBTITLE_LANGUAGES.map((language) => ({
  value: language.label,
  code: language.code,
  label: language.native ? `${language.label} · ${language.native}` : language.label,
}))
