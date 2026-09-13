import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { takeNest } from './harness.mjs'

const ROOT = '/home/claude/wmm/dist'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' }
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')
  if (u.pathname === '/api/profile') { res.writeHead(503); return res.end('{}') }
  const f = path.join(ROOT, u.pathname === '/' ? '/index.html' : u.pathname)
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nf') }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
await new Promise(r => srv.listen(4210, r))

const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const errs = []

async function fresh(label, w = 430, h = 940) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true })
  const page = await ctx.newPage()
  page.on('pageerror', e => errs.push(`[${label}] PAGEERROR ${e.message}`))
  page.on('console', m => {
    const t = m.text()
    if (m.type() === 'error' && !/TUNNEL|503|Failed to load resource/.test(t)) errs.push(`[${label}] ${t}`)
  })
  await page.goto('http://localhost:4210/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(450)
  await page.fill('input[type=text]', 'Cam')
  await page.fill('input[type=password]', '1234')
  await page.locator('button', { hasText: 'Begin the Journey' }).click()
  await takeNest(page)
  await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 15000 })
  await page.locator('button', { hasText: 'Multiplication' }).click()
  await page.locator('button', { hasText: 'Enter the Maze' }).click()
  await page.waitForTimeout(1300)
  return page
}

const pts = page => page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('wmm.profiles.v3') || '{}').cam
  return p && { total: p.totalPoints, stones: p.stones, facts: Object.keys(p.facts).length, skill: p.skill.multiplication }
})

/** Walk until an encounter's intro card appears. */
async function walkToEncounter(page, limit = 500) {
  for (let i = 0; i < limit; i++) {
    if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) return true
    if (await page.locator('text=/SPELL DUEL|RUNE CATCH/').count()) return true
    // Clearing the maze parks us on the win screen, where the arrow keys do
    // nothing — without this the walk burns its whole budget standing there.
    if (await page.locator('text=Maze Conquered').count()) {
      await page.locator('button', { hasText: /Another Maze|Choose my new robes/ }).first().click().catch(() => {})
      await page.waitForTimeout(900)
      continue
    }
    if (await page.locator('text=Choose the robes you will wear').count()) {
      await page.locator('button').filter({ hasText: /points|failure|bonus|rune stone|sight|gate/ }).first().click()
      await page.waitForTimeout(250)
      await page.locator('button', { hasText: /^Become the/ }).click(); await page.waitForTimeout(220)
      await page.locator('button', { hasText: 'Yes — become it' }).click(); await page.waitForTimeout(700)
      continue
    }
    // Step past any door puzzle that opens on the way.
    if (await page.locator('button', { hasText: 'Step back' }).count()) {
      await page.locator('button', { hasText: 'Step back' }).click({ timeout: 4000 }).catch(() => {})
      await page.waitForTimeout(140)
      continue
    }
    const r = Math.random()
    await page.keyboard.press(r < 0.6 ? 'ArrowUp' : r < 0.8 ? 'ArrowLeft' : 'ArrowRight')
    await page.waitForTimeout(50)
  }
  return false
}

/** Answer the duel keypad correctly. */
async function duelAnswer(page, correct = true) {
  const txts = await page.locator('div').filter({ hasText: /^\d+ [+−×÷] \d+$/ }).allTextContents()
  const disp = txts.find(t => /^\d+ [+−×÷] \d+$/.test(t.trim()))
  if (!disp) return false
  const m = disp.trim().match(/^(\d+) ([+−×÷]) (\d+)$/)
  const a = +m[1], b = +m[3]
  let v = m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '×' ? a * b : a / b
  if (!correct) v += 3
  for (const ch of String(v)) await page.locator('button', { hasText: new RegExp(`^${ch}$`) }).first().click()
  await page.locator('button', { hasText: '✓' }).click()
  await page.waitForTimeout(420)
  return true
}

