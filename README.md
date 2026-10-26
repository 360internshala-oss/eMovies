# eMovies

A premium, mobile-first streaming discovery and playback app for **Movies, TV Series,
Anime and Dramas/Shows**, built on the public [Filmy Flow API](https://filmy-flow-api.vercel.app).

React 18 + Vite + TypeScript + TailwindCSS + shadcn-style primitives + lucide-react.
Every feature is wired to a **verified** API capability — anything the API does not
provide is hidden or explicitly labelled. The full evidence table lives in
[docs/API_CAPABILITIES.md](docs/API_CAPABILITIES.md) and is also rendered in-app at
**`/capabilities`**.

---

## Quick start

```bash
npm install

npm run dev        # http://localhost:5173  (binds 0.0.0.0)
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build on :4173
npm test           # vitest run — 88 tests, 6 files
npm run typecheck  # strict TypeScript, noUnusedLocals/Parameters on
```

Node 18+ is required. No API key or account is needed.

### Optional environment (`.env.local`)

Copy `.env.example` and edit only if needed. All values are **public**; no secrets exist
in this project.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://filmy-flow-api.vercel.app` | API origin (no trailing slash). |
| `VITE_USE_DEV_PROXY` | `false` | Route JSON calls through the bundled same-origin proxy. |
| `VITE_PROXY_TARGET` | `http://localhost:8787` | Where the dev server forwards `/api-proxy`. |
| `VITE_PREFER_DIRECT_STREAMS` | `true` | Play the signed CDN MP4 directly (verified playable). Set `false` to try the API media proxy first. |
| `VITE_REQUEST_TIMEOUT_MS` | `20000` | Per-request abort timeout. |
| `VITE_MAX_SWEEP_PAGES` | `6` | How many catalogue pages a client-side filter sweep may walk. |

### CORS & the optional proxy

The API sends `access-control-allow-origin: *` (verified on `/health`, `/movies` and
`OPTIONS` preflight), so **the browser talks to it directly and no proxy is required**.
If you deploy somewhere that still blocks cross-origin calls:

```bash
npm run proxy                              # same-origin proxy on :8787
VITE_USE_DEV_PROXY=true npm run dev        # Vite forwards /api-proxy → :8787
```

`scripts/dev-proxy.mjs` is a **server-side** proxy: fixed upstream origin (never taken
from the request), `GET` only, allow-listed path prefix, no cookies or credentials.
No `no-cors`, opaque-fetch or third-party CORS-bypass tricks are used anywhere.

---

## Routes (all real, all shareable)

| Route | Page |
| --- | --- |
| `/` | Home — hero from trending, rails from `/home` + catalogue |
| `/movies` · `/series` · `/anime` | Catalogues with filters, sort, chips, infinite scroll |
| `/trending` · `/recent` · `/top-rated` | Trending, Recently Added, Top Rated |
| `/genres` · `/genres/:genre` | Genre index + genre catalogue |
| `/languages` · `/languages/:language` | Language index + language catalogue |
| `/providers` · `/providers/:provider` | Platforms from `/home.platformList` (+ honest limitation note) |
| `/title/:detailPath` | Detail: synopsis, cast, dubs, subtitles, trailer, "more like this" |
| `/watch/:detailPath?se=&ep=` | Full-screen player, shareable episode URLs |
| `/search?q=&type=&genre=&year=&country=&language=&provider=&sort=` | Debounced search with all filters |
| `/my-list` · `/continue-watching` · `/history` | Local library |
| `/settings` | Theme, playback defaults, data reset |
| `/capabilities` | Live capability map |
| anything else | 404 page with navigation back |

History API routing (no router dependency) with real back/forward, deep links and a
404 fallback.

## Player

Custom HTML5 player (`src/features/player/`) — no third-party player library:

- play/pause, seek bar with buffered range and keyboard-accessible range input
- elapsed / remaining time, volume + mute, speed 0.25×–2×, fullscreen, PiP when supported
- **quality menu lists only renditions `/play` actually returned** (typically 360p–1080p)
- **subtitle menu lists only real `/caption` tracks**, converted SRT → WebVTT in memory;
  the menu is hidden when the API returns none
- keyboard: `space/k` play, `←/J` `→/L` ±10 s, `↑/↓` volume, `M` mute, `F` fullscreen,
  `P` PiP, `C` subtitles, `0–9` jump to %, Home/End on the seek bar
- mobile: single tap toggles controls, **double-tap left/right thirds seeks ±10 s**,
  large touch targets, orientation lock in fullscreen when available
- aspect-ratio menu, auto-hiding controls, buffering / stalled / ended / error overlays
- resume from saved position (with a visible toast), progress persisted every 5 s
- next/previous episode when the API resolves one, autoplay-next preference
- explicit, actionable errors for unsupported formats, expired signed URLs and CORS failures

No skip-intro button is rendered — the API exposes no intro timestamps.

## What is verified vs. not

See [docs/API_CAPABILITIES.md](docs/API_CAPABILITIES.md) for the full evidence.
Short version:

**Verified and working:** catalogue endpoints, trending, search, detail, cast, recs,
`/play` MP4 renditions, `/caption` subtitle tracks, `hasMore` pagination.

**Deliberately absent (no API support):** Live Sports, search autocomplete (`/suggest`
returns 404), skip intro/recap, episode lists & season counts, per-provider catalogues,
server-side filtering/sorting, DASH playback, accounts/sync/ratings.

**Honest compromises:** filters and sorting run client-side over swept pages (the UI says
so); anime is a labelled view over TV-series data; providers page names real platforms
but cannot filter titles by them; seasons are derived from sibling subjects and episodes
resolved on demand through `/play`.

## Architecture

```
src/
  main.tsx  App.tsx            entry + providers + route switch
  pages/                       one file per page group
  components/
    ui/                        shadcn-style primitives (button, input, sheet, toast, …)
    content/                   poster card, rails, grids, hero, filters, catalog view
    layout/                    top nav, bottom nav, search overlay, footer, logo
  features/player/             video player, seek bar, menus, srt→vtt, subtitle loader
  services/                    apiClient (timeouts/retries/typed errors), api, normalize,
                               capabilities, languages, types
  hooks/                       useAsync, useCatalog, useCatalogFilters, media query, online, …
  router/                      route table + matcher, RouterProvider, Link
  store/                       settings + library (localStorage, versioned)
  utils/                       cn, format, url validation, storage
  styles/index.css             design tokens, dark + light themes, reduced motion
scripts/dev-proxy.mjs          optional secure same-origin proxy
tests/                         unit + jsdom integration suites
docs/API_CAPABILITIES.md       verified capability map
```

## Tests

```bash
npm test                 # all suites (88 tests)
npm run test:watch       # watch mode
npx vitest run tests/unit   # 62 unit tests only
```

- `tests/unit/normalize.test.ts` — defensive parsing of list/detail/play/caption payloads
- `tests/unit/filters.test.ts` — filter matching, sorting, facet aggregation, chip logic
- `tests/unit/router.test.ts` — route resolution, params, query handling, 404s
- `tests/unit/library.test.ts` — watchlist, history, continue-watching, resume behaviour
- `tests/unit/player.test.ts` — capability detection, SRT→VTT, quality defaults, URL safety
- `tests/integration/routes.test.tsx` — jsdom render of every route, nav, player chrome,
  empty/error states, 404 fallback

## Deployment

The build is a static SPA, so any static host works — **but every host must rewrite
unknown paths to `index.html`** or deep links such as `/title/lucifer-UQASHYbVPB2` will 404.

```bash
npm ci && npm run build     # → dist/
```

- **Netlify** — `dist` as publish dir plus `/* /index.html 200` in `public/_redirects`, or
  a `netlify.toml` redirect.
- **Vercel** — framework "Vite", output `dist`, with a rewrite of all routes to `/index.html`.
- **GitHub Pages** — requires a `404.html` copy of `index.html` (and a `base` in
  `vite.config.ts` if served from a sub-path).
- **Nginx** — `try_files $uri $uri/ /index.html;`.

If the host's CSP or the user's network blocks the API/media origins, enable proxy mode
and run `scripts/dev-proxy.mjs` behind the same origin.

## Known limitations

- Signed CDN stream URLs expire; playback re-fetches `/play` per session and surfaces an
  error instead of retrying forever.
- The API's `/stream` proxy returns **426** for MP4, so video plays directly from the CDN;
  subtitles go through `/stream` because the CDN omits CORS headers for `.srt`.
- DASH/HEVC manifests need an `X-MB-Token` header and an MSE player — not implemented.
- No episode/season metadata endpoint exists, so a series without resolvable siblings shows
  a stated limitation rather than an invented episode grid.
- Per-provider catalogues cannot be built (subjects carry no platform field).
- Watchlist, history and progress are local to this browser; the API has no accounts.
- Filters/sort are client-side over up to `VITE_MAX_SWEEP_PAGES` pages per sweep.

## Accessibility & safety

Semantic landmarks, labelled controls, visible focus rings, keyboard-navigable menus and
seek bar, `prefers-reduced-motion` support, AA-contrast tokens in both themes, live regions
for toasts/status. All remote URLs pass through `safeUrl()` (http/https or same-origin
relative only — `javascript:`/`data:` rejected); no `dangerouslySetInnerHTML` anywhere;
no secrets in the bundle.

## License

MIT — see [LICENSE](LICENSE). Third-party media and metadata belong to their respective
owners; this project only reads the public API.
