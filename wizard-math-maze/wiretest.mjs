// Is anything actually WIRED to a sound?
//
// This test exists because of a specific failure. Sound shipped, the toggle in
// the castle said it was on, and the tablet was silent — and the check that
// said otherwise had been run in a browser launched with
// `--autoplay-policy=no-user-gesture-required`, which switches off the one
// restriction the code was written to handle. The check proved nothing, and it
// was mine.
//
// So this runs under the ordinary autoplay policy (see testenv.mjs — no flags)
// and asserts two separate things that were both broken and both invisible:
//
//   1. A real user gesture leaves the AudioContext RUNNING. Not "sound is
//      switched on" — a context that is suspended swallows every sound in
//      silence and reports no error anywhere.
//   2. Each action schedules at least one voice. A missing `sfx.step()` is not
//      a crash, not a warning and not visible in a screenshot; the only way it
//      ever shows up is a child saying it feels half-muted.
//
// It counts voices rather than listening. There is no way to hear anything from
// here, so what is checked is that the browser was ASKED to make a sound at the
// moment of each action. `soundtest.mjs` checks what those sounds are like and
// `soundsheet.mjs` measures how loud; this one checks that they are plugged in.
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest, clearCoach, seedPage, rng } from './harness.mjs'
import { SHOTS, DIST, launch } from './testenv.mjs'

const M = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' }
const srv = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x')
  if (u.pathname === '/api/profile') { r.writeHead(503); return r.end('{}') }
  const f = path.join(DIST, u.pathname === '/' ? '/index.html' : u.pathname)
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'Content-Type': M[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(r)
})
await new Promise(r => srv.listen(4236, r))

let fails = 0
const check = (name, ok, extra) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fails++
}

