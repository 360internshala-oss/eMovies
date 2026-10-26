import { APP } from '@/config/app'

/**
 * Thin, defensive HTTP client for the Filmy Flow API.
 *
 * - Abortable (every request accepts an external AbortSignal)
 * - Timeout guarded
 * - One safe retry for idempotent GETs on transient failures
 * - Never throws on malformed JSON: it raises a typed ApiError instead
 * - Optional same-origin proxy mode (see README → CORS & proxy mode)
 */

export type ApiErrorKind = 'offline' | 'timeout' | 'network' | 'http' | 'parse' | 'aborted' | 'invalid'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly path: string

  constructor(kind: ApiErrorKind, message: string, path: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.path = path
    this.status = status
  }
}

export interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
  retries?: number
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  if (params) {
    for (const [rawKey, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') continue
      search.set(rawKey, String(value))
    }
  }
  const query = search.toString()
  const suffix = query ? `${path}?${query}` : path

  if (APP.useProxy) {
    // Same-origin proxy: the server decides the upstream host (never user input).
    return `/api-proxy?path=${encodeURIComponent(suffix)}`
  }
  return `${APP.apiBaseUrl}${suffix}`
}

/** Absolute URL on the API host (used for `/stream` media + subtitle proxy). */
export function apiAbsoluteUrl(path: string): string {
  return `${APP.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError')
  )
}

/**
 * Combines an external signal with an internal timeout so a slow upstream can
 * never leave the UI spinning forever.
 */
function withTimeout(external: AbortSignal | undefined, ms: number) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ms)

  const onAbort = () => controller.abort()
  if (external) {
    if (external.aborted) controller.abort()
    else external.addEventListener('abort', onAbort, { once: true })
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onAbort)
    },
  }
}

export async function requestJson<T>(path: string, params?: Record<string, string | number | boolean | null | undefined>, options: RequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = APP.requestTimeoutMs, retries = 1 } = options
  const url = buildUrl(path, params)

  let attempt = 0
  // Deliberately small retry budget — the upstream is a public, rate-limited API.
  while (attempt <= retries) {
    attempt += 1
    const timeout = withTimeout(signal, timeoutMs)
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new ApiError('offline', 'You appear to be offline.', path)
      }

      const response = await fetch(url, {
        signal: timeout.signal,
        mode: APP.useProxy ? 'same-origin' : 'cors',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (response.status === 429) {
        throw new ApiError('http', 'The catalogue API is rate limiting requests. Please retry in a moment.', path, 429)
      }
      if (!response.ok) {
        throw new ApiError('http', `The catalogue API responded with ${response.status}.`, path, response.status)
      }

      const text = await response.text()
      if (!text || text.trim().length === 0) {
        throw new ApiError('parse', 'The catalogue API returned an empty response.', path, response.status)
      }
      try {
        return JSON.parse(text) as T
      } catch {
        throw new ApiError('parse', 'The catalogue API returned malformed JSON.', path, response.status)
      }
    } catch (error) {
      if (isAbortError(error)) {
        if (timeout.didTimeout()) {
          if (attempt > retries) throw new ApiError('timeout', 'The catalogue API took too long to respond.', path)
        } else {
          throw new ApiError('aborted', 'Request cancelled.', path)
        }
      } else if (error instanceof ApiError) {
        // Retry only transient failures.
        const transient = error.kind === 'network' || (error.kind === 'http' && (error.status ?? 0) >= 500)
        if (!transient || attempt > retries) throw error
      } else {
        if (attempt > retries) {
          throw new ApiError(
            'network',
            'Could not reach the catalogue API. This is usually a network or CORS restriction.',
            path,
          )
        }
      }
      timeout.cleanup()
      await new Promise((resolve) => setTimeout(resolve, 450 * attempt))
      continue
    } finally {
      timeout.cleanup()
    }
  }

  throw new ApiError('network', 'Could not reach the catalogue API.', path)
}

/** Fetch plain text (used for SRT subtitle files). */
export async function requestText(url: string, options: RequestOptions = {}): Promise<string> {
  const { signal, timeoutMs = APP.requestTimeoutMs } = options
  const timeout = withTimeout(signal, timeoutMs)
  try {
    const response = await fetch(url, { signal: timeout.signal, credentials: 'omit', cache: 'no-store' })
    if (!response.ok) throw new ApiError('http', `Subtitle request failed (${response.status}).`, url, response.status)
    return await response.text()
  } catch (error) {
    if (isAbortError(error)) throw new ApiError('aborted', 'Request cancelled.', url)
    if (error instanceof ApiError) throw error
    throw new ApiError('network', 'Could not download the subtitle file.', url)
  } finally {
    timeout.cleanup()
  }
}

export function isAborted(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'aborted'
}

export function describeError(error: unknown): { title: string; message: string; retryable: boolean } {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'offline':
        return { title: 'You are offline', message: 'Reconnect to load the catalogue. Cached pages stay available.', retryable: true }
      case 'timeout':
        return { title: 'The API timed out', message: 'The catalogue API did not answer in time. Try again.', retryable: true }
      case 'network':
        return {
          title: 'Catalogue unavailable',
          message:
            'The browser could not reach the Filmy Flow API. Check your connection, or enable proxy mode if this deployment blocks cross-origin requests.',
          retryable: true,
        }
      case 'parse':
        return { title: 'Unexpected response', message: error.message, retryable: true }
      case 'http':
        return {
          title: error.status === 404 ? 'Not found' : 'The API returned an error',
          message: error.message,
          retryable: (error.status ?? 500) >= 500,
        }
      case 'aborted':
        return { title: 'Cancelled', message: 'The request was cancelled.', retryable: false }
      default:
        return { title: 'Something went wrong', message: error.message, retryable: true }
    }
  }
  return {
    title: 'Something went wrong',
    message: error instanceof Error ? error.message : 'Unknown error.',
    retryable: true,
  }
}
