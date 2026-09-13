import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest, clearCoach } from './harness.mjs'
const ROOT='/home/claude/wmm/dist'
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'
  const f=path.join(ROOT,p); if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4174,r))
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const ctx=await b.newContext({viewport:{width:900,height:820},deviceScaleFactor:2})
const page=await ctx.newPage()
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERROR '+e.message))
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('TUNNEL'))errs.push(m.text())})
await page.goto('http://localhost:4174/',{waitUntil:'networkidle'})
await page.fill('input[type=text]','Camille'); await page.fill('input[type=password]','1234')
await page.click('text=Begin the Journey'); await page.waitForTimeout(500)
await takeNest(page)
await clearCoach(page)
await page.click('text=Multiplication'); await page.click('text=Addition')  // multiplication only
// Fixed tiers are collapsed by default; open them before picking one.
await page.locator('text=Show fixed skill level modes').click().catch(()=>{})
await page.waitForTimeout(200)
await page.click('text=Apprentice >> nth=1').catch(()=>{})
await page.click('text=Enter the Maze'); await page.waitForTimeout(900)

let doors=0, won=false
for (let i=0;i<700 && !won;i++){
  // A first-run card covers whatever it explains — clear it first, or every
  // click below lands on the card instead of the thing underneath.
  if (await clearCoach(page)) continue
  // An encounter blocks the arrow keys until it's answered.
  if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) {
    await page.locator('button',{hasText:/Raise your wand|Catch the runes/}).click()
    await page.waitForTimeout(400); continue
  }
  if (await page.locator('text=/^◆ SPELL DUEL$/').count()) {
    await page.keyboard.press(String(1+(i%4))); await page.waitForTimeout(150); continue
  }
  // Rune Catch is tap-only: click the canvas until the runes scatter.
  if (await page.locator('text=/^◆ RUNE CATCH$/').count()) {
    await page.locator('canvas').last().click({position:{x:30+(i%5)*40,y:40+(i%4)*30}}).catch(()=>{})
    await page.waitForTimeout(200); continue
  }
  // The MODAL heading, not the signpost in the maze — both say "SEALED DOOR".
  if (await page.locator('text=/^◆ (SEALED DOOR|RUNE OF RETURN)$/').count()) {
    const txts = await page.locator('div').filter({hasText:/^\d+ [+−×÷] \d+$/}).allTextContents()
    const d = txts.find(t=>/^\d+ [+−×÷] \d+$/.test(t.trim())).trim()
    const m = d.match(/^(\d+) ([+−×÷]) (\d+)$/); const a=+m[1], c=+m[3]
    const ans = m[2]==='+'?a+c : m[2]==='−'?a-c : m[2]==='×'?a*c : a/c
    for (const ch of String(ans)) await page.locator('button',{hasText:new RegExp(`^${ch}$`)}).first().click()
    await page.locator('button',{hasText:'✓'}).click()
    doors++
    await page.waitForTimeout(800)
    continue
  }
  if (await page.locator('text=Choose the robes you will wear').count()) {
    await page.locator('button').filter({hasText:/points|failure|bonus|rune stone|sight|gate/}).first().click()
    await page.waitForTimeout(250)
    await page.locator('button',{hasText:/^Become the/}).click(); await page.waitForTimeout(220)
    await page.locator('button',{hasText:'Yes — become it'}).click(); await page.waitForTimeout(700)
    continue
  }
  if (await page.locator('text=Maze Conquered').count()) { won=true; break }
  const prompt = await page.locator('text=PRESS ▲ TO UNLOCK').count()
  const r = Math.random()
  await page.keyboard.press(prompt ? 'ArrowUp' : r<0.62?'ArrowUp' : r<0.81?'ArrowLeft':'ArrowRight')
  await page.waitForTimeout(60)
}
console.log(`doors solved: ${doors}, reached win screen: ${won}`)
if (won){ await page.waitForTimeout(600); await page.screenshot({path:`${OUT}/10-win.png`}) }

// fog of war should have revealed a good chunk by now
await page.screenshot({path:`${OUT}/11-explored.png`})

// Persistence: reload and log back in, points must survive
const before = won ? null : undefined
await page.goto('http://localhost:4174/',{waitUntil:'networkidle'})
await page.waitForTimeout(500)
await page.screenshot({path:`${OUT}/12-returning-login.png`})
await page.click('text=Camille')
await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Enter the Realm'}).click()
// The cloud check derives a PBKDF2 token before the hub opens, so give it room.
await page.waitForSelector('text=/WHAT SHALL WE PRACTICE|Choose the robes you will wear/',{timeout:20000})
// Points banked in the maze may owe her a form pick, collected before the hub.
for (let k=0;k<8;k++){
  if (!(await page.locator('text=Choose the robes you will wear').count())) break
  await page.locator('button').filter({hasText:/points|failure|bonus|rune stone|sight|gate/}).first().click()
  await page.waitForTimeout(250)
  await page.locator('button',{hasText:/^Become the/}).click(); await page.waitForTimeout(220)
  await page.locator('button',{hasText:'Yes — become it'}).click(); await page.waitForTimeout(700)
}
const pts = await page.evaluate(() => JSON.parse(localStorage.getItem('wmm.profiles.v3')).camille)
console.log('after reload:', pts.name, pts.totalPoints, 'pts,', Object.keys(pts.facts).length, 'facts,', pts.stats.mazesCleared, 'mazes,', pts.stones, 'stones')
await page.screenshot({path:`${OUT}/13-hub-returning.png`, fullPage:true})
await page.locator('button',{hasText:'My Progress'}).click(); await page.waitForTimeout(600)
await page.screenshot({path:`${OUT}/14-report-full.png`, fullPage:true})
console.log('\nERRORS:', errs.length?errs.join('\n'):'none')
await b.close(); srv.close()
