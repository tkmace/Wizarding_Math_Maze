// The Attunement, end to end in a real browser.
//
// The engine is proved in attunetest.mjs. What this checks is everything round
// it: that a new wizard is offered it, that walking the maze actually asks her
// questions, that the placement reaches her profile — and the two things most
// likely to be quietly wrong, which are that a wrong answer must not block the
// door, and that the placement must still be able to CLIMB afterwards rather
// than being pinned by the beginner ceiling.
import { chromium } from 'playwright'
import { pickWizard } from './harness.mjs'
import http from 'http'; import fs from 'fs'; import path from 'path'
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
await new Promise(r => srv.listen(4236, r))
const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 })
const errs = []; page.on('pageerror', e => errs.push(e.message))
let fails = 0
const check = (n, ok, d) => { console.log(`   ${ok ? 'PASS' : 'FAIL'} — ${n}${d ? ' :: ' + d : ''}`); if (!ok) fails++ }
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('wmm.profiles.v3') || '{}').linden)

await page.goto('http://localhost:4236/', { waitUntil: 'networkidle' })
await page.fill('input[type=text]', 'Linden'); await page.fill('input[type=password]', '1234')
await page.locator('button', { hasText: 'Begin the Journey' }).click()

console.log('1. a new wizard is offered it, after her nest')
await pickWizard(page)
await page.waitForSelector('text=Choose your Nest', { timeout: 15000 })
await page.locator('button', { hasText: 'Golden Eagles' }).first().click()
await page.locator('button', { hasText: /^Join the / }).click()
await page.waitForSelector('text=The Attunement', { timeout: 15000 })
check('the invitation follows the nest', true)
check('it can be declined', await page.locator('button', { hasText: 'Not now' }).count() === 1)
check('it says how long it is', /\d+ doors/.test(await page.locator('text=/about/').first().innerText()))
await page.screenshot({ path: `${OUT}/attune-invite.png`, fullPage: true })

console.log('2. walking it asks questions')
await page.locator('button', { hasText: 'Begin the Attunement' }).click()
await page.waitForSelector('text=THE ATTUNEMENT', { timeout: 10000 })
check('no score, no sealed exit — just the meter', await page.locator('text=EXIT SEALED').count() === 0)

const doorUp = () => page.locator('text=/^◆ SEALED DOOR$/').count()
const SUM = /^(\d+) ([+−×÷]) (\d+)$/

/** Read the sum off the open door. Short timeout: a miss must not cost 30s. */
async function sum() {
  const t = await page.getByText(SUM).first().innerText({ timeout: 1500 }).catch(() => '')
  return SUM.exec(t.trim())
}
/**
 * The same read, but patient.
 *
 * A door takes a moment to open, and a single impatient read comes back empty
 * perhaps one time in twenty. That used to be invisible: an unread sum fell
 * through to the wrong-answer path, so a walker that was supposed to be acing
 * the ceremony quietly threw a question away and placed itself at the floor.
 * A rare, real-looking "the Attunement mis-placed her" that was never the app.
 */
let unreadable = 0
async function sumPatient() {
  for (let i = 0; i < 6; i++) {
    const m = await sum()
    if (m) return m
    await page.waitForTimeout(250)
  }
  unreadable++
  return null
}
async function answer(correctly) {
  const m = correctly ? await sumPatient() : await sum()
  let value = 99999
  if (m && correctly) {
    const [, a, op, c] = m
    value = op === '+' ? +a + +c : op === '−' ? +a - +c : op === '×' ? +a * +c : +a / +c
  }
  // Clear anything already in the box before typing. A walker that appends to
  // a half-entered answer is testing nothing except itself.
  await page.keyboard.press('Escape')
  await page.keyboard.type(String(value))
  await page.keyboard.press('Enter')
  // Wait for the door to actually close before walking on.
  //
  // Without this the walker could arrive at the next door while the answered
  // one was still fading out, read ITS sum again, and type the old answer into
  // the new question — which is why a walker answering everything correctly
  // could still place at the floor, with the same sum appearing twice in the
  // trace. The ceremony was fine; the harness was answering the wrong question.
  for (let i = 0; i < 20 && await sum(); i++) await page.waitForTimeout(150)
  if (process.env.TRACE) console.log('   door:', m ? m[0] : '(unread)', '→', value)
  return m ? m[0] : null
}
/**
 * Walk forward until a door opens.
 *
 * The Attunement is a single corridor now, so there is nothing to search — but
 * a walker still has to take the corners. It reads the side signposts GameView
 * already draws: in a one-wide corridor a tab only appears where there is an
 * opening, so a tab means "turn this way", and no tab means "straight on".
 *
 * The three walkers before this are worth remembering. Always-right walks a
 * small circle. Alternating right and left oscillates in place. A seeded random
 * walk explores a maze but flounders in a corridor, because a corridor wants
 * exactly one decision at each corner and random gets it wrong most of the
 * time. The signposts are the decision, already on screen.
 */
