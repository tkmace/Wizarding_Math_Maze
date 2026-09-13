import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { takeNest } from './harness.mjs'

const ROOT = '/home/claude/wmm/dist'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' }
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')
  if (u.pathname === '/api/profile') { res.writeHead(503); return res.end('{}') }  // sync off for this run
  let p = u.pathname === '/' ? '/index.html' : u.pathname
  const f = path.join(ROOT, p)
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nf') }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
await new Promise(r => srv.listen(4190, r))

const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const errs = []

async function open(label, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true })
  const page = await ctx.newPage()
  page.on('pageerror', e => errs.push(`[${label}] PAGEERROR ${e.message}`))
  page.on('console', m => {
    const t = m.text()
    if (m.type() === 'error' && !t.includes('TUNNEL') && !t.includes('503') && !t.includes('Failed to load resource')) errs.push(`[${label}] ${t}`)
  })
  await page.goto('http://localhost:4190/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  return page
}

const snap = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` })
const prof = page => page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('wmm.profiles.v3') || '{}').camille
  return p && { pts: p.totalPoints, skin: p.equippedSkin, chosen: p.chosen, skill: p.skill, plays: p.plays, diff: p.settings.diff }
})

/** Answer whatever door puzzle is open. */
async function answerDoor(page, correct = true) {
  const txts = await page.locator('div').filter({ hasText: /^\d+ [+−×÷] \d+$/ }).allTextContents()
  const disp = txts.find(t => /^\d+ [+−×÷] \d+$/.test(t.trim()))
  if (!disp) return null
  const m = disp.trim().match(/^(\d+) ([+−×÷]) (\d+)$/)
  const a = +m[1], b = +m[3]
  let ans = m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '×' ? a * b : a / b
  if (!correct) ans = ans + 7
  for (const ch of String(ans)) await page.locator('button', { hasText: new RegExp(`^${ch}$`) }).first().click()
  await page.locator('button', { hasText: '✓' }).click()
  await page.waitForTimeout(750)
  return disp.trim()
}

const page = await open('main', 430, 900)

// ── 1. New profile, Wizard's Sense should already be chosen ─────────────────
await page.fill('input[type=text]', 'Camille')
await page.fill('input[type=password]', '1234')
await page.locator('button', { hasText: 'Begin the Journey' }).click()
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 15000 })
await snap(page, '40-hub-v4')
const senseDefault = (await prof(page)).diff
console.log('1. default difficulty:', senseDefault, senseDefault === 'sense' ? 'PASS' : 'FAIL')
console.log('   Wizard\'s Sense row present:', await page.locator("text=Wizard's Sense").count() > 0 ? 'PASS' : 'FAIL')
console.log('   marked recommended:', await page.locator('text=RECOMMENDED').count() > 0 ? 'PASS' : 'FAIL')

// ── 2. Into a maze: third-person wizard, side tabs, gate bar ───────────────
await page.locator('button', { hasText: 'Multiplication' }).click()
await page.locator('button', { hasText: 'Enter the Maze' }).click()
await page.waitForTimeout(1400)
await snap(page, '41-game-thirdperson')
console.log('2. exit gate bar shown:', await page.locator('text=/EXIT SEALED|EXIT UNSEALED/').count() > 0 ? 'PASS' : 'FAIL')
const gateTxt = await page.locator('text=/EXIT SEALED/').first().textContent().catch(() => '')
console.log('   gate says:', gateTxt.trim())

// Walk around and catch a frame where a side turn is signposted.
let sawSide = false
for (let i = 0; i < 60 && !sawSide; i++) {
  if (await page.locator('text=PATH').count() || await page.locator('div', { hasText: /^DOOR$/ }).count()) sawSide = true
  else { await page.keyboard.press(Math.random() < 0.5 ? 'ArrowUp' : 'ArrowRight'); await page.waitForTimeout(120) }
}
console.log('   side signpost seen:', sawSide ? 'PASS' : 'FAIL')
if (sawSide) await snap(page, '42-side-signposts')

// ── 3. Door prompt must not reveal the numbers ──────────────────────────────
let atDoor = false
for (let i = 0; i < 140 && !atDoor; i++) {
  if (await page.locator('text=PRESS ▲ TO UNLOCK').count()) atDoor = true
  else { const r = Math.random(); await page.keyboard.press(r < 0.6 ? 'ArrowUp' : r < 0.8 ? 'ArrowLeft' : 'ArrowRight'); await page.waitForTimeout(110) }
}
if (atDoor) {
  await page.waitForTimeout(400)
  await snap(page, '43-door-blurred')
  const prompt = await page.locator('text=SEALED DOOR').first().textContent()
  const leaks = /\d+\s*[+−×÷]\s*\d+/.test(prompt)
  console.log('3. door prompt text:', JSON.stringify(prompt.trim()), '| leaks the sum:', leaks ? 'FAIL' : 'PASS')
}

// ── 4. Play until rank 1 (100 pts), across as many mazes as it takes ───────
let doors = 0, mazes = 0, choosing = false
for (let i = 0; i < 2600 && !choosing; i++) {
  // A door puzzle is open whenever the keypad's tick button exists.
  if (await page.locator('button', { hasText: '✓' }).count()) {
    await answerDoor(page, true); doors++; continue
  }
  // The rank-up choice takes priority over everything else.
  if (await page.locator('text=Choose the robes you will wear').count()) { choosing = true; break }
  // An encounter swallows the arrow keys. Its intro needs a click, then the
  // duel takes 1-4; without this the walk stalls at the first creature.
  if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) {
    await page.locator('button', { hasText: /Raise your wand|Catch the runes/ }).click()
    await page.waitForTimeout(400)
    continue
  }
  if (await page.locator('text=/^◆ SPELL DUEL$/').count()) {
    await page.keyboard.press(String(1 + (i % 4)))
    await page.waitForTimeout(140)
    continue
  }
  // Rune Catch is tap-only — no keyboard path — so click the canvas.
  if (await page.locator('text=/^◆ RUNE CATCH$/').count()) {
    await page.locator('canvas').last().click({ position: { x: 30 + (i % 5) * 40, y: 40 + (i % 4) * 30 } }).catch(() => {})
    await page.waitForTimeout(200)
    continue
  }
  if (await page.locator('text=Maze Conquered').count()) {
    mazes++
    if (mazes === 1) await snap(page, '44-win-screen')
    await page.locator('button', { hasText: /Choose my new robes|Another Maze/ }).click()
    await page.waitForTimeout(900)
    continue
  }
  const r = Math.random()
  await page.keyboard.press(r < 0.62 ? 'ArrowUp' : r < 0.81 ? 'ArrowLeft' : 'ArrowRight')
  await page.waitForTimeout(45)
}
const p4 = await prof(page)
console.log('4. mazes cleared:', mazes, '| doors answered:', doors, '| points:', p4.pts)
console.log('   multiplication skill 0.06 ->', p4.skill.multiplication.toFixed(3),
            p4.skill.multiplication > 0.06 ? 'PASS (adapting up)' : 'FAIL')
// Whether the random walk banks the 100 points for rank 1 inside this run is
// luck, so it isn't an assertion here. picktest.mjs seeds a profile and checks
// the choice screen deterministically.
console.log('   pick-one-of-three reached:', choosing ? 'PASS' : `not this run (${p4.pts} pts of 100) — see picktest.mjs`)

if (choosing) {
  await snap(page, '45-skin-choice')
  const titles = await page.locator('button').filter({ hasText: /Candle Mage|Leaf Whisperer|Pebble Adept/ }).count()
  console.log('   rank-1 forms offered:', titles, titles === 3 ? 'PASS' : 'FAIL')
  await page.locator('button').filter({ hasText: /Leaf Whisperer/ }).first().click()
  await page.waitForTimeout(400)
  await snap(page, '46-choice-selected')
  await page.locator('button', { hasText: /^Become the/ }).click()
  await page.waitForTimeout(400)
  await snap(page, '46b-confirm')
  await page.locator('button', { hasText: 'Yes — become it' }).click()
  await page.waitForTimeout(1000)
  const after = await prof(page)
  console.log('   chosen recorded:', JSON.stringify(after.chosen), '| wearing:', after.skin,
              after.chosen && after.chosen['1'] === 'leaf' && after.skin === 'leaf' ? 'PASS' : 'FAIL')
  await snap(page, '47-hub-newform')
}

// ── 5. Wardrobe gallery ─────────────────────────────────────────────────────
if (await page.locator('button', { hasText: 'Wardrobe' }).count()) {
  await page.locator('button', { hasText: 'Wardrobe' }).click()
  await page.waitForTimeout(900)
  await snap(page, '48-wardrobe-gallery')
  const locked = await page.locator('text=🔒 locked').count()
  // The two forms she passed over at rank 1 are no longer sealed — they carry a
  // rune price and, once she's saved up, a BUY button.
  const priced = await page.locator('text=/^save \\d+ more$/').count()
  const buyable = await page.locator('button', { hasText: /^BUY/ }).count()
  console.log('5. wardrobe: locked ranks shown:', locked,
              '| passed-over forms priced in runes:', priced + buyable,
              locked > 0 && priced + buyable >= 2 ? 'PASS' : 'FAIL')
}

console.log('\nERRORS:', errs.length ? errs.join('\n') : 'none')
await browser.close()
srv.close()
