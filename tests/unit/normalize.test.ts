import { describe, expect, it } from 'vitest'
import {
  dedupeTitles,
  detectLanguageVariant,
  normalizeCaptions,
  normalizeDetail,
  normalizeDubs,
  normalizeHome,
  normalizeList,
  normalizePlay,
  normalizeSubject,
  pickDefaultQuality,
  splitCsv,
} from '@/services/normalize'

/**
 * Fixtures below are trimmed copies of real Filmy Flow API responses
 * (captured during capability discovery) so the tests exercise the exact
 * shapes the app sees in production.
 */

const trendingSubject = {
  subjectId: '2190807691784770592',
  subjectType: 2,
  title: 'Lucifer',
  description: 'Lucifer Morningstar has decided…',
  releaseDate: '2016-01-25',
  duration: 0,
  genre: 'Crime,Drama,Fantasy',
  cover: { url: 'https://pbcdn.aoneroom.com/image/2026/01/27/9fd9113b6be06b254bef10a8bea06eb1.jpg', blurHash: 'eA8CzL-UJRM|RQ}F$iSgWVaei_V@oLt7t7EzNbjZoLofAXODjFWBSe' },
  countryName: 'United States',
  imdbRatingValue: '8.0',
  imdbRatingCount: 387315,
  subtitles: 'English,اُردُو,हिन्दी,বাংলা',
  trailer: { videoAddress: { url: 'https://macdn.aoneroom.com/media/vone/2024/03/19/57a6d508dc68df94cd4084c8a1893352-sd.mp4', duration: 140 } },
  detailPath: 'lucifer-UQASHYbVPB2',
  stills: { url: 'https://pbcdn.aoneroom.com/image/2023/03/23/875656238b3bc0207ff132ef3c31b2c2.jpg' },
  season: 0,
  dubs: [],
  accessStrategy: { ruleType: 1, requiredVipLevel: 1 },
  hasResource: true,
  isPornographic: false,
}

describe('normalizeSubject', () => {
  it('normalises a rich trending subject', () => {
    const title = normalizeSubject(trendingSubject)
    expect(title).not.toBeNull()
    expect(title).toMatchObject({
      id: '2190807691784770592',
      detailPath: 'lucifer-UQASHYbVPB2',
      title: 'Lucifer',
      kind: 'series',
      year: 2016,
      rating: 8,
      ratingCount: 387315,
      country: 'United States',
      vipLevel: 1,
      trailerUrl: expect.stringContaining('macdn.aoneroom.com'),
    })
    expect(title?.genres).toEqual(['Crime', 'Drama', 'Fantasy'])
    expect(title?.subtitleLanguages).toContain('हिन्दी')
    expect(title?.backdrop).toContain('2023/03/23')
  })

  it('handles the flat /movies list shape (cover as string, rating/year fields)', () => {
    const title = normalizeSubject({
      title: 'Stranger Things',
      subjectId: '4956801153355891744',
      subjectType: 2,
      detailPath: 'stranger-things-wsymkZvcaU5',
      cover: 'https://pbcdnw.aoneroom.com/image/2026/10/14/720bf396098beaa93141bfc5a46ccf32.jpg',
      rating: '8.6',
      year: '2016',
      genre: 'Drama,Fantasy,Horror',
      hasResource: true,
      duration: 0,
    })
    expect(title).toMatchObject({ year: 2016, rating: 8.6, kind: 'series' })
    expect(title?.poster).toContain('720bf396')
    // No 16:9 still → backdrop falls back to the poster.
    expect(title?.backdrop).toBe(title?.poster)
  })

  it('derives the year from releaseDate when `year` is absent', () => {
    const title = normalizeSubject({ ...trendingSubject, year: undefined, releaseDate: '2016-01-25' })
    expect(title?.year).toBe(2016)
  })

  it('drops adult-flagged entries and entries without a detailPath', () => {
    expect(normalizeSubject({ ...trendingSubject, isPornographic: true })).toBeNull()
    expect(normalizeSubject({ ...trendingSubject, detailPath: '' })).toBeNull()
    expect(normalizeSubject(null)).toBeNull()
  })

  it('classifies music/kids videos (subjectType 6) as non movie/series', () => {
    const title = normalizeSubject({ ...trendingSubject, subjectType: 6, title: 'Pop playlist' })
    expect(title?.kind).toBe('music')
  })
})

