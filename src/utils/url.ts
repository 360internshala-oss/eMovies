/**
 * URL safety helpers.
 *
 * All external media URLs (images, trailers, streams, subtitles) come from an
 * untrusted API. They are validated before being handed to the DOM so that a
 * compromised/incorrect response can never inject `javascript:` or `data:`
 * handlers.
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'blob:'])

export function isSafeUrl(value: unknown, opts: { allowBlob?: boolean } = {}): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false
  try {
    const base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const url = new URL(value, base)
    if (url.protocol === 'blob:') return opts.allowBlob === true
    return SAFE_PROTOCOLS.has(url.protocol)
  } catch {
    return false
  }
}

/** Returns the URL when safe, otherwise `undefined` (never throws). */
export function safeUrl(value: unknown, opts: { allowBlob?: boolean } = {}): string | undefined {
  return isSafeUrl(value, opts) ? (value as string) : undefined
}

/** Make a possibly-relative URL absolute against a base. */
export function absoluteUrl(path: string, base: string): string {
  try {
    return new URL(path, base.endsWith('/') ? base : `${base}/`).toString()
  } catch {
    return path
  }
}

/** Ensures https for protocol-relative URLs returned by some CDNs. */
export function normalizeAssetUrl(value: unknown, base?: string): string | undefined {
  if (typeof value !== 'string') return undefined
  let candidate = value.trim()
  if (!candidate) return undefined
  if (candidate.startsWith('//')) candidate = `https:${candidate}`
  if (candidate.startsWith('/') && base) candidate = absoluteUrl(candidate, base)
  return safeUrl(candidate)
}

/** Upstream slugs are URL-safe, but never trust them blindly in a route. */
export function isSafeSlug(slug: string): boolean {
  return /^[A-Za-z0-9._~-]{1,240}$/.test(slug)
}

/** Build a query string, skipping empty values. */
export function toQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '' || value === false) continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
