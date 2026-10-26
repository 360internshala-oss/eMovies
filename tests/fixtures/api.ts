/**
 * Trimmed but shape-accurate fixtures for the endpoints eMovies consumes.
 * Used by the jsdom integration tests; every field exists in the real API.
 */

const image = (name: string) => ({
  url: `https://pbcdn.aoneroom.com/image/${name}.jpg`,
  width: 1000,
  height: 1500,
  blurHash: 'eA8CzL-UJRM|RQ}F$iSgWVaei_V@oLt7t7EzNbjZoLofAXODjFWBSe',
})

const subject = (overrides: Record<string, unknown>) => ({
  subjectType: 2,
  description: 'A fixture description used by automated tests.',
  duration: 0,
  countryName: 'United States',
  imdbRatingValue: '8.0',
  imdbRatingCount: 1000,
  subtitles: 'English,हिन्दी,اُردُو',
  trailer: { videoAddress: { url: 'https://macdn.aoneroom.com/trailer.mp4', duration: 120 } },
  cover: image('poster'),
  stills: image('still'),
  season: 0,
  dubs: [],
  hasResource: true,
  isPornographic: false,
  ...overrides,
})

export const trendingPayload = {
  code: 0,
  message: 'ok',
  data: {
    subjectList: [
      subject({ subjectId: '1', title: 'Lucifer', genre: 'Crime,Drama,Fantasy', detailPath: 'lucifer-UQASHYbVPB2', releaseDate: '2016-01-25' }),
      subject({ subjectId: '2', title: 'Stranger Things', genre: 'Drama,Fantasy,Horror', detailPath: 'stranger-things-wsymkZvcaU5', releaseDate: '2016-07-15' }),
    ],
  },
}

export const moviesPayload = {
  page: 1,
  items: [
    {
      title: 'Colony',
      subjectId: '2966181623634480144',
      subjectType: 1,
      detailPath: 'colony-06FbDRS87x3',
      cover: 'https://pbcdn.aoneroom.com/image/colony.jpg',
      rating: '6.5',
      year: '2026',
      genre: 'Action,Adventure,Crime',
      hasResource: true,
      duration: 7380,
      description: '',
    },
    {
      title: 'Silent Sanctuary Playlist',
      subjectId: '7277877832821657576',
      subjectType: 6,
      detailPath: 'silent-sanctuary-I2C72yYKCF8',
      cover: 'https://pbcdn.aoneroom.com/image/music.jpg',
      rating: '7.4',
      year: '2023',
      genre: 'Pop',
      hasResource: true,
      duration: 9592,
      description: '',
    },
  ],
  pager: { hasMore: true, nextPage: '2', page: '1', perPage: 24, totalCount: 1000000 },
}

export const seriesPayload = {
  page: 1,
  items: [
    {
      title: 'Boruto: Naruto Next Generations',
      subjectId: '530904994120352848',
      subjectType: 2,
      detailPath: 'boruto-naruto-next-generations-m3udT88ydD',
      cover: 'https://pbcdn.aoneroom.com/image/boruto.jpg',
      rating: '6.3',
      year: '2017',
      genre: 'Anime,Action,Adventure',
      hasResource: true,
      duration: 0,
      description: '',
    },
    {
      title: 'The Rookie',
      subjectId: '8848113103456850976',
      subjectType: 2,
      detailPath: 'the-rookie-Ic9rY21sCxa',
      cover: 'https://pbcdn.aoneroom.com/image/rookie.jpg',
      rating: '8.0',
      year: '2018',
      genre: 'Action,Crime,Drama',
      hasResource: true,
      duration: 0,
      description: '',
    },
  ],
  pager: { hasMore: false, page: '1', perPage: 24, totalCount: 1000000 },
}

export const searchPayload = {
  page: 1,
  items: [
    {
      title: 'Colony [Hindi]',
      subjectId: '8118357496726804544',
      subjectType: 1,
      detailPath: 'colony-hindi-WrHlMwhDfc7',
      cover: 'https://pbcdn.aoneroom.com/image/colony.jpg',
      rating: '6.5',
      year: '2026',
      genre: 'Action,Adventure,Crime',
      hasResource: true,
      duration: 7380,
      description: '',
    },
  ],
  pager: { hasMore: false, page: '1', perPage: 20, totalCount: 1 },
}

export const detailPayload = {
  subject: subject({
    subjectId: '2190807691784770592',
    title: 'Lucifer S1-S6',
    genre: 'Crime,Drama,Fantasy',
    detailPath: 'lucifer-UQASHYbVPB2',
    releaseDate: '2016-01-25',
  }),
  description: 'Lucifer Morningstar has decided he has had enough of being the dutiful servant in Hell.',
  dubs: [
    { subjectId: '2190807691784770592', lanName: 'Original Audio', lanCode: 'en', original: true, type: 0, detailPath: 'lucifer-UQASHYbVPB2' },
    { subjectId: '1035271946885366496', lanName: 'Hindi dub', lanCode: 'hi', original: false, type: 0, detailPath: 'lucifer-Aq2Bzbvyte1' },
    { subjectId: '2955180061147678728', lanName: 'Arabic sub', lanCode: 'ar', original: false, type: 1, detailPath: 'lucifer-uDYzEbSKiw3' },
  ],
  cast: [
    { staffId: 'a', name: 'Tom Ellis', character: 'Lucifer Morningstar', staffType: 1, avatarUrl: 'https://pbcdn.aoneroom.com/image/tom.jpg' },
    { staffId: 'b', name: 'Len Wiseman', character: 'Director', staffType: 2 },
  ],
  postList: [],
  accessStrategy: null,
}

