// Buying a passed-over form with rune stones.
// Checks the three gates in order (rank reached, free pick made, runes banked),
// that the purchase actually debits, and that it survives a reload.
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
await new Promise(r => srv.listen(4226, r))
const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const errs = []
const ctx = await b.newContext({ viewport: { width: 430, height: 960 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/TUNNEL|503|Failed to load/.test(t)) errs.push(t) })
await page.goto('http://localhost:4226/', { waitUntil: 'networkidle' })

const seed = runes => `(() => {
  localStorage.setItem('wmm.profiles.v3', JSON.stringify({ camille: {
    v: 4, name: 'Camille', passcode: '1234', totalPoints: 520,
    equippedSkin: 'candle', chosen: { 1: 'candle', 2: 'frost' },
    bought: [], appearance: { skin: 1, hairColor: 1, hairStyle: 2 },
    stones: ${runes}, plays: 60, facts: {}, stats: { mazesCleared: 8 },
    settings: { ops: ['multiplication'], diff: 'wizard' } } }))
  localStorage.setItem('wmm.lastPlayer', 'Camille')
})()`

const login = async () => {
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400)
  await page.locator('button', { hasText: 'Camille' }).click(); await page.waitForTimeout(250)
  await page.locator('input[type=password]').fill('1234')
  await page.locator('button', { hasText: 'Enter the Realm' }).click(); await page.waitForTimeout(700)
  await takeNest(page)
  await page.locator('button', { hasText: 'Wardrobe' }).click(); await page.waitForTimeout(700)
}

// --- 1. Not enough runes: no buy button, and it says how far off she is ------
await page.evaluate(seed(15))
await login()
console.log('1. 15 runes, rank-1 form costs 20')
console.log('   no BUY offered:', await page.locator('button', { hasText: /^BUY/ }).count() === 0 ? 'PASS' : 'FAIL')
console.log('   shows the shortfall:', await page.locator('text=save 5 more').count() > 0 ? 'PASS' : 'FAIL')
// Rank 3+ isn't reached at 520 points, so those stay locked whatever the runes.
console.log('   unreached ranks still locked:', await page.locator('text=🔒 locked').count() >= 6 ? 'PASS' : 'FAIL')
await page.screenshot({ path: `${OUT}/94-wardrobe-cannot-buy.png`, fullPage: true })

// --- 2. Enough runes: buy, debit, wear ---------------------------------------
await page.evaluate(seed(60))
await login()
const buys = await page.locator('button', { hasText: /^BUY/ }).count()
console.log('2. 60 runes at rank 2 (rank1 costs 20, rank2 costs 40)')
console.log('   buyable forms offered:', buys, buys === 4 ? 'PASS (2 passed over at each of ranks 1 and 2)' : 'FAIL')
await page.screenshot({ path: `${OUT}/95-wardrobe-can-buy.png`, fullPage: true })

// Buy the Leaf Whisperer — the rank-1 form she passed over.
const leaf = page.locator('[data-form=leaf]')
await leaf.locator('button', { hasText: /^BUY/ }).click()
await page.waitForTimeout(600)
const after = await page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('wmm.profiles.v3')).camille
  return { stones: p.stones, bought: p.bought, worn: p.equippedSkin }
})
console.log('   profile after the buy:', JSON.stringify(after))
console.log('   runes debited 60 -> 40:', after.stones === 40 ? 'PASS' : 'FAIL')
console.log('   form recorded as bought:', after.bought.join()=== 'leaf' ? 'PASS' : 'FAIL')
console.log('   and worn straight away:', after.worn === 'leaf' ? 'PASS' : 'FAIL')

// --- 3. It sticks, and it can't be bought twice ------------------------------
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400)
await page.locator('button', { hasText: 'Camille' }).click(); await page.waitForTimeout(250)
await page.locator('input[type=password]').fill('1234')
await page.locator('button', { hasText: 'Enter the Realm' }).click(); await page.waitForTimeout(700)
const perk = await page.locator('text=Gentle failure').count() > 0
console.log('3. after reload, wearing the bought form:', perk ? 'PASS' : 'FAIL')
await page.screenshot({ path: `${OUT}/96-hub-order.png`, fullPage: true })
await page.locator('button', { hasText: 'Wardrobe' }).click(); await page.waitForTimeout(700)
const leaf2 = page.locator('[data-form=leaf]')
console.log('   no second BUY on an owned form:', await leaf2.locator('button', { hasText: /^BUY/ }).count() === 0 ? 'PASS' : 'FAIL')
// 40 runes still covers Pebble (20) and both rank-2 forms (40 each).
console.log('   3 forms still within reach on 40 runes:',
  await page.locator('button', { hasText: /^BUY/ }).count() === 3 ? 'PASS' : 'FAIL')
await page.screenshot({ path: `${OUT}/97-wardrobe-after-buy.png`, fullPage: true })

console.log('ERRORS:', errs.length ? errs.join('\n') : 'none')
await b.close(); srv.close()
