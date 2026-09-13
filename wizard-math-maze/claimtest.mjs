import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { takeNest } from './harness.mjs'

const ROOT = '/home/claude/wmm/dist'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' }

// Mock of api/profile.js with the same contract, including single-shot claims.
const profiles = new Map()
const legacy = new Map([
  ['tkmace',  { name: 'tkmace',  total_points: 1055, equipped_skin: 'enchanter', claimed_by: null }],
  ['camille', { name: 'Camille', total_points: 390,  equipped_skin: 'apprentice', claimed_by: null }],
  ['linden',  { name: 'Linden',  total_points: 245,  equipped_skin: 'apprentice', claimed_by: null }],
])
const nameKey = s => String(s).trim().toLowerCase().slice(0, 40)

const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')
  const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)) }

  if (u.pathname === '/api/profile') {
    if (req.method === 'GET') {
      const leg = u.searchParams.get('legacy')
      if (leg) {
        const row = legacy.get(nameKey(leg))
        return json(200, row && !row.claimed_by
          ? { found: true, name: row.name, totalPoints: row.total_points, equippedSkin: row.equipped_skin }
          : { found: false })
      }
      const token = u.searchParams.get('token')
      if (!/^[0-9a-f]{64}$/.test(token || '')) return json(400, {})
      const row = profiles.get(token)
      if (!row) return json(404, { error: 'not found' })
      return json(200, { profile: row.data })
    }
    if (req.method === 'PUT') {
      let body = ''
      req.on('data', c => body += c)
      req.on('end', () => {
        const { token, profile, claimLegacy } = JSON.parse(body)
        if (!/^[0-9a-f]{64}$/.test(token || '')) return json(400, {})
        if (profile.passcode !== undefined) { console.log('!! PASSCODE LEAKED'); process.exitCode = 1 }

        let claimed = null
        if (claimLegacy) {
          const row = legacy.get(nameKey(claimLegacy))
          if (row && !row.claimed_by) {
            row.claimed_by = token
            claimed = { totalPoints: row.total_points, equippedSkin: row.equipped_skin }
            profile.totalPoints = (profile.totalPoints || 0) + claimed.totalPoints
          }
        }
        const plays = profile.plays || 0
        const prev = profiles.get(token)
        if (claimed || !prev || plays >= (prev.plays || 0)) profiles.set(token, { data: profile, plays })
        return json(200, { profile, claimed })
      })
      return
    }
    return json(405, {})
  }

  let p = u.pathname === '/' ? '/index.html' : u.pathname
  const f = path.join(ROOT, p)
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nf') }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
await new Promise(r => srv.listen(4182, r))

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const errs = []
const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'

async function freshDevice(label) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  page.on('pageerror', e => errs.push(`[${label}] PAGEERROR ${e.message}`))
  page.on('console', m => {
    const t = m.text()
    if (m.type() === 'error' && !t.includes('TUNNEL') && !t.includes('404')) errs.push(`[${label}] ${t}`)
  })
  await page.goto('http://localhost:4182/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  return page
}

const state = (page, slug) => page.evaluate(s => {
  const all = JSON.parse(localStorage.getItem('wmm.profiles.v3') || '{}')
  const p = all[s]
  return p ? { name: p.name, pts: p.totalPoints, skin: p.equippedSkin, chosen: p.chosen } : null
}, slug)

async function newWizard(page, name, code) {
  if (await page.locator('button', { hasText: 'New Wizard' }).count()) {
    await page.locator('button', { hasText: 'New Wizard' }).click()
  }
  await page.fill('input[type=text]', name)
  await page.fill('input[type=password]', code)
  await page.locator('button', { hasText: 'Begin the Journey' }).click()
  await takeNest(page)
}

/**
 * A returning wizard with banked points owes a form pick for every rank those
 * points have reached, collected before the hub opens. Take them all.
 */
