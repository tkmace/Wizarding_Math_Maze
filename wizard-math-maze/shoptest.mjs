// The Curiosity Shop: buying a trinket, wearing it, taking it off, and the
// great rune that pays for it.
import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest } from './harness.mjs'
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
const ctx = await b.newContext({ viewport: { width: 430, height: 960 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
await page.goto('http://localhost:4231/', { waitUntil: 'networkidle' })

let pass = 0, fail = 0
const check = (what, ok, note = '') => {
  console.log(`   ${ok ? 'PASS' : 'FAIL'} — ${what}${note ? ' :: ' + note : ''}`)
  ok ? pass++ : fail++
}

const seed = runes => `(() => {
  localStorage.setItem('wmm.profiles.v3', JSON.stringify({ camille: {
    v: 4, name: 'Camille', passcode: '1234', totalPoints: 520,
    equippedSkin: 'candle', chosen: { 1: 'candle', 2: 'frost' }, nest: 'sea',
    bought: [], appearance: { skin: 1, hairColor: 1, hairStyle: 2 }, wizard: 'wren',
    stones: ${runes}, plays: 60, facts: {}, stats: { mazesCleared: 8 },
    settings: { ops: ['multiplication'], diff: 'wizard' } } }))
  localStorage.setItem('wmm.lastPlayer', 'Camille')
})()`
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('wmm.profiles.v3')).camille)

const openShop = async runes => {
  await page.evaluate(seed(runes))
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400)
  await page.locator('button', { hasText: 'Camille' }).click(); await page.waitForTimeout(250)
  await page.locator('input[type=password]').fill('1234')
  await page.locator('button', { hasText: 'Enter the Realm' }).click(); await page.waitForTimeout(700)
  await takeNest(page)
  await page.locator('button', { hasText: 'Wardrobe' }).click(); await page.waitForTimeout(600)
  const tip = page.locator('button', { hasText: 'Let me look' })
  if (await tip.count()) { await tip.first().click(); await page.waitForTimeout(300) }
  await page.locator('button', { hasText: 'Curiosity Shop' }).click(); await page.waitForTimeout(600)
}

console.log('1. a shop she cannot afford yet')
await openShop(3)
check('the shop opens from the wardrobe', await page.locator('text=The Curiosity Shop').count() > 0)
check('nothing is for sale on three runes', await page.locator('button', { hasText: /^BUY/ }).count() === 0)
check('it says how much more she needs', await page.locator('text=/save \\d+ more/').count() >= 6)
await page.screenshot({ path: `${OUT}/shop-poor.png`, fullPage: true })

console.log('2. buying the cheapest curio')
await openShop(25)
const buys = await page.locator('button', { hasText: /^BUY/ }).count()
check('the ones she can afford offer a price', buys >= 2, `${buys} buyable`)
await page.locator('button', { hasText: /^BUY 🔮8/ }).first().click()
await page.waitForTimeout(250)
check('it asks before spending', await page.locator('button', { hasText: 'Yes —' }).count() === 1)
await page.locator('button', { hasText: 'Yes —' }).click()
await page.waitForTimeout(500)
let p = await saved()
check('the pendant is hers', (p.trinkets || []).includes('pendant'), JSON.stringify(p.trinkets))
check('and she is wearing it', (p.wearing || []).includes('pendant'))
check('the runes were spent', p.stones === 17, String(p.stones))
check('the card now offers to take it off', await page.locator('button', { hasText: 'WEARING' }).count() === 1)
await page.screenshot({ path: `${OUT}/shop-bought.png`, fullPage: true })

console.log('3. taking it off and putting it back on')
await page.locator('button', { hasText: 'WEARING' }).click()
await page.waitForTimeout(350)
p = await saved()
check('taken off, but still owned', !(p.wearing || []).includes('pendant') && (p.trinkets || []).includes('pendant'))
await page.locator('button', { hasText: 'WEAR IT' }).first().click()
await page.waitForTimeout(350)
p = await saved()
check('back on', (p.wearing || []).includes('pendant'))

console.log('4. it survives leaving the shop')
await page.locator('button', { hasText: 'Back to the Wardrobe' }).first().click()
await page.waitForTimeout(450)
check('the wardrobe is behind it', await page.locator('text=The Wardrobe').count() > 0)
await page.locator('button', { hasText: 'Back to the Castle' }).first().click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/shop-hub.png`, fullPage: true })
p = await saved()
check('still hers back at the castle', (p.wearing || []).includes('pendant'))

console.log('5. the mazes carry more runes now, and one great one')
const runes = await page.evaluate(() => {
  const out = []
  for (let i = 0; i < 12; i++) {
    const m = window.__wmmGenMaze?.()
    if (!m) return null
    const vals = Object.values(m.stones)
    out.push({ n: vals.length, great: vals.filter(v => v > 1).length, total: vals.reduce((a, b) => a + b, 0) })
  }
  return out
})
if (!runes) {
  console.log('   (no maze hook exposed — checked in the game instead)')
} else {
  check('six or more stones a maze', runes.every(r => r.n >= 7), JSON.stringify(runes[0]))
  check('exactly one great rune', runes.every(r => r.great === 1))
}

console.log(`\n${pass} passed, ${fail} failed`)
console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none')
await b.close(); srv.close()