describe('detectLanguageVariant', () => {
  it('reads bracketed title tags and slug segments', () => {
    expect(detectLanguageVariant('Colony [Hindi]')).toBe('Hindi')
    expect(detectLanguageVariant('Lupin (English)')).toBe('English')
    expect(detectLanguageVariant('Colony', 'colony-hindi-WrHlMwhDfc7')).toBe('Hindi')
    expect(detectLanguageVariant('Colony', 'colony-EACNSWlpo1a')).toBeNull()
  })

  it('is applied during normalisation', () => {
    const title = normalizeSubject({ ...trendingSubject, title: 'Colony [Hindi]', detailPath: 'colony-hindi-WrHlMwhDfc7' })
    expect(title?.languageVariant).toBe('Hindi')
  })
})

describe('normalizeList', () => {
  it('reads pager.hasMore and keeps the real page number', () => {
    const page = normalizeList({
      page: 2,
      items: [trendingSubject],
      pager: { hasMore: true, nextPage: '3', page: '2', perPage: 24, totalCount: 1000000 },
    })
    expect(page).toMatchObject({ page: 2, hasMore: true })
    expect(page.items).toHaveLength(1)
  })

  it('prefers top-level items and dedupes them', () => {
    const page = normalizeList({ page: 1, items: [trendingSubject, trendingSubject], pager: { hasMore: false } })
    expect(page.items).toHaveLength(1)
    expect(page.hasMore).toBe(false)
  })

  it('falls back to upstream.data.items when needed', () => {
    const page = normalizeList({ upstream: { data: { items: [trendingSubject], pager: { hasMore: true, page: '1' } } } })
    expect(page.items).toHaveLength(1)
    expect(page.hasMore).toBe(true)
  })

  it('survives garbage payloads', () => {
    expect(normalizeList(null).items).toEqual([])
    expect(normalizeList({ items: 'nope' }).items).toEqual([])
    expect(normalizeList({ items: [null, undefined, 42] }).items).toEqual([])
  })
})

describe('normalizeHome', () => {
  it('extracts platform list and banner sections with artwork', () => {
    const home = normalizeHome({
      data: {
        platformList: [{ name: 'Netflix', uploadBy: 'Regina' }, { name: 'PrimeVideo', uploadBy: 'Lakimora' }, { name: '' }],
        operatingList: [
          {
            type: 'BANNER',
            position: 1,
            title: 'Banner_Africa',
            subjects: [],
            banner: {
              items: [
                {
                  subject: { ...trendingSubject, title: 'Lupin [English]', detailPath: 'lupin-english-UqNLZqu3DD' },
                  image: { url: 'https://pbcdn.aoneroom.com/image/banner.webp' },
                },
              ],
            },
          },
          { type: 'LIST', title: 'Trending_Now', subjects: [trendingSubject] },
          { type: 'LIST', title: 'Empty', subjects: [] },
        ],
      },
    })
    expect(home.platforms).toEqual([
      { name: 'Netflix', curator: 'Regina' },
      { name: 'PrimeVideo', curator: 'Lakimora' },
    ])
    expect(home.sections).toHaveLength(2)
    expect(home.sections[0].title).toBe('Banner Africa')
    expect(home.sections[0].images?.['lupin-english-UqNLZqu3DD']).toContain('banner.webp')
    expect(home.sections[1].title).toBe('Trending Now')
  })

  it('returns empty results for an invalid payload', () => {
    expect(normalizeHome(undefined)).toEqual({ sections: [], platforms: [] })
  })
})