async function takePicks(page, max = 8) {
  await takeNest(page)          // the nest screen stands in front of the picks
  let taken = 0
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('text=Choose the robes you will wear').count())) break
    await page.locator('button').filter({ hasText: /points|failure|bonus|rune stone|sight|gate/ }).first().click()
    await page.waitForTimeout(250)
    await page.locator('button', { hasText: /^Become the/ }).click()
    await page.waitForTimeout(220)
    await page.locator('button', { hasText: 'Yes — become it' }).click()
    await page.waitForTimeout(700)
    taken++
  }
  return taken
}

// ── 1. Linden reclaims her old points with a brand new passcode ─────────────
let page = await freshDevice('linden')
await newWizard(page, 'Linden', '5678')
await page.waitForSelector('text=AN OLD SCROLL BEARS YOUR NAME', { timeout: 20000 })
await page.screenshot({ path: `${OUT}/30-claim-prompt.png` })
const shown = await page.locator('text=245').count()
console.log('1. claim prompt shown with 245 pts:', shown > 0 ? 'PASS' : 'FAIL')
await page.locator('button', { hasText: 'claim it' }).click()
await page.waitForTimeout(1200)
console.log('   form picks her old points bought:', await takePicks(page))
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 20000 })
console.log('   local after claim:', JSON.stringify(await state(page, 'linden')))
await page.screenshot({ path: `${OUT}/31-claimed-hub.png`, fullPage: true })

// ── 2. Someone else tries the same name — already claimed ───────────────────
page = await freshDevice('linden2')
await newWizard(page, 'Linden', '1111')
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 20000 })
const second = await state(page, 'linden')
console.log('2. second claimant gets blank profile:', second.pts === 0 ? 'PASS' : `FAIL (${second.pts})`)

// ── 3. tkmace's enchanter robe should come back with 1055 pts ───────────────
page = await freshDevice('tkmace')
await newWizard(page, 'tkmace', '4242')
await page.waitForSelector('text=AN OLD SCROLL BEARS YOUR NAME', { timeout: 20000 })
await page.locator('button', { hasText: 'claim it' }).click()
await page.waitForTimeout(1200)
console.log('   form picks her old points bought:', await takePicks(page))
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 20000 })
const tk = await state(page, 'tkmace')
// His old 'enchanter' robe is a v3 id; v4 maps it to the Frost Scribe and banks
// it as his settled pick at rank 2. What he's WEARING afterwards is whichever
// form he picks at the ranks his 1,055 points also owe him.
console.log('3. tkmace restored:', JSON.stringify(tk),
  tk.pts === 1055 && tk.chosen?.['2'] === 'frost' ? 'PASS' : 'FAIL')

// ── 4. "Not me — start fresh" must leave the old points for the real owner ──
page = await freshDevice('camille-decline')
await newWizard(page, 'Camille', '7777')
await page.waitForSelector('text=AN OLD SCROLL BEARS YOUR NAME', { timeout: 20000 })
await page.locator('button', { hasText: 'start fresh' }).click()
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 20000 })
const dec = await state(page, 'camille')
console.log('4. declined -> blank profile:', dec.pts === 0 ? 'PASS' : 'FAIL',
  '| camille still unclaimed on server:', legacy.get('camille').claimed_by === null ? 'PASS' : 'FAIL')

// ── 5. A genuinely new name skips the claim panel entirely ──────────────────
page = await freshDevice('newkid')
await newWizard(page, 'Rowan', '2468')
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 20000 })
const nk = await state(page, 'rowan')
console.log('5. brand new name goes straight in:', nk && nk.pts === 0 ? 'PASS' : 'FAIL')

// ── 6. A claimed profile now round-trips as a normal cloud profile ──────────
page = await freshDevice('linden-newdevice')
await newWizard(page, 'Linden', '5678')
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 20000 })
const rt = await state(page, 'linden')
console.log('6. claimed profile syncs to a new device:', rt.pts === 245 ? 'PASS' : `FAIL (${rt.pts})`)

console.log('\nlegacy rows still unclaimed:',
  [...legacy.entries()].filter(([, v]) => !v.claimed_by).map(([k]) => k).join(', ') || 'none')
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none')
await browser.close()
srv.close()
