# Filmy Flow API — verified capability map

Evidence base for every feature eMovies shows. Anything that is not listed here as
**verified** is either hidden in the UI or explicitly labelled as unavailable.

- API base: `https://filmy-flow-api.vercel.app`
- Verified on: 2026-10 (live requests)
- Machine-readable counterpart in code: [`src/services/capabilities.ts`](../src/services/capabilities.ts),
  surfaced to users at the in-app route **`/capabilities`**.

Legend: **Verified** = observed in a live response · **Partial** = works with a
documented workaround/limitation · **Unavailable** = no endpoint or no data.

---

## 1. Endpoint inventory

| Endpoint | Query | Verified response | Used by |
| --- | --- | --- | --- |
| `GET /health` | — | `{ status: "ok" }` | connectivity badge, API-down states |
| `GET /home` | `host?` | `sections[]` + `platformList[]` | Home rails, Providers page |
| `GET /trending` | `page` | item list + `pager.hasMore` | Trending page, hero |
| `GET /movies` | `page`, `perPage`, `sort` | item list + `pager` | Movies, Recently Added, Top Rated |
| `GET /tv-series` (`/tv`) | `page`, `perPage`, `sort` | item list + `pager` | TV Series, Anime, Dramas/Shows |
| `GET /search` | `q`, `page`, `perPage` | item list + real `totalCount` | Search page + overlay |
| `GET /detail` | `detailPath` | full subject detail | Title page, player |
| `GET /cast` | `detailPath` / `subjectId` | cast + crew | Title page cast rail |
| `GET /recs` | `subjectId` | related titles | "More like this" |
| `GET /play` | `subjectId`, `detailPath`, `se`, `ep` | `data.streams[]` + signed URLs | Player |
| `GET /caption` | `id`, `subjectId`, `detailPath`, `format=MP4` | `data.captions[]` | Subtitle menu |
| `GET /stream` | `u`, `cookie?` | byte proxy **for subtitles only** | SRT fetch fallback |
| `GET /tabs` | — | navigation facets | genre/language facets |
| `GET /api/stream/{subject_id}` | — | redirect to a rendition | not used (426, see §4) |
| `GET /staff/{id}/movies` / `/related` | — | staff filmography | not used in this build |
| `GET /suggest` | `q` | **`404 page not found`** | autocomplete disabled |
| `GET /anime` | — | **`404 page not found`** | anime = TV-series fallback + label |

List envelope (all catalogue endpoints):

```jsonc
{
  "data": {
    "page": 1,
    "items": [{
      "title": "Lucifer",
      "subjectId": "2190807691784770592",
      "subjectType": 2,          // 1 = movie, 2 = series, 6 = music/kids (filtered out)
      "detailPath": "lucifer-UQASHYbVPB2",
      "cover": "https://…",
      "rating": 8.1,
      "year": 2016,
      "genre": ["Crime", "Drama"],
      "hasResource": true,
      "duration": 2700
    }],
    "pager": { "hasMore": true, "totalCount": 1000000 }
  }
}
```

> `pager.totalCount` is a placeholder (`1000000`) on catalogue endpoints. **Pagination
> uses `hasMore` only.** `/search` does return a usable `totalCount`.

---

## 2. Title detail (`/detail?detailPath=`)

Verified fields consumed by the UI: `title`, `description`, `cover`, `stills`,
`rating`, `year`, `country`, `genre[]`, `duration`, `cast[]`, `director`,
`trailer`/`trailerUrl` (when present), `subtitles[]` (declared languages),
**`dubs[]`** — each dub is a *separate subject* with its own `detailPath` and its own
stream. Missing fields are omitted rather than defaulted.

### Audio language vs subtitle language vs dub — how eMovies distinguishes them

| Concept | Source | UI treatment |
| --- | --- | --- |
| Original audio language | `detail.dubs` absent → original only | Shown as a single "Original audio" chip; no track switcher. |
| Dubbed version | A separate detail entry in `dubs[]` (e.g. `colony-hindi-…`) | Shown as “Hindi dub (separate version)”; switching navigates to that subject and re-resolves `/play`. |
| Audio track inside one file | **Not exposed** — `/play` returns one audio stream per file | No multi-audio menu is ever rendered. |
| Subtitle language | `/caption` `captions[].lanName` | Subtitle menu, per-language tracks. |

The app never claims a title is "available in Hindi audio" unless a dub entry or a
caption track actually exists for it.

---

## 3. Playback (`/play`)

Verified for `lucifer-UQASHYbVPB2` S1E1: MP4 renditions at **360 / 480 / 720 / 1080**,
`h264`, `duration: 2700`, plus a DASH (HEVC) manifest that requires an
`X-MB-Token` header.

- The MP4 entries carry a **signed CDN `url`** (`sign` + `t` params, expiring) and a
  `proxy_url`. Signed URLs must be re-fetched per playback — eMovies never caches them.
