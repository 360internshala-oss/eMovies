import { APP } from '@/config/app'
import { apiAbsoluteUrl } from '@/services/apiClient'
import { requestText } from '@/services/apiClient'
import { createVttBlobUrl, srtToVtt } from './srt'

/**
 * Download an SRT track and convert it into a local WebVTT blob URL.
 *
 * Two routes are attempted, in order:
 * 1. The API's documented media proxy (`/stream?u=…`) which forwards the signed
 *    CDN file with CORS headers.
 * 2. The signed CDN URL directly (works when the CDN allows cross-origin reads).
 */
export async function loadSubtitleTrack(url: string, signal?: AbortSignal): Promise<{ vttUrl: string; cueCount: number }> {
  const attempts = [`${apiAbsoluteUrl('/stream')}?u=${encodeURIComponent(url)}`, url]
  let lastError: unknown = null

  for (const candidate of attempts) {
    if (signal?.aborted) break
    try {
      const text = await requestText(candidate, { signal, timeoutMs: Math.max(12000, APP.requestTimeoutMs) })
      if (!text || text.trim().length === 0) continue
      const looksLikeHtml = /^\s*<(!doctype|html)/i.test(text)
      if (looksLikeHtml) continue

      const vtt = text.trimStart().startsWith('WEBVTT') ? text : srtToVtt(text)
      const cueCount = (vtt.match(/-->/g) ?? []).length
      if (cueCount === 0) continue
      return { vttUrl: createVttBlobUrl(vtt), cueCount }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error('Subtitle file could not be loaded.')
}
