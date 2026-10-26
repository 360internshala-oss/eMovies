/**
 * Mobile interaction flows.
 *
 * Drives the real UI in headless Chrome (with the API mocked from
 * tests/fixtures/api.ts) and asserts that the touch-first navigation, filters,
 * search overlay, theme switch and player settings sheet actually work at phone
 * and tablet widths — not just that they render.
 *
 * Usage:
 *   APP_URL=http://127.0.0.1:4173 CHROME_PATH=/usr/bin/google-chrome \
 *     node scripts/qa/mobile-flows.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const APP_URL = (process.env.APP_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '')
const SHOT_DIR = process.env.SHOT_DIR ?? 'artifacts/flows'

const VIEWPORTS = [
  { name: 'xs-320', width: 320, height: 640, isMobile: true, hasTouch: true },
  { name: 'iphone-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tablet-768', width: 768, height: 1024, isMobile: true, hasTouch: true },
]

function loadFixtures() {
  const out = '/tmp/emovies-fixtures-flows.cjs'
  execFileSync(
    'node_modules/.bin/esbuild',
    ['tests/fixtures/api.ts', '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`, '--log-level=error'],
    { stdio: 'inherit' },
  )
  return require(out)
}

/**
 * Headless Chrome in CI has no H.264 decoder and we cannot ship a real media
 * file, so the <video> element is stubbed: it reports metadata and "plays"
 * without decoding. This exercises the *UI* (controls, sheets, error paths);
 * it is not a codec test — real decoding is verified manually in a browser.
 */
async function stubMedia(page) {
  await page.evaluateOnNewDocument(() => {
    const proto = HTMLMediaElement.prototype
    Object.defineProperty(proto, 'readyState', { get: () => 4, configurable: true })
    Object.defineProperty(proto, 'duration', { get: () => 2700, configurable: true })
    Object.defineProperty(proto, 'paused', { get: () => !window.__playing, configurable: true })
    Object.defineProperty(proto, 'currentTime', {
      get: () => window.__time ?? 0,
      set: (value) => {
        window.__time = value
      },
      configurable: true,
    })
    Object.defineProperty(proto, 'buffered', { get: () => ({ length: 1, end: () => 1200 }), configurable: true })
    proto.load = function load() {
      setTimeout(() => this.dispatchEvent(new Event('loadedmetadata')), 0)
    }
    proto.play = function play() {
      window.__playing = true
      setTimeout(() => {
        this.dispatchEvent(new Event('play'))
        this.dispatchEvent(new Event('playing'))
      }, 0)
      return Promise.resolve()
    }
    proto.pause = function pause() {
      window.__playing = false
      this.dispatchEvent(new Event('pause'))
    }
  })
}

async function setup(page, fixtures) {
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('filmy-flow-api.vercel.app')) {
      let body = {}
      try {
        body = fixtures.payloadFor(url) ?? {}
      } catch {
        body = {}
      }
      req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(body),
      })
      return
    }
    if (/\.mp4|\.mpd|\.m3u8/i.test(url) || url.includes('/stream?u=')) {
      // Hold media requests open: no bytes, so the element never errors while
      // the stubbed HTMLMediaElement above reports a ready, playable video.
      // This keeps the real control bar on screen for the UI assertions.
      return
    }
    if (/^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(url)) {
      req.respond({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"/>' })
      return
    }
    req.continue()
  })
}

const settle = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms))