describe('normalizeDetail', () => {
  const detailPayload = {
    subject: { ...trendingSubject, title: 'Lucifer S1-S6' },
    description: 'Lucifer Morningstar…',
    dubs: [
      { subjectId: '1', lanName: 'Original Audio', lanCode: 'en', original: true, type: 0, detailPath: 'lucifer-UQASHYbVPB2' },
      { subjectId: '2', lanName: 'Hindi dub', lanCode: 'hi', original: false, type: 0, detailPath: 'lucifer-Aq2Bzbvyte1' },
      { subjectId: '3', lanName: 'Arabic sub', lanCode: 'ar', original: false, type: 1, detailPath: 'lucifer-uDYzEbSKiw3' },
      { subjectId: '4', lanName: 'Spanish dub', lanCode: 'es', original: false, type: 0, detailPath: 'lucifer-8WBmGogrZz' },
    ],
    cast: [
      { staffId: 'a', name: 'Tom Ellis', character: 'Lucifer Morningstar', staffType: 1, avatarUrl: 'https://cdn/tom.jpg' },
      { staffId: 'a', name: 'Tom Ellis', character: 'Michael', staffType: 1, avatarUrl: 'https://cdn/tom.jpg' },
      { staffId: 'b', name: 'Len Wiseman', character: 'Director', staffType: 2 },
      { staffId: 'c', name: 'Ildy Modrovich', character: 'Writer', staffType: 3 },
      { staffId: 'd', name: '' },
    ],
  }

  it('classifies dubs into audio + subtitle variants with the original first', () => {
    const detail = normalizeDetail(detailPayload, [1, 2, 3])
    expect(detail).not.toBeNull()
    const tracks = detail!.dubs
    expect(tracks[0]).toMatchObject({ label: 'Original Audio', original: true, kind: 'audio' })
    expect(tracks.map((track) => track.kind)).toContain('subtitle')
    expect(tracks.find((track) => track.code === 'hi')).toMatchObject({ label: 'Hindi', kind: 'audio' })
    expect(detail!.seasons).toEqual([1, 2, 3])
  })

  it('dedupes cast entries and assigns departments', () => {
    const detail = normalizeDetail(detailPayload)!
    const cast = detail.cast
    expect(cast.filter((member) => member.name === 'Tom Ellis')).toHaveLength(2) // different roles
    expect(cast.find((member) => member.name === 'Len Wiseman')?.department).toBe('director')
    expect(cast.find((member) => member.name === 'Ildy Modrovich')?.department).toBe('writer')
    expect(cast.some((member) => member.name === '')).toBe(false)
  })

  it('accepts the raw upstream wrapper shape', () => {
    const detail = normalizeDetail({ raw: { data: { subject: trendingSubject, stars: [], crew: [] } } })
    expect(detail?.title.title).toBe('Lucifer')
  })

  it('handles a missing subject', () => {
    expect(normalizeDetail({})).toBeNull()
    expect(normalizeDetail(null)).toBeNull()
  })
})

describe('normalizeDubs', () => {
  it('ignores entries without a detailPath and keeps original first', () => {
    const tracks = normalizeDubs([
      { lanName: 'French dub', lanCode: 'fr', detailPath: 'x-fr' },
      { lanName: 'Original Audio', lanCode: 'en', original: true, detailPath: 'x' },
      { lanName: 'Broken' },
    ])
    expect(tracks.map((track) => track.label)).toEqual(['Original Audio', 'French'])
    expect(tracks[1].kind).toBe('audio')
  })
})

