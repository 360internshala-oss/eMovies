/**
 * Subtitle helpers.
 *
 * The API serves `.srt` files. HTML5 <track> requires WebVTT, so the file is
 * fetched (through the API's documented `/stream` proxy to sidestep CDN CORS)
 * and converted locally into a blob URL. Nothing is uploaded anywhere.
 */

/** Convert SubRip text to WebVTT. Tolerates BOMs, CRLF, missing indices and HTML tags. */
export function srtToVtt(srt: string): string {
  const normalized = srt
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\{\\[^}]*\}/g, '') // strip ASS-style inline overrides
    .trim()

  if (!normalized) return 'WEBVTT\n\n'

  const blocks = normalized.split(/\n{2,}/)
  const cues: string[] = []

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim().length > 0)
    if (lines.length === 0) continue

    const timeIndex = lines.findIndex((line) => line.includes('-->'))
    if (timeIndex === -1) continue

    const timeLine = lines[timeIndex]
      .replace(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/g, (_, h, m, s, ms) => `${h}:${m}:${s}.${String(ms).padEnd(3, '0')}`)
      .replace(/(\d{2}:\d{2})[,.](\d{1,3})/g, (_match, mmss, ms) => `${mmss}.${String(ms).padEnd(3, '0')}`)
      .trim()

    const text = lines
      .slice(timeIndex + 1)
      .join('\n')
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '')
      .trim()

    if (text) cues.push(`${timeLine}\n${text}`)
  }

  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

/** Parse "WEBVTT" text back for tests/debugging. */
export function countCues(vtt: string): number {
  return (vtt.match(/-->/g) ?? []).length
}

/** Build a blob URL for a VTT document; caller is responsible for revoking it. */
export function createVttBlobUrl(vtt: string): string {
  const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' })
  return URL.createObjectURL(blob)
}

export function revokeBlobUrl(url?: string | null): void {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* noop */
    }
  }
}