const b = await launch()
const errs = []
const ctx = await b.newContext({ viewport: { width: 900, height: 940 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
await seedPage(page)

// Count every voice the page starts, and keep hold of the context so its state
// can be read later. Installed before any app code runs.
await page.addInitScript(() => {
  window.__wire = { voices: 0, ctxs: [], resumes: 0 }
  const wrap = AC => class extends AC {
    constructor(...a) {
      super(...a)
      window.__wire.ctxs.push(this)
      const r = this.resume.bind(this)
      this.resume = (...x) => { window.__wire.resumes++; this._woke = true; return r(...x) }
    }
    /**
     * Pretend to be Safari.
     *
     * Desktop Chromium hands back a context that is ALREADY running once the
     * page has had a trusted click, so it never exercises the unlock path at
     * all — which is why the original bug survived a check on a laptop. Here
     * the context reports `suspended` until something calls resume() on it,
     * exactly as a tablet does. Everything after this point is therefore
     * running through the code path that was broken.
     */
    get state() { return this._woke ? super.state : 'suspended' }
    createOscillator() {
      const o = super.createOscillator()
      const s = o.start.bind(o)
      o.start = (...x) => { window.__wire.voices++; return s(...x) }
      return o
    }
    createBufferSource() {
      const n = super.createBufferSource()
      const s = n.start.bind(n)
      // The one-sample silent buffer that unlocks iOS is not a sound. Counting
      // it would make every assertion below pass on the unlock alone.
      n.start = (...x) => { if (n.buffer && n.buffer.length > 1) window.__wire.voices++; return s(...x) }
      return n
    }
  }
  if (window.AudioContext) window.AudioContext = wrap(window.AudioContext)
  if (window.webkitAudioContext) window.webkitAudioContext = wrap(window.webkitAudioContext)
})

const voices = () => page.evaluate(() => window.__wire.voices)
const state = () => page.evaluate(() => window.__wire.ctxs.map(c => c.state).join(','))
/** Did `act` get the browser asked for a sound? */
const fires = async (label, act, settle = 260) => {
  const before = await voices()
  await act()
  await page.waitForTimeout(settle)
  const after = await voices()
  check(label, after > before, `${after - before} voices`)
  return after - before
}

await page.goto('http://localhost:4236/', { waitUntil: 'networkidle' })

console.log('a real gesture unlocks the audio clock')
await page.fill('input[type=text]', 'Camille')
await page.fill('input[type=password]', '1234')
// A trusted click, under the browser's ordinary autoplay policy. This is the
// whole point: no launch flag is relaxing anything here.
await page.locator('button', { hasText: 'Begin the Journey' }).click()
await page.waitForTimeout(500)
check('a context born suspended gets resumed', await page.evaluate(() => window.__wire.resumes) > 0,
  `${await page.evaluate(() => window.__wire.resumes)} resume calls`)
check('and ends up running', (await state()).includes('running'), await state())

await takeNest(page)
await clearCoach(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 15000 })

console.log('the castle answers a tap')
await fires('entering the maze makes a sound',
  () => page.locator('button', { hasText: 'Enter the Maze' }).click())
await page.waitForTimeout(900)
await clearCoach(page)

console.log('the maze is not silent')
const fwd = page.locator('button[aria-label="Walk forward"]')
const left = page.locator('button[aria-label="Turn left"]')
// Walking: try a few squares, because the very first one may face a wall, and
// walking into stone is deliberately silent.
let walked = 0
for (let i = 0; i < 8 && walked === 0; i++) {
  const before = await voices()
  if (await fwd.count()) await fwd.click()
  await page.waitForTimeout(200)
  walked = (await voices()) - before
  if (walked === 0 && await left.count()) { await left.click(); await page.waitForTimeout(160) }
  await clearCoach(page)
}
check('a step makes a sound', walked > 0, `${walked} voices`)

if (await left.count()) {
  await fires('turning makes a sound', () => left.click(), 200)
}

console.log('answering makes a sound')
// The questions are read off the panel and actually SOLVED, so the run can
// bank points, open doors and reach the way out. A test that typed any old
// digits would only ever hear the neutral tone and would never get far enough
// to find out whether the gate makes a sound at all.
const QRE = /^(\d+)\s*([+\-\u2212\u00d7\u00f7x*/])\s*(\d+)$/
const readQ = () => page.evaluate(() => {
  const re = /^(\d+)\s*([+\-\u2212\u00d7\u00f7x*/])\s*(\d+)$/
  for (const d of document.querySelectorAll('div')) {
    if (d.children.length === 0 && re.test(d.textContent.trim())) return d.textContent.trim()
  }
  return null
})
const solve = t => {
  const m = QRE.exec(t), a = +m[1], b = +m[3]
  return m[2] === '+' ? a + b
    : (m[2] === '-' || m[2] === '\u2212') ? a - b
    : (m[2] === '\u00f7') ? a / b : a * b
}

// Walking is a left-hand wall follower, and the ORACLE FOR "did I move" is the
// sound itself: a step makes a noise and walking into stone deliberately makes
// none, so the voice counter says whether the square ahead was open. A random
// walk was tried first and answered twenty doors without ever stumbling onto
// the exit, which is a thing no amount of extra iterations fixes.
const rand = rng()
let doorsAnswered = 0, rightDelta = 0, ambush = 0, sealed = 0, gate = 0, won = false
// The creature lands in the corridor and the card follows it ~760ms later
// (AMBUSH_MS), so the sound belongs to the step BEFORE the card is on screen.
// Measuring when the card appears finds nothing — movement is blocked by then.
let lastStep = 0, usedIters = -1
const atDoor = async () => (await page.locator('text=/^◆ SEALED DOOR|^◆ RUNE OF RETURN/').count()) > 0
const atWin = async () => (await page.locator('button', { hasText: 'Return to Castle' }).count()) > 0
const atCreature = async () => (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) > 0
const turnL = async () => { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(45) }
const turnR = async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(45) }
const stepped = async () => {
  const before = await voices()
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(85)
  const d = (await voices()) - before
  if (d > 0) lastStep = d
  // The sealed gate is the one square that makes a sound WITHOUT moving her,
  // so the oracle has to know about it. Without this the follower reads its own
  // refusal as a successful step, walks into the gate forever, and never goes
  // looking for the doors that would open it.
  if (await page.locator('text=/sealed/').count()) { sealed = Math.max(sealed, d); return false }
  return d > 0
}

for (let i = 0; i < 700 && !won; i++) {
  if (await clearCoach(page)) continue
  if (await atWin()) { gate = lastStep; won = true; usedIters = i; break }
  if (await atCreature()) {
    ambush = Math.max(ambush, lastStep)
    await page.locator('button', { hasText: 'Sneak past' }).click()
    await page.waitForTimeout(260); continue
  }
  if (await atDoor()) {
    const text = await readQ()
    if (!text) { await page.waitForTimeout(120); continue }
    if (doorsAnswered === 0) {
      await fires('a digit makes a sound',
        () => page.locator('button', { hasText: /^7$/ }).first().click(), 200)
      await fires('backspace makes a sound',
        () => page.locator('button', { hasText: '⌫' }).first().click(), 200)
    }
    const before = await voices()
    for (const ch of String(solve(text))) { await page.keyboard.press(ch); await page.waitForTimeout(45) }
    await page.keyboard.press('Enter')
    await page.waitForTimeout(420)
    rightDelta = Math.max(rightDelta, (await voices()) - before)
    doorsAnswered++
    continue
  }
  // Two different walks, because they are good at two different things.
  //
  // A biased random walk finds DOORS: it answered twenty of them in an early
  // version of this test. It is hopeless at finding the exit — it never once
  // stumbled onto it. A left-hand wall follower is the opposite: it walked to
  // the gate within seconds and then cycled a corridor loop forever, answering
  // two doors in two minutes. So: wander until the run has banked enough points
  // to open the gate, then follow the wall to it.
  // Alternating blocks: wander for a while, then follow the wall for a while.
  // One pass of each is not enough — the gate needs points she has not banked
  // yet the first time she reaches it — so they take turns until she has both
  // the points and the way out.
  if (Math.floor(i / 80) % 2 === 0) {
    const r = rand()
    const before = await voices()
    await page.keyboard.press(r < 0.66 ? 'ArrowUp' : r < 0.83 ? 'ArrowLeft' : 'ArrowRight')
    await page.waitForTimeout(70)
    const d = (await voices()) - before
    if (d > 0) lastStep = d
    continue
  }
  // Left, then straight on, then right, then back the way she came.
  await turnL()
  for (let k = 0; k < 4; k++) {
    if (await stepped()) break
    if (await atDoor() || await atCreature() || await atWin()) break
    await turnR()
  }
}

check(`doors were answered (${doorsAnswered})`, doorsAnswered > 0)
check('a correct answer makes a sound', rightDelta > 0, `${rightDelta} voices`)
check('an encounter arriving makes its own sound, over the step',
  ambush > 3, `${ambush} voices on the step it landed on`)
// The budget is printed so a future reader can see the margin rather than
// guess at it: if this starts reporting a number near the cap, the walk has got
// worse and the honest fix is the walk, not a bigger cap.
check(`the way out was reached (${usedIters} of 700 moves)`, won)
check('the gate makes a bigger sound than a step', gate > 4, `${gate} voices on the last step`)
if (sealed) check('a sealed gate makes a sound', sealed > 0, `${sealed} voices`)

check('no page errors', errs.length === 0, errs.join(' | '))
await page.screenshot({ path: path.join(SHOTS, 'wiretest.png') })

await b.close()
srv.close()
console.log(fails ? `${fails} FAILED` : 'all passed')
process.exit(fails ? 1 : 0)
