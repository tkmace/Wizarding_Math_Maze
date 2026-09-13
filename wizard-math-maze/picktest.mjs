import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest } from './harness.mjs'
const ROOT='/home/claude/wmm/dist'
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4225,r))
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const errs=[]
const ctx=await b.newContext({viewport:{width:430,height:960},deviceScaleFactor:2})
const page=await ctx.newPage()
page.on('pageerror',e=>errs.push('PAGEERROR '+e.message))
page.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/TUNNEL|503|Failed to load/.test(t))errs.push(t)})
await page.goto('http://localhost:4225/',{waitUntil:'networkidle'})

// Seed a v3 profile with enough points for two rank-ups, plus an old skin id,
// so this also re-checks the v3 -> v4 migration path end to end.
await page.evaluate(() => {
  localStorage.setItem('wmm.profiles.v3', JSON.stringify({ camille: {
    v: 3, name: 'Camille', passcode: '1234', totalPoints: 420, equippedSkin: 'mage',
    stones: 2, plays: 30, facts: {}, stats: { mazesCleared: 4 },
    settings: { ops: ['multiplication'], diff: 'apprentice' } } }))
  localStorage.setItem('wmm.lastPlayer', 'Camille')
})
await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(500)
await page.screenshot({path:`${OUT}/90-login-cards.png`})
await page.locator('button',{hasText:'Camille'}).click(); await page.waitForTimeout(300)
await page.locator('input[type=password]').fill('1234')
await page.locator('button',{hasText:'Enter the Realm'}).click(); await page.waitForTimeout(900)
await takeNest(page)

const choosing = await page.locator('text=Choose the robes you will wear').count()>0
console.log('1. owed picks collected on login:', choosing?'PASS':'FAIL')
await page.screenshot({path:`${OUT}/91-pick-after-migration.png`,fullPage:true})
// The old 'mage' skin maps to a rank-1 form and is recorded as that rank's
// chosen pick, so rank 1 is already settled and rank 2 is what's owed.
// She banked these points before today, so the screen must say her old points
// earned the choice rather than announcing a rank-up that didn't just happen.
const banked = await page.locator('text=YOUR POINTS HAVE EARNED THIS').count()>0
console.log('   credited to her old points:', banked?'PASS':'FAIL')
const earned = await page.locator('text=/have already carried you to/').first().textContent()
console.log('   text:', earned.replace(/\s+/g,' ').trim())
console.log('   names the rank reached (Adept):', earned.includes('Adept')?'PASS (rank 1 satisfied by migration)':'FAIL')
const heading = await page.locator('h2').first().textContent()
console.log('   heading is the rank being picked:', heading.trim()==='Adept'?'PASS':'FAIL '+heading)
const titles = await page.locator('button').filter({hasText:/Frost Scribe|Ember Acolyte|Tide Caller/}).count()
console.log('   forms offered:', titles, titles===3?'PASS':'FAIL')
console.log('   previews carry her face:', await page.locator('canvas').count()>=3?'PASS':'FAIL')

await page.locator('button').filter({hasText:/Ember Acolyte/}).first().click(); await page.waitForTimeout(350)
await page.locator('button',{hasText:/^Become the/}).click(); await page.waitForTimeout(300)
await page.locator('button',{hasText:'Yes — become it'}).click(); await page.waitForTimeout(900)
// 420 pts owes only rank 2, so she should land in the hub now.
const more = await page.locator('text=Choose the robes you will wear').count()>0
console.log('2. no further picks outstanding:', more?'FAIL (unexpected extra pick)':'PASS')
const st = await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('wmm.profiles.v3')).camille
  return {chosen:p.chosen, worn:p.equippedSkin, look:p.appearance, v:p.v}})
console.log('3. after both picks:', JSON.stringify(st))
console.log('   reached the hub:', await page.locator('text=WHAT SHALL WE PRACTICE').count()>0?'PASS':'FAIL')
await page.screenshot({path:`${OUT}/92-hub-after-picks.png`,fullPage:true})
await page.locator('button',{hasText:'Wardrobe'}).click(); await page.waitForTimeout(900)
await page.screenshot({path:`${OUT}/93-wardrobe-big-text.png`,fullPage:true})
console.log('ERRORS:',errs.length?errs.join('\n'):'none')
await b.close(); srv.close()
