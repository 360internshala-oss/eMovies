/**
 * Optional same-origin proxy for deployments where the upstream API's CORS
 * policy blocks direct browser calls.
 *
 * Security notes:
 * - The upstream origin is fixed (never taken from the request).
 * - Only GET requests are forwarded, only to an allow-listed path prefix.
 * - No credentials, cookies or API keys are involved.
 *
 * Usage:
 *   node scripts/dev-proxy.mjs            # listens on :8787
 *   VITE_USE_DEV_PROXY=true npm run dev   # Vite forwards /api-proxy here
 */
import http from 'node:http'

const PORT = Number(process.env.PORT ?? 8787)
const UPSTREAM = (process.env.UPSTREAM_API ?? 'https://filmy-flow-api.vercel.app').replace(/\/+$/, '')
const ALLOWED_PATH = /^\/(health|home|tabs|trending|movies|tv-series|tv|search|suggest|detail|cast|recs|play|caption|stream)(\?|$)/

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  if (url.pathname !== '/api-proxy') {
    res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Not found' }))
    return
  }

  const path = url.searchParams.get('path') ?? ''
  if (!path.startsWith('/') || !ALLOWED_PATH.test(path)) {
    res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Path not allowed' }))
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const upstream = await fetch(`${UPSTREAM}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    const body = await upstream.text()
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'public, max-age=60',
    })
    res.end(body)
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({ error: 'Upstream request failed', detail: error instanceof Error ? error.message : String(error) }),
    )
  } finally {
    clearTimeout(timeout)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`eMovies proxy listening on http://0.0.0.0:${PORT} → ${UPSTREAM}`)
  console.log('Set VITE_USE_DEV_PROXY=true before starting Vite to use it.')
})
