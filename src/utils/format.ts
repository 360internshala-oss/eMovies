/** Formatting helpers shared across the UI. */

export function formatRuntime(seconds?: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/** Player clock: 1:04:09 / 4:09 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatRemaining(position: number, duration: number): string {
  if (!duration || duration <= 0) return '--:--'
  return `-${formatTime(Math.max(0, duration - position))}`
}

export function formatRating(rating?: number | string | null): string | null {
  const n = typeof rating === 'string' ? Number.parseFloat(rating) : rating
  if (n === null || n === undefined || !Number.isFinite(n) || n <= 0) return null
  return n.toFixed(1)
}

export function formatCount(count?: number | null): string | null {
  if (!count || count <= 0) return null
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return String(count)
}

export function formatBytes(bytes?: number | string | null): string | null {
  const n = typeof bytes === 'string' ? Number.parseFloat(bytes) : bytes
  if (!n || !Number.isFinite(n) || n <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = n
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function yearOf(date?: string | null): number | null {
  if (!date) return null
  const match = /^(\d{4})/.exec(date)
  if (!match) return null
  const year = Number.parseInt(match[1], 10)
  return year > 1880 && year < 2200 ? year : null
}

export function formatDate(date?: string | null): string | null {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return yearOf(date)?.toString() ?? null
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function relativeTime(timestamp?: number | null): string | null {
  if (!timestamp) return null
  const diff = Date.now() - timestamp
  if (diff < 0) return 'just now'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** 0..1 → percentage string, defensive against NaN. */
export function progressPercent(position: number, duration: number): number {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return 0
  return Math.min(100, Math.max(0, (position / duration) * 100))
}

export function truncate(text: string, max = 160): string {
  const clean = text.trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trimEnd()}…`
}

export function episodeLabel(season?: number | null, episode?: number | null): string | null {
  const hasSeason = typeof season === 'number' && season > 0
  const hasEpisode = typeof episode === 'number' && episode > 0
  if (!hasSeason && !hasEpisode) return null
  const s = String(season ?? 0).padStart(2, '0')
  const e = String(episode ?? 0).padStart(2, '0')
  return hasSeason && hasEpisode ? `S${s} · E${e}` : hasSeason ? `Season ${season}` : `Episode ${episode}`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