export const recsPayload = {
  items: [
    subject({ subjectId: '9', title: 'The Rookie', genre: 'Action,Crime', detailPath: 'the-rookie-Ic9rY21sCxa', releaseDate: '2018-10-16' }),
  ],
}

export const playPayload = {
  subjectId: '2190807691784770592',
  detailPath: 'lucifer-UQASHYbVPB2',
  se: 1,
  ep: 1,
  streams: [
    {
      id: '8391233488812392864',
      format: 'MP4',
      resolutions: '480',
      size: '167378467',
      duration: 2700,
      codecName: 'h264',
      url: 'https://bcdnxw.hakunaymatata.com/resource/480.mp4?sign=1',
      proxy_url: '/stream?u=480',
      playable: true,
    },
    {
      id: '6484813154554889304',
      format: 'MP4',
      resolutions: '1080',
      size: '644380485',
      duration: 2700,
      codecName: 'h264',
      url: 'https://bcdnxw.hakunaymatata.com/resource/1080.mp4?sign=1',
      proxy_url: '/stream?u=1080',
      playable: true,
    },
    {
      id: '7231673470151967104',
      format: 'DASH',
      resolutions: '1080,720,480',
      size: '0',
      codecName: 'hevc',
      url: 'https://sbcdnw.hakunaymatata.com/dash/2190807691784770592_1_1_1080_h265_637/index_web.mpd',
      proxy_url: '/stream?u=dash',
      playable: true,
    },
  ],
  // The real API appends a DASH (H.265) manifest to `streams`; it must never be
  // treated as a playable MP4 rendition.
  upstream: {
    data: {
      streams: [],
      dash: [{ id: '7231673470151967104', format: 'DASH', resolutions: '1080,720,480', url: 'https://sbcdnw.hakunaymatata.com/dash/x/index_web.mpd', codecName: 'hevc' }],
      hls: [],
      hasResource: true,
      vipLocked: false,
    },
  },
}

export const captionPayload = {
  code: 0,
  message: 'ok',
  data: {
    captions: [
      { id: '1', lan: 'en', lanName: 'English', url: 'https://cacdn.hakunaymatata.com/subtitle/en.srt', size: '66895', delay: 0 },
      { id: '2', lan: 'hi', lanName: 'हिन्दी', url: 'https://cacdn.hakunaymatata.com/subtitle/hi.srt', size: '70000', delay: 0 },
    ],
  },
}

export const homePayload = {
  code: 0,
  message: 'ok',
  data: {
    platformList: [
      { name: 'Netflix', uploadBy: 'Regina' },
      { name: 'PrimeVideo', uploadBy: 'Lakimora' },
      { name: 'Disney', uploadBy: 'samrawit' },
    ],
    operatingList: [
      {
        type: 'BANNER',
        position: 1,
        title: 'Banner_Africa',
        subjects: [],
        banner: {
          items: [
            {
              subject: subject({ subjectId: '3', title: 'Lupin [English]', detailPath: 'lupin-english-UqNLZqu3DD', releaseDate: '2025-01-01' }),
              image: image('banner'),
            },
          ],
        },
      },
      {
        type: 'LIST',
        position: 2,
        title: 'Trending_Now',
        subjects: [
          subject({ subjectId: '4', title: 'Tulsa King', detailPath: 'tulsa-king-MsmATkU0Mg6', releaseDate: '2022-11-13', subjectType: 2 }),
          subject({ subjectId: '5', title: 'The Chi', detailPath: 'the-chi-0OZDg6KP353', releaseDate: '2018-01-07', subjectType: 2 }),
          subject({ subjectId: '6', title: 'Vikings', detailPath: 'vikings-69BlciwjRd6', releaseDate: '2013-03-03', subjectType: 2 }),
          subject({ subjectId: '7', title: 'Merlin', detailPath: 'merlin-sMxCiIO6fZ9', releaseDate: '2009-09-20', subjectType: 2 }),
        ],
      },
    ],
  },
}

/** Route `/path?query` → payload used by the fetch mock. */
export function payloadFor(url: string): unknown {
  const { pathname, searchParams } = new URL(url, 'https://filmy-flow-api.vercel.app')
  if (pathname === '/health') return { ok: true }
  if (pathname === '/trending') return trendingPayload
  if (pathname === '/movies') return moviesPayload
  if (pathname === '/tv-series' || pathname === '/tv') return seriesPayload
  if (pathname === '/search') return searchParams.get('q') ? searchPayload : { page: 1, items: [], pager: { hasMore: false } }
  if (pathname === '/detail') return detailPayload
  if (pathname === '/recs') return recsPayload
  if (pathname === '/play') return playPayload
  if (pathname === '/caption') return captionPayload
  if (pathname === '/home') return homePayload
  return { detail: 'Not Found' }
}
