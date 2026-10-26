import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * eMovies build config.
 *
 * `VITE_BASE_PATH` sets the deployment base: `/` for a root domain (default)
 * and `/<repo>/` for a GitHub Pages project site. See the deploy workflow.
 *
 * The Filmy Flow API is consumed directly from the browser by default
 * (`VITE_API_BASE_URL`). If a deployment needs to hide the upstream origin or
 * work around a restrictive CORS policy, set `VITE_USE_DEV_PROXY=true` and run
 * the bundled Node proxy (`npm run proxy`) — Vite then forwards `/proxy/*` to it.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8787'

  // Normalise to a leading and trailing slash: 'eMovies' → '/eMovies/'.
  const rawBase = (env.VITE_BASE_PATH || '/').trim()
  const base = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      // The preview host is dynamic; never block it.
      allowedHosts: true,
      proxy: env.VITE_USE_DEV_PROXY === 'true'
        ? {
            // Served by `npm run proxy` (scripts/dev-proxy.mjs), which whitelists
            // the upstream origin and forwards only GET requests.
            '/api-proxy': { target: proxyTarget, changeOrigin: true },
          }
        : undefined,
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
  }
})
