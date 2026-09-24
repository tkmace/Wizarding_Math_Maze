import { chromium } from 'playwright'
import { takeNest } from './harness.mjs'
const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.fill('input[type=text]', 'Camille'); await page.fill('input[type=password]', '1234')
await page.locator('button', { hasText: 'Begin the Journey' }).click()
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 15000 })
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/hub-portrait.png` })
console.log('errors:', errs.length ? errs.join('|') : 'none')
await b.close()
