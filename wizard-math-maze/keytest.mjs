// The answer box must contain EXACTLY what was typed — nothing leaked in from
// walking into the door, from a held key, or from a button that still had focus.
import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest, clearCoach } from './harness.mjs'
const ROOT = '/home/claude/wmm/dist'
const M = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' }
const srv = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x')
  if (u.pathname === '/api/profile') { r.writeHead(503); return r.end('{}') }
  const f = path.join(ROOT, u.pathname === '/' ? '/index.html' : u.pathname)
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'Content-Type': M[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(r)
})
await new Promise(r => srv.listen(4231, r))
const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const errs = []
const ctx = await b.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
await page.goto('http://localhost:4231/', { waitUntil: 'networkidle' })
await page.fill('input[type=text]', 'Camille')
await page.fill('input[type=password]', '1234')
await page.locator('button', { hasText: 'Begin the Journey' }).click()
await takeNest(page)
await clearCoach(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 15000 })
await page.locator('button', { hasText: 'Enter the Maze' }).click()
await page.waitForTimeout(1200)

// A first-run card can turn up mid-question (a rune picked up on the way in,
// the sealed exit) and sits over the keypad. Clear it before reading or
// pressing anything, or the assertion reads a box that isn't reachable.
const guard = async () => { await clearCoach(page) }
const boxText = () => page.evaluate(() => {
  const els = [...document.querySelectorAll('div')]
  const el = els.find(d => d.title === 'Tap to clear')
  return el ? el.textContent.trim() : null
})
const doorOpen = () => page.locator('button', { hasText: '✓' }).count().then(n => n > 0)
const clearEncounter = async i => {
  // A first-run explanation sits on top of everything it explains, so it has to
  // go before anything underneath it can be clicked.
  if (await clearCoach(page)) return true
  if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) {
    await page.locator('button', { hasText: /Raise your wand|Catch the runes/ }).click()
    await page.waitForTimeout(350); return true
  }
  if (await page.locator('text=/^◆ SPELL DUEL$/').count()) {
    await page.keyboard.press(String(1 + (i % 4))); await page.waitForTimeout(150); return true
  }
  if (await page.locator('text=/^◆ RUNE CATCH$/').count()) {
    await page.locator('canvas').last().click({ position: { x: 30 + (i % 5) * 40, y: 40 + (i % 4) * 30 } }).catch(() => {})
    await page.waitForTimeout(180); return true
  }
  return false
}

/** Walk until a door puzzle is open. Holds ▲ down, which is how a child walks. */
async function walkToDoor(hold) {
  for (let i = 0; i < 300; i++) {
    // A first-run card covers whatever it explains — clear it first, or every
    // click below lands on the card instead of the thing underneath.
    if (await clearCoach(page)) continue
    if (await doorOpen()) return true
    if (await clearEncounter(i)) continue
    if (hold && await page.locator('text=PRESS ▲ TO UNLOCK').count()) {
      // Press and HOLD into the door — the case that used to leak a keystroke.
      await page.keyboard.down('ArrowUp')
      await page.waitForTimeout(420)
      await page.keyboard.up('ArrowUp')
      continue
    }
    const r = Math.random()
    await page.keyboard.press(r < 0.62 ? 'ArrowUp' : r < 0.81 ? 'ArrowLeft' : 'ArrowRight')
    await page.waitForTimeout(60)
  }
  return false
}

let pass = 0, fail = 0
const check = (name, ok, detail = '') => {
  console.log(`   ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`)
  ok ? pass++ : fail++
}

// ── 1. A door reached by HOLDING the walk key starts empty ───────────────────
console.log('1. holding ▲ into a door')
if (!await walkToDoor(true)) { console.log('   never reached a door'); }
else {
  await page.waitForTimeout(250)
  check('answer box starts empty', await boxText() === '?', JSON.stringify(await boxText()))

  // ── 2. Typing gives exactly the digits typed ──────────────────────────────
  await page.waitForTimeout(200)
  for (const d of '435') { await page.keyboard.press(d); await page.waitForTimeout(60) }
  check('typed 435 reads back as 435', await boxText() === '435', JSON.stringify(await boxText()))

  // ── 3. A held digit does not auto-repeat into the answer ──────────────────
  await page.keyboard.press('Escape')
  await page.waitForTimeout(80)
  check('Escape clears the box', await boxText() === '?', JSON.stringify(await boxText()))
  await guard()
  await page.keyboard.down('8')
  await page.waitForTimeout(900)
  await page.keyboard.up('8')
  await page.waitForTimeout(80)
  check('holding 8 enters exactly one 8', await boxText() === '8', JSON.stringify(await boxText()))

  // ── 4. Space cannot re-fire a keypad button that still has focus ──────────
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  await guard()
  await page.locator('button').filter({ hasText: /^7$/ }).first().click()
  await page.waitForTimeout(100)
  await page.keyboard.press(' ')
  await page.waitForTimeout(150)
  check('Space after clicking 7 leaves just 7', await boxText() === '7', JSON.stringify(await boxText()))

  // ── 5. Tapping the box clears it ─────────────────────────────────────────
  await guard()
  await page.locator('div[title="Tap to clear"]').click()
  await page.waitForTimeout(120)
  check('tapping the box clears it', await boxText() === '?', JSON.stringify(await boxText()))

  // ── 6. The keypad must not move while the question is open ───────────────
  const keyBox = () => page.locator('button').filter({ hasText: /^5$/ }).first().boundingBox()
  const before = await keyBox()
  // The quick-bonus window expires ~6s in; the keypad used to jump when it did.
  await page.waitForTimeout(7000)
  const after = await keyBox()
  check('keypad stays put across the quick-bonus expiry',
    Math.abs(before.y - after.y) < 1, `moved ${(after.y - before.y).toFixed(1)}px`)
  await page.screenshot({ path: `${OUT}/80-door-stable.png` })
}

console.log(`\n${pass} passed, ${fail} failed`)
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none')
await b.close(); srv.close()