async function findDoor(limit = 60) {
  for (let i = 0; i < limit; i++) {
    if (await doorUp()) return true
    if (await page.getByText('↰').count()) await page.keyboard.press('ArrowLeft')
    else if (await page.getByText('↱').count()) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(70)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(70)
  }
  return false
}

check('a door turns up within a few steps', await findDoor())
await page.screenshot({ path: `${OUT}/attune-door.png`, fullPage: true })
check('no hint is on offer', await page.locator('button', { hasText: /Hint|Show me/ }).count() === 0)
check('"I\'m not sure" instead of stepping back', await page.locator('button', { hasText: "I'm not sure" }).count() === 1)
check('the door shows a sum', !!(await sum()))

console.log('3. a wrong answer opens the door anyway')
const missed = await answer(false)
check('the door closed on one answer, right or wrong', (await doorUp()) === 0, missed || '')

console.log('4. it finishes on its own, and the placement lands')
// Answer everything correctly from here, so she places HIGH — which is the case
// that exercises the beginner ceiling, and the one that used to pin her.
let asked = 1
for (let i = 0; i < 60 && !(await page.locator('text=The castle knows you now').count()); i++) {
  if (!(await findDoor())) break
  await answer(true)
  asked++
}
check(`the ceremony ended on its own, after ${asked} trips to a door`, await page.locator('text=The castle knows you now').count() === 1)
await page.screenshot({ path: `${OUT}/attune-verdict.png`, fullPage: true })

const p = await saved()
check('marked as attuned', !!p?.attuned)
check('every door was legible to the walker', unreadable === 0, `${unreadable} unread`)
// `plays` is the truth about how many questions were asked; the loop above can
// double-count a door whose answer didn't register first time.
check('and it was short', (p?.plays || 0) <= 16, `${p?.plays} questions asked`)
check('placed above a blank profile', (p?.skill?.addition || 0) > 0.12, String(p?.skill?.addition))
check('the fact table recorded the answers', Object.keys(p?.facts || {}).length > 0, `${Object.keys(p?.facts || {}).length} facts`)

console.log('5. and she can still climb afterwards (the warmCap trap)')
const level = p.skill.addition
const plays = p.opPlays?.addition || 0
// A placement at or below the warm base needs no credit at all: the ceiling
// already sits at 0.16, and one answer in the first real maze lifts it again.
// It is only a placement ABOVE the base that has to be paid for up front.
check(`credited ${plays} plays for a placement of ${level}`, level <= 0.16 || plays > 0)
check('the beginner ceiling now sits at or above where she was placed', 0.16 + 0.042 * plays >= level,
  `ceiling ${(0.16 + 0.042 * plays).toFixed(2)} vs placed ${level}`)

await page.locator('button', { hasText: 'To the castle' }).click()
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 10000 })
check('lands back in the castle', true)
check('not dragged through it again', await page.locator('text=Begin the Attunement').count() === 0)
check('but can ask for it', await page.locator('button', { hasText: 'Be measured again' }).count() === 1)

console.log(fails ? `${fails} FAILED` : 'all passed')
console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none')
await b.close(); srv.close()
process.exit(fails ? 1 : 0)