// ── 1. An encounter appears and can be won ─────────────────────────────────
let page = await fresh('win')
const found = await walkToEncounter(page)
console.log('1. encounter appeared:', found ? 'PASS' : 'FAIL')
if (found) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/70-encounter-intro.png` })
  const before = await pts(page)
  const isDuel = await page.locator('text=Raise your wand').count() > 0
  console.log('   kind:', isDuel ? 'spell duel' : 'rune catch')
  await page.locator('button', { hasText: /Raise your wand|Catch the runes/ }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/71-encounter-game.png` })

  if (isDuel) {
    for (let i = 0; i < 8; i++) {
      if (await page.locator('text=Vanquished').count() || await page.locator('text=slips away').count()) break
      if (!await page.locator('button', { hasText: '✓' }).count()) break
      await duelAnswer(page, true)
    }
  } else {
    // Tap runes by reading the geometry: click around the canvas until rounds advance.
    for (let r = 0; r < 20; r++) {
      if (await page.locator('text=All runes caught').count() || await page.locator('text=runes scatter').count()) break
      const box = await page.locator('canvas').last().boundingBox()
      if (!box) break
      await page.mouse.click(box.x + box.width * (0.2 + 0.2 * (r % 4)), box.y + box.height * (0.4 + 0.2 * (r % 2)))
      await page.waitForTimeout(260)
    }
  }
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/72-encounter-result.png` })
  await page.waitForTimeout(1600)
  const after = await pts(page)
  console.log('   points', before.total, '->', after.total, '| stones', before.stones, '->', after.stones)
  console.log('   facts recorded:', before.facts, '->', after.facts, after.facts >= before.facts ? 'PASS' : 'FAIL')
  console.log('   skill moved:', before.skill.toFixed(3), '->', after.skill.toFixed(3))
  console.log('   back in the maze:', await page.locator('text=/EXIT SEALED|EXIT UNSEALED/').count() > 0 ? 'PASS' : 'FAIL')
}

// ── 2. Sneaking past costs nothing ─────────────────────────────────────────
page = await fresh('flee')
if (await walkToEncounter(page)) {
  const before = await pts(page)
  await page.locator('button', { hasText: 'Sneak past' }).click()
  await page.waitForTimeout(700)
  const after = await pts(page)
  console.log('2. sneak past: points', before.total, '->', after.total,
              after.total === before.total ? 'PASS (nothing lost)' : 'FAIL')
  console.log('   returned to maze:', await page.locator('text=/EXIT SEALED|EXIT UNSEALED/').count() > 0 ? 'PASS' : 'FAIL')
}

// ── 3. Losing a duel must not take points you already had ──────────────────
page = await fresh('lose')
let banked = 0
// Bank some points at a door first, so there is something that could be lost.
for (let i = 0; i < 400 && banked < 1; i++) {
  if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) {
    await page.locator('button', { hasText: 'Sneak past' }).click(); await page.waitForTimeout(400); continue
  }
  if (await page.locator('button', { hasText: '✓' }).count()) {
    await duelAnswer(page, true).catch(() => {}); banked++; continue
  }
  const r = Math.random()
  await page.keyboard.press(r < 0.6 ? 'ArrowUp' : r < 0.8 ? 'ArrowLeft' : 'ArrowRight')
  await page.waitForTimeout(50)
}
if (await walkToEncounter(page)) {
  const before = await pts(page)
  const isDuel = await page.locator('text=Raise your wand').count() > 0
  await page.locator('button', { hasText: /Raise your wand|Catch the runes/ }).click()
  await page.waitForTimeout(600)
  if (isDuel) {
    for (let i = 0; i < 14; i++) {
      if (await page.locator('text=slips away').count()) break
      if (!await page.locator('button', { hasText: '✓' }).count()) break
      await duelAnswer(page, false)
    }
    await page.waitForTimeout(1700)
    const after = await pts(page)
    console.log('3. lost duel: points', before.total, '->', after.total,
                after.total >= before.total ? 'PASS (nothing lost)' : 'FAIL')
    await page.screenshot({ path: `${OUT}/73-duel-lost.png` })
  } else {
    console.log('3. drew a rune catch instead of a duel — skipping the loss check')
  }
}

console.log('\nERRORS:', errs.length ? errs.join('\n') : 'none')
await browser.close()
srv.close()
