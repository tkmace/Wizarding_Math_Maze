import { takeNest } from './harness.mjs'
import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const b = await launch()
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
