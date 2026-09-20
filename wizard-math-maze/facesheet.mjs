// Does the painted face reach the screens that show the whole figure?
import { chromium } from 'playwright'
import { takeNest } from './harness.mjs'
const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.fill('input[type=text]', 'Faceface'); await page.fill('input[type=password]', '1234')
await page.locator('button', { hasText: 'Begin the Journey' }).click()

// The Attunement invitation, before anything is skipped.
await page.locator('text=Who are you?').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
if (await page.locator('text=Who are you?').count()) {
  await page.locator('button', { hasText: 'This is me' }).click()
}
await takeNest(page)
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/face-attune.png` })

// Into the castle, then the wardrobe.
const skip = page.locator('button', { hasText: 'Not now' })
if (await skip.count()) await skip.first().click()
await page.waitForTimeout(600)
for (const b of ['Got it', "I'm ready", 'Onward']) {
  const l = page.locator('button', { hasText: b })
  if (await l.count()) { await l.first().click(); await page.waitForTimeout(300) }
}
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/face-hub.png` })
const ward = page.locator('button', { hasText: 'Wardrobe' })
if (await ward.count()) {
  await ward.first().click()
  await page.waitForTimeout(600)
  const look = page.locator('button', { hasText: 'Let me look' })
  if (await look.count()) { await look.first().click(); await page.waitForTimeout(400) }
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/face-wardrobe.png` })
}
// Back out, then into the Attunement invitation.
const back = page.locator('button', { hasText: 'Back to the Castle' })
if (await back.count()) { await back.first().click(); await page.waitForTimeout(500) }
const att = page.locator('button', { hasText: 'The Attunement' })
if (await att.count()) {
  await att.first().click()
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/face-attune.png` })
}

console.log('errors:', errs.length ? errs.join(' | ') : 'none')
await b.close()
