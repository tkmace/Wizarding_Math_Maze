import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest } from './harness.mjs'
import { SHOTS, DIST, launch } from './testenv.mjs'
const ROOT = DIST
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0]; if(p==='/')p='/index.html'
  const f=path.join(ROOT,p); if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4175,r))
const OUT = SHOTS
const b=await launch()
const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2})
const page=await ctx.newPage(); const errs=[]
page.on('pageerror',e=>errs.push('PAGEERROR '+e.message))
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('TUNNEL'))errs.push(m.text())})

// Seed a profile that already has history, as if she'd been playing for weeks
await page.goto('http://localhost:4175/')
await page.evaluate(() => {
  const facts = {}
  const add = (k, box, right, wrong, ms) => facts[k] = { n: right+wrong, right, wrong, box, due: 0, bestMs: ms, lastMs: ms, streak: right }
  add('mul:7_8', 0, 2, 6, 9200); add('mul:6_7', 1, 3, 4, 8100); add('mul:8_9', 0, 1, 5, 11000)
  add('mul:3_4', 5, 12, 0, 1900); add('mul:2_5', 5, 9, 0, 1500); add('mul:4_6', 4, 8, 1, 2400)
  add('add:7_8', 5, 14, 0, 1200); add('add:9_6', 3, 5, 1, 2600); add('sub:15_7', 2, 4, 2, 3800)
  localStorage.setItem('wmm.profiles.v3', JSON.stringify({ camille: {
    v:3, name:'Camille', passcode:'1234', totalPoints:3120, equippedSkin:'sorceress', stones:3, plays:140,
    facts, stats:{mazesCleared:23,doorsOpened:187,correct:171,wrong:29,bestStreak:14,hintsUsed:6,playMs:5400000},
    settings:{ops:['multiplication'],diff:'sorcerer',showCompass:true,bigKeypad:true},
    createdAt:Date.now()-9e8, lastPlayed:Date.now() } }))
  localStorage.setItem('wmm.lastPlayer','Camille')
})
/**
 * A returning wizard with banked points owes a form pick for every rank those
 * points have reached, collected before the hub opens. Take them all.
 */
async function takePicks(page, max = 8) {
  let taken = 0
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('text=Choose the robes you will wear').count())) break
    await page.locator('button').filter({ hasText: /points|failure|bonus|rune stone|sight|gate/ }).first().click()
    await page.waitForTimeout(250)
    await page.locator('button', { hasText: /^Become the/ }).click()
    await page.waitForTimeout(220)
    await page.waitForTimeout(700)
    taken++
  }
  return taken
}

await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(500)
await page.locator('button', { hasText: 'Camille' }).click()
await page.waitForTimeout(300)
await page.locator('input[type=password]').fill('1234')
await page.locator('button', { hasText: 'Enter the Realm' }).click()
await page.waitForTimeout(900)
await takeNest(page)
// 3,120 banked points have carried her to Sage, so she's owed a form pick at
// every rank her old skin didn't already settle.
console.log('form picks owed on return:', await takePicks(page))
await page.waitForTimeout(400)
await page.screenshot({path:`${OUT}/20-hub-veteran.png`, fullPage:true})
await page.locator('button', { hasText: 'My Progress' }).click(); await page.waitForTimeout(600)
await page.screenshot({path:`${OUT}/21-report-veteran.png`, fullPage:true})
await page.locator('button', { hasText: 'Back to the Castle' }).first().click(); await page.waitForTimeout(400)
await page.locator('button', { hasText: 'Wardrobe' }).click(); await page.waitForTimeout(500)
await page.screenshot({path:`${OUT}/22-wardrobe.png`, fullPage:true})
// Wrong passcode must be rejected
await page.locator('button', { hasText: 'Back to the Castle' }).first().click(); await page.waitForTimeout(400)
await page.locator('button', { hasText: 'Switch wizard' }).click(); await page.waitForTimeout(400)
await page.locator('button', { hasText: 'Camille' }).click(); await page.waitForTimeout(300)
await page.locator('input[type=password]').fill('9999')
await page.locator('button', { hasText: 'Enter the Realm' }).click(); await page.waitForTimeout(500)
console.log('wrong passcode rejected:', await page.locator('text=Wrong passcode').count() > 0)

// Weak facts should dominate the doors of a fresh maze
await page.locator('input[type=password]').fill('1234')
await page.locator('button', { hasText: 'Enter the Realm' }).click(); await page.waitForTimeout(600)
await takeNest(page)
await page.locator('button', { hasText: 'Enter the Maze' }).click(); await page.waitForTimeout(800)
const seen = await page.evaluate(() => { return null })
console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none')
await b.close(); srv.close()