- `subjectType 1` (movie) needs `se`/`ep` omitted; `subjectType 2` needs both.
- Zero streams → the player shows an explicit "no playable source" state; it does not
  fall back to a fake URL.

## 4. Media delivery & CORS (measured with curl, not from the browser sandbox)

| Target | Result | Consequence in this app |
| --- | --- | --- |
| `…/health`, `…/movies` | `access-control-allow-origin: *`; `OPTIONS` preflight returns `allow-methods: DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT,QUERY` | **Direct browser calls are allowed** — no proxy required for the JSON API. |
| Signed CDN `.mp4` | `429` from the rate-limited CI runner, but with `access-control-allow-origin: *` | Played **directly** by `<video>` (default, `VITE_PREFER_DIRECT_STREAMS=true`). |
| API `/stream?u=<mp4>` | **HTTP 426 Upgrade Required** (with or without `Range`) | **Not** usable for video; kept only as a last-resort fallback attempt. |
| CDN `.srt` | `200 application/x-subrip`, **no** CORS header | Cannot be used as a `<track src>`; fetched through `/stream?u=` and converted to WebVTT in memory. |
| API `/stream?u=<srt>` | `200 application/x-subrip` with CORS headers | Preferred subtitle transport. |

The subtitle pipeline is therefore: `/stream?u=` → text → `srtToVtt()` → `Blob` →
`URL.createObjectURL` → `<track>`. Direct CDN is only the fallback.

## 5. Unsupported — and what the UI does instead

| Feature | Status | Reason | UI behaviour |
| --- | --- | --- | --- |
| Episode list / season metadata | Unavailable | No endpoint returns episodes or season counts | Seasons derived from sibling catalogue entries; episodes probed on demand via `/play`; the UI states the limitation instead of inventing a list |
| Skip intro / recap | Unavailable | No timestamp data | Not rendered |
| Live sports / channels | Unavailable | No live or EPG endpoint | **No Live Sports page**; route does not exist |
| Search autocomplete | Unavailable | `/suggest` returns 404 | Plain debounced search only |
| Per-provider catalogue | Partial | `platformList` exists but subjects carry no platform field | Providers page lists real platforms and explains that titles cannot be filtered by them; `/providers/:name` shows that explanation plus a browse fallback |
| Server-side filters / sort | Partial | `genre`, `year`, `country`, `sort` params are ignored upstream | Client-side filtering/sorting over swept pages, with a visible "filters apply to loaded pages" note and on-demand page sweeps |
| Anime catalogue | Unavailable | `/anime` 404 | Anime route reuses TV-series data, labelled as a filtered view |
| Total counts | Partial | Placeholder `1000000` | Infinite scroll driven by `hasMore` |
| Accounts / sync / ratings | Unavailable | No auth or user endpoints | Everything is local (`localStorage`) |
| DASH playback | Not implemented | HEVC manifest needs `X-MB-Token` + MSE player | MP4 renditions are offered; no DASH option is shown |
| Cast/crew filmography pages | Available but unused | `/staff/{id}/…` works | Cast cards are non-interactive (no dead links) |

## 6. Security decisions

- **No CORS bypass tricks.** No `no-cors` opaque fetches, no third-party proxy, no
  browser-side header spoofing. Because the API sends `access-control-allow-origin: *`,
  direct calls are legitimate.
- `scripts/dev-proxy.mjs` is an **optional, documented, server-side** same-origin proxy.
  It forwards `GET` only, to a **fixed** upstream origin, restricted to an allow-listed
  path prefix (`/health`, `/home`, `/tabs`, `/trending`, `/movies`, `/tv-series`, `/tv`,
  `/search`, `/suggest`, `/detail`, `/cast`, `/recs`, `/play`, `/caption`, `/stream`).
  There are no credentials, cookies or user-supplied hosts involved.
- No API keys or secrets exist in this project (the upstream API is unauthenticated);
  `.env.example` contains only public defaults, and `.env*` is git-ignored.
- All remote strings are rendered as React text (no `dangerouslySetInnerHTML`), and
  every URL is validated with `safeUrl()` (http/https or same-origin relative only —
  `javascript:` and `data:` are rejected).
- Subtitle text is parsed as data, never injected as HTML (`<track>` + Blob URL).

## 7. Reproducing this map

1. `curl -s https://filmy-flow-api.vercel.app/health`
2. `curl -s "https://filmy-flow-api.vercel.app/movies?page=1&perPage=24" | jq`
3. `curl -s "https://filmy-flow-api.vercel.app/detail?detailPath=lucifer-UQASHYbVPB2" | jq`
4. `curl -s "https://filmy-flow-api.vercel.app/play?subjectId=2190807691784770592&detailPath=lucifer-UQASHYbVPB2&se=1&ep=1" | jq`
5. `curl -s "https://filmy-flow-api.vercel.app/caption?id=<streamId>&subjectId=2190807691784770592&detailPath=lucifer-UQASHYbVPB2&format=MP4" | jq`

Subtitle/`Range`/CORS behaviour must be checked with `curl -i` (headers), not from a
sandboxed page.
