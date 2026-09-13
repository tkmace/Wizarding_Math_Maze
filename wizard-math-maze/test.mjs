import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'

const ROOT = '/home/claude/wmm/dist'
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml' }
const srv = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p === '/') p = '/index.html'
  const f = path.join(ROOT, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf') }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'})
  fs.createReadStream(f).pipe(res)
})
await new Promise(r=>srv.listen(4173, r))

const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--disable-dev-shm-usage'] })
const errors = []

async function run(label, width, height) {
  const ctx = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:2, hasTouch:true })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type()==='error') errors.push(`[${label}] ${m.text()}`) })
  page.on('pageerror', e => errors.push(`[${label}] PAGEERROR ${e.message}`))
  await page.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({ path:`${OUT}/01-login-${label}.png` })

  // New wizard
  await page.fill('input[type=text]', 'Camille')
  await page.fill('input[type=password]', '1234')
  await page.click('text=Begin the Journey')
  await page.waitForTimeout(700)
  await page.screenshot({ path:`${OUT}/02-hub-${label}.png`, fullPage:true })

  // Turn on multiplication + sorcerer difficulty
  await page.click('text=Multiplication')
  // The fixed tiers live behind a checkbox now — Wizard's Sense is the default.
  await page.locator('text=Show fixed skill level modes').click().catch(() => {})
  await page.waitForTimeout(200)
  await page.click('text=Sorcerer')
  await page.waitForTimeout(250)
  await page.click('text=Enter the Maze')
  await page.waitForTimeout(1200)
  await page.screenshot({ path:`${OUT}/03-game-${label}.png` })

  // An encounter overlay swallows the arrow keys, so the walk has to clear it
  // or it burns the whole loop pressing ▲ at a creature. Answering with 1-4
  // works in the duel; the rune catch resolves on its own timer either way.
  const clearEncounter = async () => {
    if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) {
      await page.locator('button', { hasText: /Raise your wand|Catch the runes/ }).click().catch(() => {})
      await page.waitForTimeout(400)
    }
    if (!(await page.locator('text=/^◆ (SPELL DUEL|RUNE CATCH)$/').count())) return false
    for (let k = 0; k < 40; k++) {
      if (!(await page.locator('text=/^◆ (SPELL DUEL|RUNE CATCH)$/').count())) return true
      if (await page.locator('text=/^◆ RUNE CATCH$/').count()) {
        // Tap-only game: click the canvas until the runes scatter.
        await page.locator('canvas').last().click({ position: { x: 30 + (k % 5) * 40, y: 40 + (k % 4) * 30 } }).catch(() => {})
      } else {
        await page.keyboard.press(String(1 + (k % 4)))
      }
      await page.waitForTimeout(180)
    }
    return true
  }

  // Walk until a door puzzle opens
  let opened = false, doorSeen = false
  for (let i=0; i<240 && !opened; i++) {
    if (await clearEncounter()) continue
    const prompt = await page.locator('text=PRESS ▲ TO UNLOCK').count()
    if (prompt && !doorSeen) { doorSeen = true; await page.waitForTimeout(500); await page.screenshot({ path:`${OUT}/04-door-ahead-${label}.png` }) }
    await page.keyboard.press(prompt ? 'ArrowUp' : (Math.random()<0.62 ? 'ArrowUp' : (Math.random()<0.5?'ArrowLeft':'ArrowRight')))
    await page.waitForTimeout(110)
    // The MODAL, not the signpost in the maze view — the signpost also says
    // "SEALED DOOR" now, and matching it exits this loop before the door opens.
    if (await page.locator('text=/^◆ (SEALED DOOR|RUNE OF RETURN)$/').count()) opened = true
  }
  if (!opened) { console.log(`[${label}] never reached a door`); await ctx.close(); return }

  await page.waitForTimeout(400)
  await page.screenshot({ path:`${OUT}/05-modal-${label}.png` })

  // Read the problem and answer it correctly via the on-screen keypad
  const probs = await page.locator('div').filter({ hasText: /^\d+ [+−×÷] \d+$/ }).allTextContents()
  const disp = probs.find(t=>/^\d+ [+−×÷] \d+$/.test(t.trim()))
  const m = disp.trim().match(/^(\d+) ([+−×÷]) (\d+)$/)
  const a = +m[1], b = +m[3]
  const ans = m[2]==='+'? a+b : m[2]==='−'? a-b : m[2]==='×'? a*b : a/b
  console.log(`[${label}] door problem ${disp.trim()} -> ${ans}`)
  for (const d of String(ans)) await page.locator('button', { hasText: new RegExp(`^${d}$`) }).first().click()
  await page.waitForTimeout(200)
  await page.screenshot({ path:`${OUT}/06-typed-${label}.png` })
  await page.locator('button', { hasText:'✓' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path:`${OUT}/07-solved-${label}.png` })

  // Confirm points were banked
  const total = await page.locator('text=TOTAL').locator('..').textContent()
  console.log(`[${label}] HUD after solve: ${total.replace(/\s+/g,' ')}`)

  // Wrong answer path on the next door: check the hint appears
  let found = false
  for (let i=0;i<240 && !found;i++){
    if (await clearEncounter()) continue
    const prompt = await page.locator('text=PRESS ▲ TO UNLOCK').count()
    await page.keyboard.press(prompt ? 'ArrowUp' : (Math.random()<0.62?'ArrowUp':(Math.random()<0.5?'ArrowLeft':'ArrowRight')))
    await page.waitForTimeout(100)
    if (await page.locator('text=/^◆ (SEALED DOOR|RUNE OF RETURN)$/').count()) found = true
  }
  if (found) {
    for (let k=0;k<2;k++){
      await page.locator('button', { hasText:/^9$/ }).first().click()
      await page.locator('button', { hasText:/^9$/ }).first().click()
      await page.locator('button', { hasText:/^9$/ }).first().click()
      await page.locator('button', { hasText:'✓' }).click()
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path:`${OUT}/08-hint-${label}.png` })
    console.log(`[${label}] hint shown: ${await page.locator('text=/count them all|hop forward|hop back|equal groups|Split it|two hops|fit inside/').count() > 0}`)
  }

  // Progress report
  // Whatever overlay is up — a door, a duel — has to come down before the HUD
  // is clickable again.
  await clearEncounter()
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('button', { hasText: 'Step back' }).count())) break
    await page.locator('button', { hasText: 'Step back' }).first().click({ timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(300)
  await page.locator('button', { hasText: '🏰' }).first().click()
  await page.waitForTimeout(500)
  // Banking points can rank her up, and a rank-up owes a pick before the hub
  // comes back. Take it, or the report click lands on the choice screen.
  if (await page.locator('text=Choose the form you will take').count()) {
    await page.locator('button').filter({ hasText: /points|failure|bonus|rune stone|sight|gate/ }).first().click()
    await page.waitForTimeout(300)
    await page.locator('button', { hasText: /^Become the/ }).click()
    await page.waitForTimeout(250)
    await page.locator('button', { hasText: 'Yes — become it' }).click()
    await page.waitForTimeout(700)
    console.log(`[${label}] took an owed rank pick on the way out`)
  }
  await page.locator('button', { hasText: 'My Progress' }).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path:`${OUT}/09-report-${label}.png`, fullPage:true })
  await ctx.close()
}

await run('phone', 414, 896)
await run('desktop', 1000, 820)

console.log('\n=== CONSOLE ERRORS ===')
console.log(errors.length ? errors.join('\n') : 'none')
await browser.close()
srv.close()
