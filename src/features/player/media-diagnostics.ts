/**
 * Media URL diagnostics.
 *
 * `<video>` reports `MEDIA_ERR_SRC_NOT_SUPPORTED` for anything that is not
 * decodable media — including HTTP errors, HTML error pages and expired signed
 * links. That tells the user nothing actionable, so when playback fails we make
 * one small ranged request to the same URL and read the real status code. The
 * CDN we use sends `access-control-allow-origin: *`, so the response is
 * readable from the browser; if it is not, we simply fall back to a generic
 * message.
 */

export interface MediaProbe {
  /** HTTP status, or 0 when the request never produced a response. */
  status: number
  contentType: string | null
  /** Short, human-readable explanation of what happened. */
  summary: string
  /** true when a fresh /play response may help (expired/refused signature). */
  refreshable: boolean
  /** true when the host never answered (offline, DNS, CORS or blocked network). */
  unreachable: boolean
}

const EMPTY: MediaProbe = {
  status: 0,
  contentType: null,
  summary: 'The stream host could not be reached.',
  refreshable: false,
  unreachable: true,
}

function describeStatus(status: number, contentType: string | null): MediaProbe {
  const type = (contentType ?? '').toLowerCase()
  if (status >= 200 && status < 300) {
    // The host accepted the request: the browser is the problem (codec/container).
    if (type && !type.startsWith('video/') && !type.startsWith('application/octet-stream') && !type.includes('mp4')) {
      return {
        status,
        contentType,
        summary: `The stream host returned ${type || 'an unexpected'} content instead of a video file.`,
        refreshable: false,
        unreachable: false,
      }
    }
    return {
      status,
      contentType,
      summary: 'The stream downloaded, but this browser cannot decode its codec.',
      refreshable: false,
      unreachable: false,
    }
  }
  if (status === 401 || status === 403) {
    return {
      status,
      contentType,
      summary: 'The signed stream link was refused (403). It has probably expired.',
      refreshable: true,
      unreachable: false,
    }
  }
  if (status === 404 || status === 410) {
    return {
      status,
      contentType,
      summary: `The stream is no longer available on the host (${status}).`,
      refreshable: true,
      unreachable: false,
    }
  }
  if (status === 429) {
    return {
      status,
      contentType,
      summary: 'The stream host is rate-limiting this connection (429). Wait a moment, then retry.',
      refreshable: true,
      unreachable: false,
    }
  }
  if (status >= 500) {
    return {
      status,
      contentType,
      summary: `The stream host returned a server error (${status}).`,
      refreshable: true,
      unreachable: false,
    }
  }
  return {
    status,
    contentType,
    summary: `The stream host rejected the request (HTTP ${status}).`,
    refreshable: status >= 400 && status < 500,
    unreachable: false,
  }
}

/**
 * Requests the first two bytes of the media file and classifies the response.
 * Never throws.
 */
export async function probeMedia(url: string, signal?: AbortSignal): Promise<MediaProbe> {
  if (!url) return EMPTY
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1' },
      // No credentials: the CDN only signs the URL.
      credentials: 'omit',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ...EMPTY, summary: 'The stream check was cancelled.' }
    }
    // A blocked/failed fetch is usually CORS, DNS or an ISP-level block.
    return {
      ...EMPTY,
      summary: 'The stream host could not be reached from this network (blocked, offline or CORS-refused).',
    }
  }

  const contentType = response.headers.get('content-type')
  // We only need the headers; drop the body so the range request stays cheap.
  try {
    await response.body?.cancel()
  } catch {
    /* ignore */
  }
  return describeStatus(response.status, contentType)
}

export const __testing = { describeStatus }
