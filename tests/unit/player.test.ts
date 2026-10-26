import { describe, expect, it } from 'vitest'
import { countCues, srtToVtt } from '@/features/player/srt'
import { FEATURES, CAPABILITIES, capabilityStatus } from '@/services/capabilities'
import { isSafeSlug, isSafeUrl, normalizeAssetUrl, safeUrl, toQuery } from '@/utils/url'
import { languageByCode, codeForLabel, describeDub, isRtlLanguage } from '@/services/languages'
import { formatTime, formatRemaining, formatRuntime, episodeLabel, progressPercent } from '@/utils/format'
import { pickDefaultQuality } from '@/services/normalize'
import type { Quality } from '@/services/types'

const srt = `\uFEFF1\r
00:00:01,000 --> 00:00:04,500\r
Hello <font color="#fff">world</font>\r
\r
2\r
00:00:05,250 --> 00:00:08,000\r
Second cue\r
line two\r
`

describe('SRT → WebVTT conversion', () => {
  it('converts timestamps, strips BOM/CRLF and markup', () => {
    const vtt = srtToVtt(srt)
    expect(vtt.startsWith('WEBVTT')).toBe(true)
    expect(vtt).toContain('00:00:01.000 --> 00:00:04.500')
    expect(vtt).toContain('Hello world')
    expect(vtt).toContain('Second cue\nline two')
    expect(vtt).not.toContain('<font')
    expect(vtt).not.toContain('\r')
    expect(countCues(vtt)).toBe(2)
  })

  it('handles cues without an index line and short timestamps', () => {
    const vtt = srtToVtt('00:01.000 --> 00:02.000\nShort\n')
    expect(vtt).toContain('00:01.000 --> 00:02.000')
    expect(countCues(vtt)).toBe(1)
  })

  it('returns an empty but valid document for junk input', () => {
    expect(srtToVtt('')).toBe('WEBVTT\n\n')
    expect(countCues(srtToVtt('not a subtitle'))).toBe(0)
  })
})

describe('URL safety', () => {
  it('accepts http(s) and rejects script/data protocols', () => {
    expect(isSafeUrl('https://cdn.example.com/a.jpg')).toBe(true)
    expect(isSafeUrl('http://cdn.example.com/a.jpg')).toBe(true)
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isSafeUrl('')).toBe(false)
    expect(isSafeUrl(undefined)).toBe(false)
    expect(isSafeUrl('blob:https://x/y')).toBe(false)
    expect(isSafeUrl('blob:https://x/y', { allowBlob: true })).toBe(true)
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    // Relative asset paths are resolved against the current origin.
    expect(safeUrl('/image/a.jpg')).toBe('/image/a.jpg')
  })

  it('normalises protocol-relative and relative assets', () => {
    expect(normalizeAssetUrl('//cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
    expect(normalizeAssetUrl('/stream?u=1', 'https://api.example.com')).toBe('https://api.example.com/stream?u=1')
    expect(normalizeAssetUrl(null)).toBeUndefined()
  })

  it('validates slugs and query strings', () => {
    expect(isSafeSlug('lucifer-UQASHYbVPB2')).toBe(true)
    expect(isSafeSlug('../../etc/passwd')).toBe(false)
    expect(isSafeSlug('a b')).toBe(false)
    expect(toQuery({ a: 1, b: null, c: '', d: false, e: 'x y' })).toBe('?a=1&e=x+y')
    expect(toQuery({})).toBe('')
  })
})

describe('player capability detection', () => {
  it('never advertises unsupported streaming features', () => {
    expect(FEATURES.qualitySelection).toBe(true)
    expect(FEATURES.subtitleTracks).toBe(true)
    expect(FEATURES.episodeList).toBe(false)
    expect(FEATURES.skipIntro).toBe(false)
    expect(FEATURES.liveSports).toBe(false)
    expect(FEATURES.dashPlayback).toBe(false)
    expect(FEATURES.autocomplete).toBe(false)
    expect(FEATURES.providerCatalog).toBe(false)
    expect(capabilityStatus('episodes')).toBe('unsupported')
    expect(capabilityStatus('subtitles')).toBe('supported')
    expect(CAPABILITIES.every((capability) => capability.detail.length > 20)).toBe(true)
  })

  it('selects a quality that fits the viewport, falling back to the lowest', () => {
    const qualities: Quality[] = [
      { id: 'a', resolution: 1080, label: '1080p', url: 'https://cdn/1080', proxyUrl: null, format: 'MP4', sizeBytes: null, durationSeconds: 100, codec: 'h264' },
      { id: 'b', resolution: 480, label: '480p', url: 'https://cdn/480', proxyUrl: null, format: 'MP4', sizeBytes: null, durationSeconds: 100, codec: 'h264' },
      { id: 'c', resolution: 360, label: '360p', url: 'https://cdn/360', proxyUrl: null, format: 'MP4', sizeBytes: null, durationSeconds: 100, codec: 'h264' },
    ]
    expect(pickDefaultQuality(qualities, 2160)?.resolution).toBe(1080)
    expect(pickDefaultQuality(qualities, 720)?.resolution).toBe(480)
    expect(pickDefaultQuality(qualities, 200)?.resolution).toBe(360)
    expect(pickDefaultQuality([], 1080)).toBeNull()
  })
})

describe('language + formatting helpers', () => {
  it('maps codes ↔ labels and flags RTL scripts', () => {
    expect(languageByCode('hi')?.label).toBe('Hindi')
    expect(codeForLabel('हिन्दी')).toBe('hi')
    expect(codeForLabel('English')).toBe('en')
    expect(isRtlLanguage('ur')).toBe(true)
    expect(isRtlLanguage('en')).toBe(false)
  })

  it('describes dub tracks without over-claiming', () => {
    expect(describeDub({ label: 'Hindi', kind: 'audio', original: false, code: 'hi' })).toBe('Hindi audio')
    expect(describeDub({ label: 'Arabic', kind: 'subtitle', original: false, code: 'ar' })).toBe('Arabic subtitles')
    expect(describeDub({ label: 'Original Audio', kind: 'audio', original: true, code: 'en' })).toBe('Original audio')
  })

  it('formats times, runtimes and progress defensively', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(3665)).toBe('1:01:05')
    expect(formatTime(Number.NaN)).toBe('0:00')
    expect(formatRemaining(60, 120)).toBe('-1:00')
    expect(formatRemaining(0, 0)).toBe('--:--')
    expect(formatRuntime(0)).toBeNull()
    expect(formatRuntime(5400)).toBe('1h 30m')
    expect(formatRuntime(3600)).toBe('1h')
    expect(progressPercent(50, 100)).toBe(50)
    expect(progressPercent(50, 0)).toBe(0)
    expect(progressPercent(200, 100)).toBe(100)
    expect(episodeLabel(2, 5)).toBe('S02 · E05')
    expect(episodeLabel(0, 0)).toBeNull()
  })
})
