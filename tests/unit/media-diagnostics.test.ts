import { afterEach, describe, expect, it, vi } from 'vitest'
import { probeMedia } from '@/features/player/media-diagnostics'

/** Builds a fetch stub with a single canned response. */
function stubFetch(impl: () => Promise<Response>) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

function response(status: number, contentType?: string) {
  return new Response(null, { status, headers: contentType ? { 'content-type': contentType } : undefined })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('probeMedia', () => {
  it('reports a healthy video response', async () => {
    stubFetch(async () => response(206, 'video/mp4'))
    const probe = await probeMedia('https://cdn/x.mp4?sign=1')
    expect(probe).toMatchObject({ status: 206, contentType: 'video/mp4', refreshable: false, unreachable: false })
    expect(probe.summary).toMatch(/download|decode|video/i)
  })

  it('flags a rate-limited host as retryable', async () => {
    stubFetch(async () => response(429, 'text/html'))
    const probe = await probeMedia('https://cdn/x.mp4')
    expect(probe.status).toBe(429)
    expect(probe.refreshable).toBe(true)
    expect(probe.summary).toMatch(/rate-limit/i)
  })

  it('treats 403 as an expired signature', async () => {
    stubFetch(async () => response(403, 'text/html'))
    const probe = await probeMedia('https://cdn/x.mp4')
    expect(probe.refreshable).toBe(true)
    expect(probe.summary).toMatch(/refused|expired/i)
  })

  it('recognises an HTML error page served with a 200', async () => {
    stubFetch(async () => response(200, 'text/html'))
    const probe = await probeMedia('https://cdn/x.mp4')
    expect(probe.refreshable).toBe(false)
    expect(probe.summary).toMatch(/text\/html|instead of a video/i)
  })

  it('survives an unreachable host without throwing', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const probe = await probeMedia('https://cdn/x.mp4')
    expect(probe.unreachable).toBe(true)
    expect(probe.status).toBe(0)
    expect(probe.summary).toMatch(/could not be reached/i)
  })

  it('sends a ranged, credential-free request', async () => {
    const spy = stubFetch(async () => response(200, 'video/mp4'))
    await probeMedia('https://cdn/x.mp4')
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://cdn/x.mp4')
    expect(init.method).toBe('GET')
    expect((init.headers as Record<string, string>).Range).toBe('bytes=0-1')
    expect(init.credentials).toBe('omit')
  })

  it('returns a neutral probe for an empty URL', async () => {
    const probe = await probeMedia('')
    expect(probe.status).toBe(0)
    expect(probe.unreachable).toBe(true)
  })
})
