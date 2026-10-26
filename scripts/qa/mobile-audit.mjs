/**
 * Mobile / responsive audit harness.
 *
 * Renders every route in headless Chrome at several viewport sizes with the
 * API mocked from `tests/fixtures/api.ts`, then reports objective layout
 * problems: horizontal overflow, elements pushed outside the viewport, tap
 * targets that are too small, unreadably tiny text, and fixed positioning
 * clashes with the bottom navigation.
 *
 * Usage (requires a running app + puppeteer-core + Chrome):
 *   npm run dev                                  # or: npm run preview
 *   npm i --no-save puppeteer-core
 *   node scripts/qa/mobile-audit.mjs
 *
 * Env:
 *   APP_URL     base URL of the running app (default http://127.0.0.1:4173)
 *   CHROME_PATH override the Chrome binary
 *   SHOT_DIR    where screenshots are written (default ./artifacts/screens)
 *   REPORT      where the JSON report is written (default ./artifacts/audit.json)
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const APP_URL = (process.env.APP_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '')
const SHOT_DIR = process.env.SHOT_DIR ?? 'artifacts/screens'
const REPORT = process.env.REPORT ?? 'artifacts/audit.json'

const ROUTES = [
  '/',
  '/movies',
  '/series',
  '/anime',
  '/trending',
  '/recent',
  '/top-rated',
  '/genres',
  '/genres/Drama',
  '/languages',
  '/languages/English',
  '/providers',
  '/search?q=colony',
  '/my-list',
  '/continue-watching',
  '/history',
  '/settings',
  '/capabilities',
  '/title/colony-06FbDRS87x3',
  '/watch/colony-06FbDRS87x3',
  '/does-not-exist',
]

const VIEWPORTS = [
  { name: 'xs-320', width: 320, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'iphone-390', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'tablet-768', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: 'desktop-1440', width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
]

const POSTER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#1f2a3a"/>' +
  '<text x="50%" y="50%" fill="#8fb8d8" font-size="30" text-anchor="middle" font-family="sans-serif">POSTER</text></svg>'

function loadFixtures() {
  const out = '/tmp/emovies-fixtures.cjs'
  execFileSync(
    'node_modules/.bin/esbuild',
    ['tests/fixtures/api.ts', '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`, '--log-level=error'],
    { stdio: 'inherit' },
  )
  return require(out)
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome',
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

const AUDIT = () => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''
    return `${el.tagName.toLowerCase()}${id}${cls}`
  }
  const rect = (el) => el.getBoundingClientRect()

  // Scrollable containers are allowed to be wider than the viewport.
  const inScroller = (el) => {
    let node = el.parentElement
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      if (/auto|scroll/.test(style.overflowX)) return true
      node = node.parentElement
    }
    return false
  }

  const overflowing = []
  for (const el of document.querySelectorAll('body *')) {
    const r = rect(el)
    if (r.width === 0 || r.height === 0) continue
    if (getComputedStyle(el).position === 'fixed' && el.closest('[aria-hidden="true"]')) continue
    if (r.right > vw + 2 && !inScroller(el)) {
      overflowing.push(`${describe(el)} right=${Math.round(r.right)}`)
    }
  }

  const smallTargets = []
  for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select')) {
    const r = rect(el)
    if (r.width === 0 || r.height === 0) continue
    if (el.closest('.sr-only') || el.classList.contains('sr-only')) continue
    if (r.height < 24 || r.width < 24) smallTargets.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }

  const tinyText = []
  for (const el of document.querySelectorAll('p, span, li, a, button, h1, h2, h3, h4, td, th, label')) {
    if (!el.textContent || el.textContent.trim().length === 0) continue
    if (el.children.length > 0) continue
    const size = Number.parseFloat(getComputedStyle(el).fontSize)
    if (size > 0 && size < 10) tinyText.push(`${describe(el)} ${size}px`)
  }

  const bottomNav = document.querySelector('nav[aria-label="Primary mobile navigation"]')
  const bottomNavVisible = bottomNav ? rect(bottomNav).height > 0 && getComputedStyle(bottomNav).display !== 'none' : false
  const desktopNav = document.querySelector('nav[aria-label="Primary"]')
  const desktopNavVisible = desktopNav ? rect(desktopNav).height > 0 && getComputedStyle(desktopNav).display !== 'none' : false

  const clipped = []
  for (const el of document.querySelectorAll('h1, h2, h3, p, span')) {
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible' && el.textContent?.trim()) {
      clipped.push(describe(el))
    }
  }

  return {
    vw,
    vh,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflowing: overflowing.slice(0, 10),
    smallTargets: smallTargets.slice(0, 10),
    tinyText: [...new Set(tinyText)].slice(0, 10),
    clipped: [...new Set(clipped)].slice(0, 6),
    bottomNavVisible,
    desktopNavVisible,
    hasMain: Boolean(document.querySelector('main')),
    textLength: (document.body.innerText || '').trim().length,
  }
}

async function main() {
  const chrome = findChrome()
  if (!chrome) {
    console.error('No Chrome binary found. Set CHROME_PATH.')
    process.exit(2)
  }
  const puppeteer = require('puppeteer-core')
  const fixtures = loadFixtures()
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  fs.mkdirSync(path.dirname(REPORT), { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  })

  const report = []
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      const page = await browser.newPage()
      await page.setViewport(viewport)
      const errors = []
      page.on('pageerror', (err) => errors.push(`pageerror: ${String(err.message).slice(0, 160)}`))
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text().slice(0, 160)}`)
      })
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
        if (/^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(url)) {
          req.respond({ status: 200, contentType: 'image/svg+xml', body: POSTER_SVG })
          return
        }
        req.continue()
      })

      await page.goto(`${APP_URL}${route}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch((error) => {
        errors.push(`goto: ${String(error.message).slice(0, 120)}`)
      })
      await new Promise((resolve) => setTimeout(resolve, 700))
      const metrics = await page.evaluate(AUDIT).catch((error) => ({ error: String(error) }))
      const shot = path.join(SHOT_DIR, `${viewport.name}${route.replace(/[/?=&]/g, '_') || '_home'}.png`)
      await page.screenshot({ path: shot, fullPage: false }).catch(() => {})
      report.push({ viewport: viewport.name, width: viewport.width, route, shot, errors: errors.slice(0, 3), ...metrics })
      await page.close()
    }
  }
  await browser.close()
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))

  const hard = []
  const soft = []
  for (const row of report) {
    const key = `${row.viewport} ${row.route}`
    if (row.docScrollWidth > row.width + 1) hard.push(`${key} H-SCROLL ${row.docScrollWidth}>${row.width}`)
    if (row.overflowing?.length) hard.push(`${key} OVERFLOW ${row.overflowing.slice(0, 3).join(', ')}`)
    if (row.width < 1024 && row.bottomNavVisible === false) hard.push(`${key} NO-BOTTOM-NAV`)
    if (row.width >= 1024 && row.desktopNavVisible === false) hard.push(`${key} NO-DESKTOP-NAV`)
    if (row.errors?.length) hard.push(`${key} ERRORS ${row.errors.join(' ~ ')}`)
    if (row.tinyText?.length) soft.push(`${key} TINY ${row.tinyText.slice(0, 3).join(', ')}`)
    if (row.smallTargets?.length) soft.push(`${key} TAP ${row.smallTargets.slice(0, 3).join(', ')}`)
  }
  const counts = {}
  for (const row of report) {
    for (const item of row.smallTargets ?? []) {
      const selector = item.replace(/ \d+x\d+$/, '')
      counts[selector] = (counts[selector] ?? 0) + 1
    }
  }
  const worstTargets = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([selector, count]) => `${count}x ${selector}`)

  const summary = [
    `page checks: ${report.length} (${ROUTES.length} routes x ${VIEWPORTS.length} viewports)`,
    `hard issues: ${hard.length}`,
    ...hard.slice(0, 45),
    `soft issues: ${soft.length}`,
    ...soft.slice(0, 12),
    'tap targets (most common):',
    ...worstTargets,
  ].join('\n')
  console.log(summary)
  fs.mkdirSync('artifacts', { recursive: true })
  fs.writeFileSync('artifacts/audit-summary.txt', summary)
  // Emit as a CI annotation so it is readable through the checks API.
  if (process.env.GITHUB_ACTIONS) {
    const escaped = summary.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A').slice(0, 59000)
    console.log(`::error::${escaped}`)
  }
  process.exitCode = 0
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