async function run() {
  const chrome = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
  if (!fs.existsSync(chrome)) {
    console.error(`Chrome not found at ${chrome}`)
    process.exit(2)
  }
  const puppeteer = require('puppeteer-core')
  const fixtures = loadFixtures()
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] })

  const results = []
  const record = (viewport, name, ok, detail = '') => {
    results.push({ viewport, name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'} ${viewport} ${name}${detail ? ` — ${detail}` : ''}`)
  }

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage()
    await page.setViewport(viewport)
    await stubMedia(page)
    await setup(page, fixtures)
    const consoleErrors = []
    page.on('pageerror', (error) => consoleErrors.push(String(error.message).slice(0, 160)))

    // ---------------------------------------------------------------- A. nav
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle2' })
    await settle()
    try {
      await page.click('nav[aria-label="Primary mobile navigation"] a[href$="/movies"]')
      await settle(900)
      const state = await page.evaluate(() => ({
        path: window.location.pathname,
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
      }))
      record(viewport.name, 'bottom-nav → Movies', state.path.endsWith('/movies') && /movies/i.test(state.heading), `${state.path} · “${state.heading}”`)
    } catch (error) {
      record(viewport.name, 'bottom-nav → Movies', false, String(error.message).slice(0, 120))
    }
    await page.screenshot({ path: path.join(SHOT_DIR, `${viewport.name}_movies.png`) })

    // ------------------------------------------------------------ B. filters
    try {
      const buttons = await page.$$('button')
      for (const button of buttons) {
        const label = await page.evaluate((el) => el.textContent?.trim() ?? '', button)
        if (label.startsWith('Filters')) {
          await button.click()
          break
        }
      }
      await settle(500)
      const dialogOpen = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')))
      // Pick the first real genre from the sheet's select.
      const genre = await page.evaluate(() => {
        const select = document.querySelector('[role="dialog"] select[aria-label="Filter by genre"]')
        if (!select) return null
        const option = [...select.querySelectorAll('option')].find((item) => item.value)
        if (!option) return null
        select.value = option.value
        select.dispatchEvent(new Event('change', { bubbles: true }))
        return option.value
      })
      await settle(800)
      const chipState = await page.evaluate(() => ({
        url: window.location.search,
        dialog: Boolean(document.querySelector('[role="dialog"]')),
        body: document.body.innerText,
      }))
      const chipVisible = genre ? chipState.body.includes(genre) : false
      record(
        viewport.name,
        'filters sheet applies a genre',
        dialogOpen && Boolean(genre) && chipState.url.includes('genre=') && chipVisible,
        `genre=${genre ?? 'none'} · url=${chipState.url || '(none)'}`,
      )
      await page.screenshot({ path: path.join(SHOT_DIR, `${viewport.name}_filters.png`) })
      await page.keyboard.press('Escape')
      await settle(300)
    } catch (error) {
      record(viewport.name, 'filters sheet applies a genre', false, String(error.message).slice(0, 120))
    }

    // ------------------------------------------------------------- C. search
    try {
      await page.goto(`${APP_URL}/`, { waitUntil: 'domcontentloaded' })
      await settle(1200)
      await settle()
      const searchButton = await page.$('nav[aria-label="Primary mobile navigation"] button[aria-label="Open search"]')
      await searchButton?.click()
      await settle(500)
      await page.type('input[aria-label="Search titles"]', 'colony', { delay: 20 })
      await settle(1600)
      const overlay = await page.evaluate(() => {
        const options = [...document.querySelectorAll('[role="option"]')]
        return { count: options.length, first: options[0]?.textContent?.slice(0, 40) ?? '' }
      })
      await page.screenshot({ path: path.join(SHOT_DIR, `${viewport.name}_search.png`) })
      if (overlay.count > 0) {
        await page.click('[role="option"]')
        await settle(900)
      }
      const path2 = await page.evaluate(() => window.location.pathname)
      record(viewport.name, 'search overlay → opens a title', overlay.count > 0 && path2.includes('/title/'), `${overlay.count} results · ${path2}`)
    } catch (error) {
      record(viewport.name, 'search overlay → opens a title', false, String(error.message).slice(0, 120))
    }

    // -------------------------------------------------------------- D. theme
    try {
      await page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle2' })
      await settle()
      const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      await page.click('button[aria-label="Switch to light theme"]')
      await settle(400)
      const light = await page.evaluate(() => document.documentElement.classList.contains('light') || !document.documentElement.classList.contains('dark'))
      await page.screenshot({ path: path.join(SHOT_DIR, `${viewport.name}_light.png`) })
      await page.click('button[aria-label="Switch to dark theme"]').catch(() => {})
      record(viewport.name, 'theme toggle', dark && light, `dark=${dark} → light=${light}`)
    } catch (error) {
      record(viewport.name, 'theme toggle', false, String(error.message).slice(0, 120))
    }

    // ------------------------------------------------- E. player settings UI
    try {
      await page.goto(`${APP_URL}/watch/colony-06FbDRS87x3`, { waitUntil: 'domcontentloaded' })
      await settle(2000)
      await page.screenshot({ path: path.join(SHOT_DIR, `${viewport.name}_player.png`) })
      const visible = (selector) =>
        page.evaluate((sel) => {
          const el = document.querySelector(sel)
          if (!el) return false
          const rect = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        }, selector)
      const hasSettings = await visible('button[aria-label="Playback settings"]')
      const errorPanel = await page.evaluate(() => Boolean(document.querySelector('[role="alert"]')))
      if (hasSettings) {
        await page.click('button[aria-label="Playback settings"]')
        await settle(600)
        await page.screenshot({ path: path.join(SHOT_DIR, `${viewport.name}_player_settings.png`) })
      }
      const sheet = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        return { open: Boolean(dialog), text: (dialog?.textContent ?? '').slice(0, 120) }
      })
      // Wider screens keep the inline control-bar menus instead of the sheet.
      const inlineMenus = await visible('button[aria-label="Playback quality"]')
      const ok = errorPanel ? false : hasSettings ? sheet.open : inlineMenus
      record(
        viewport.name,
        hasSettings ? 'player settings sheet (touch UI)' : 'player inline menus (wide UI)',
        ok,
        `settingsButton=${hasSettings} sheet=${sheet.open} inlineQualityMenu=${inlineMenus} errorPanel=${errorPanel}`,
      )
    } catch (error) {
      record(viewport.name, 'player controls (sheet or inline menus)', false, String(error.message).slice(0, 120))
    }

    if (consoleErrors.length) record(viewport.name, 'no runtime errors', false, consoleErrors.slice(0, 2).join(' ~ '))
    await page.close()
  }

  await browser.close()
  const failed = results.filter((item) => !item.ok)
  const summary = [
    `flows: ${results.length} checks, ${failed.length} failed`,
    ...failed.map((item) => `${item.viewport} ${item.name} :: ${item.detail}`),
  ].join('\n')
  console.log(summary)
  fs.writeFileSync(path.join(SHOT_DIR, 'flows-summary.txt'), summary)
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error::${summary.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A').slice(0, 59000)}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