describe('normalizePlay', () => {
  const playPayload = {
    subjectId: '2190807691784770592',
    detailPath: 'lucifer-UQASHYbVPB2',
    se: 1,
    ep: 1,
    streams: [
      {
        id: '7643229021845030664',
        format: 'MP4',
        resolutions: '360',
        size: '122899849',
        duration: 2700,
        codecName: 'h264',
        url: 'https://bcdnxw.hakunaymatata.com/bt/abc.mp4?sign=1',
        proxy_url: '/stream?u=abc',
        playable: true,
      },
      { id: '8391', format: 'MP4', resolutions: '480', size: '167378467', duration: 2700, codecName: 'h264', url: 'https://cdn/480.mp4', proxy_url: '/stream?u=480' },
      { id: '6484', format: 'MP4', resolutions: '1080', size: '644380485', duration: 2700, codecName: 'h264', url: 'https://cdn/1080.mp4', proxy_url: '/stream?u=1080' },
      { id: 'dup', format: 'MP4', resolutions: '1080', size: '1', url: 'https://cdn/1080-dup.mp4' },
      { id: 'bad', format: 'MP4', resolutions: '720' },
    ],
    upstream: {
      data: {
        streams: [],
        dash: [{ format: 'DASH', id: 'd1', url: 'https://sbcdnw.hakunaymatata.com/dash/x/index_web.mpd', resolutions: '1080,720,480', codecName: 'hevc' }],
        hls: [],
        hasResource: true,
      },
    },
  }

  it('keeps real renditions only, sorted high → low, with absolute proxy URLs', () => {
    const source = normalizePlay(playPayload)
    expect(source.qualities.map((quality) => quality.resolution)).toEqual([1080, 480, 360])
    expect(source.qualities[0].id).toBe('6484')
    expect(source.qualities[0].proxyUrl).toContain('https://filmy-flow-api.vercel.app/stream?u=1080')
    expect(source.dashUrl).toContain('.mpd')
    expect(source.hasResource).toBe(true)
  })

  it('reports an empty source when the API returns no streams', () => {
    const source = normalizePlay({ streams: [], upstream: { data: { streams: [], dash: [], hls: [], hasResource: false } } })
    expect(source.qualities).toEqual([])
    expect(source.hasResource).toBe(false)
  })

  it('picks a sensible default quality for the viewport budget', () => {
    const { qualities } = normalizePlay(playPayload)
    expect(pickDefaultQuality(qualities, 720)?.resolution).toBe(480)
    expect(pickDefaultQuality(qualities, 1080)?.resolution).toBe(1080)
    expect(pickDefaultQuality(qualities, 400)?.resolution).toBe(360)
    expect(pickDefaultQuality([], 1080)).toBeNull()
  })
})

describe('normalizeCaptions', () => {
  it('maps upstream caption languages to ISO-ish codes', () => {
    const tracks = normalizeCaptions({
      data: {
        captions: [
          { id: '1', lan: 'en', lanName: 'English', url: 'https://cacdn/subtitle/en.srt' },
          { id: '2', lan: 'in_id', lanName: 'Indonesian', url: 'https://cacdn/msubt/id.srt' },
          { id: '3', lan: 'ptbr', lanName: 'Português', url: 'https://cacdn/msubt/pt.srt' },
          { id: '4', lan: 'xx', lanName: 'Bad', url: 'javascript:alert(1)' },
        ],
      },
    })
    expect(tracks.map((track) => track.code)).toEqual(['en', 'id', 'pt'])
    expect(tracks[0].label).toBe('English')
  })

  it('returns an empty list for missing payloads', () => {
    expect(normalizeCaptions({ data: { captions: [] } })).toEqual([])
    expect(normalizeCaptions(null)).toEqual([])
  })
})

describe('helpers', () => {
  it('splits CSV subtitle lists', () => {
    expect(splitCsv('English, اُردُو ,हिन्दी')).toEqual(['English', 'اُردُو', 'हिन्दी'])
    expect(splitCsv('')).toEqual([])
    expect(splitCsv(null)).toEqual([])
  })

  it('dedupes by detailPath + season while keeping season variants', () => {
    const base = normalizeSubject(trendingSubject)!
    const s2 = normalizeSubject({ ...trendingSubject, title: 'Lucifer S2', season: 2 })!
    expect(dedupeTitles([base, base, s2])).toHaveLength(2)
  })
})
