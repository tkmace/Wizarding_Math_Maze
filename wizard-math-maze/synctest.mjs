import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'

const ROOT = '/home/claude/wmm/dist'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' }

// In-memory stand-in for api/profile.js, implementing the same contract
// including the plays-based conflict guard.
const store = new Map()
let puts = 0, gets = 0

const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')

  if (u.pathname === '/api/profile') {
    if (req.method === 'GET') {
      gets++
      const token = u.searchParams.get('token')
      if (!/^[0-9a-f]{64}$/.test(token || '')) { res.writeHead(400); return res.end('{}') }
      const row = store.get(token)
      if (!row) { res.writeHead(404); return res.end('{"error":"not found"}') }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ profile: row.data }))
    }
    if (req.method === 'PUT') {
      let body = ''
      req.on('data', c => body += c)
      req.on('end', () => {
        puts++
        const { token, profile } = JSON.parse(body)
        if (!/^[0-9a-f]{64}$/.test(token || '')) { res.writeHead(400); return res.end('{}') }
        if (profile.passcode !== undefined) { console.log('!! PASSCODE LEAKED TO SERVER'); process.exitCode = 1 }
        const prev = store.get(token)
        const plays = profile.plays || 0
        if (!prev || plays >= (prev.plays || 0)) store.set(token, { data: profile, plays })
        res.writeHead(204); res.end()
      })
      return
    }
    res.writeHead(405); return res.end('{}')
  }

  let p = u.pathname === '/' ? '/index.html' : u.pathname
  const f = path.join(ROOT, p)
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nf') }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
await new Promise(r => srv.listen(4180, r))

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const errs = []

/** A fresh browser context = a different device, with its own localStorage. */
async function device(label) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', e => errs.push(`[${label}] PAGEERROR ${e.message}`))
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('TUNNEL')) errs.push(`[${label}] ${m.text()}`) })
  await page.goto('http://localhost:4180/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  return { ctx, page, label }
}

const seed = (page, pts, plays) => page.evaluate(({ pts, plays }) => {
  const facts = {}
  for (let i = 0; i < plays; i++) {
    facts[`mul:${(i % 9) + 2}_${(i % 7) + 3}`] = { n: 2, right: 2, wrong: 0, box: 3, due: 0, bestMs: 2000, lastMs: 2000, streak: 2 }
  }
  const all = JSON.parse(localStorage.getItem('wmm.profiles.v3'))
  all.camille.totalPoints = pts
  all.camille.plays = plays
  all.camille.facts = facts
  all.camille.stats.mazesCleared = Math.floor(plays / 8)
  // Settle every rank these points have reached, so logging back in lands in the
  // hub instead of stopping to collect owed form picks. This test is about sync,
  // not about the wardrobe.
  all.camille.chosen = { 1: 'candle', 2: 'frost', 3: 'storm', 4: 'starweaver', 5: 'runesage' }
  localStorage.setItem('wmm.profiles.v3', JSON.stringify(all))
}, { pts, plays })

const localState = page => page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('wmm.profiles.v3')).camille
  return { pts: p.totalPoints, plays: p.plays, facts: Object.keys(p.facts).length, mazes: p.stats.mazesCleared }
})

// ── Device A: brand new wizard ──────────────────────────────────────────────
const A = await device('A')
await A.page.fill('input[type=text]', 'Camille')
await A.page.fill('input[type=password]', '1234')
await A.page.locator('button', { hasText: 'Begin the Journey' }).click()
await A.page.waitForSelector('text=WHAT SHALL WE PRACTISE', { timeout: 10000 })
console.log('A: created new wizard')

// Give it some history, then bounce through a maze so the hub push fires.
await seed(A.page, 900, 40)
await A.page.reload({ waitUntil: 'networkidle' })
await A.page.locator('button', { hasText: 'Camille' }).click()
await A.page.locator('input[type=password]').fill('1234')
await A.page.locator('button', { hasText: 'Enter the Realm' }).click()
await A.page.waitForSelector('text=WHAT SHALL WE PRACTISE', { timeout: 15000 })
await A.page.waitForTimeout(1500)
console.log('A: local =', JSON.stringify(await localState(A.page)), '| server PUTs so far:', puts)

// ── Device B: same name + passcode, empty storage ───────────────────────────
const B = await device('B')
const bEmpty = await B.page.evaluate(() => localStorage.getItem('wmm.profiles.v3'))
console.log('B: storage before login =', bEmpty)
await B.page.locator('button', { hasText: 'New Wizard' }).click().catch(() => {})
await B.page.fill('input[type=text]', 'Camille')
await B.page.fill('input[type=password]', '1234')
await B.page.locator('button', { hasText: 'Begin the Journey' }).click()
await B.page.waitForSelector('text=WHAT SHALL WE PRACTISE', { timeout: 20000 })
const bAfter = await localState(B.page)
console.log('B: local after login =', JSON.stringify(bAfter))
console.log('B: RESTORED FROM CLOUD (not blank):', bAfter.pts === 900 && bAfter.plays === 40 ? 'PASS' : 'FAIL')

// ── Device B plays further, then A comes back and should catch up ───────────
await seed(B.page, 2400, 95)
await B.page.reload({ waitUntil: 'networkidle' })
await B.page.locator('button', { hasText: 'Camille' }).click()
await B.page.locator('input[type=password]').fill('1234')
await B.page.locator('button', { hasText: 'Enter the Realm' }).click()
await B.page.waitForSelector('text=WHAT SHALL WE PRACTISE', { timeout: 20000 })
await B.page.waitForTimeout(1500)

await A.page.reload({ waitUntil: 'networkidle' })
await A.page.locator('button', { hasText: 'Camille' }).click()
await A.page.locator('input[type=password]').fill('1234')
await A.page.locator('button', { hasText: 'Enter the Realm' }).click()
await A.page.waitForSelector('text=WHAT SHALL WE PRACTISE', { timeout: 20000 })
const aFinal = await localState(A.page)
console.log('A: local after B played =', JSON.stringify(aFinal))
console.log('A: MERGED FORWARD:', aFinal.pts === 2400 && aFinal.plays === 95 ? 'PASS' : 'FAIL')

// ── Wrong passcode must not reach the profile ───────────────────────────────
const C = await device('C')
await C.page.locator('button', { hasText: 'New Wizard' }).click().catch(() => {})
await C.page.fill('input[type=text]', 'Camille')
await C.page.fill('input[type=password]', '9999')
await C.page.locator('button', { hasText: 'Begin the Journey' }).click()
await C.page.waitForSelector('text=WHAT SHALL WE PRACTISE', { timeout: 20000 })
const cState = await localState(C.page)
console.log('C (wrong passcode): local =', JSON.stringify(cState))
console.log('C: WRONG PASSCODE GETS BLANK PROFILE:', cState.pts === 0 && cState.plays === 0 ? 'PASS' : 'FAIL')

console.log(`\nserver traffic: ${puts} PUTs, ${gets} GETs, ${store.size} distinct tokens stored`)
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none')
await browser.close()
srv.close()
