// The door on a tablet: two panels, and the scratch pad actually takes ink.
import http from 'http'; import fs from 'fs'; import path from 'path'
import { clearCoach, pickWizard, takePractice, skipAttunement } from './harness.mjs'
import { SHOTS, DIST, launch } from './testenv.mjs'
const ROOT = DIST
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4243,r))
async function walkToDoor(pg, max = 700) {
  for (let i = 0; i < max; i++) {
    if (await clearCoach(pg)) continue          // a tip sits over everything
    if (await pg.locator('text=/^◆ (SEALED DOOR|RUNE OF RETURN)$/').count()) return true
    if (await pg.locator('text=SOMETHING BLOCKS THE WAY').count()) {
      await pg.locator('button', { hasText: /Raise your wand|Catch the runes/ }).click().catch(() => {})
      await pg.waitForTimeout(300); continue
    }
    if (await pg.locator('text=/^◆ SPELL DUEL$/').count()) {
      await pg.keyboard.press(String(1 + (i % 4))); await pg.waitForTimeout(140); continue
    }
    if (await pg.locator('text=/^◆ RUNE CATCH$/').count()) {
      await pg.locator('canvas').last().click({ position: { x: 30 + (i % 5) * 40, y: 40 + (i % 4) * 30 } }).catch(() => {})
      await pg.waitForTimeout(180); continue
    }
    const r = i % 7
    await pg.keyboard.press(r < 4 ? 'ArrowUp' : r < 6 ? 'ArrowLeft' : 'ArrowRight')
    await pg.waitForTimeout(80)
  }
  return false
}

const OUT = SHOTS
const b=await launch()
// iPad-ish
const page=await b.newPage({viewport:{width:1024,height:768},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
let fails=0
const check=(n,ok,d)=>{console.log(`   ${ok?'PASS':'FAIL'} — ${n}${d?' :: '+d:''}`);if(!ok)fails++}
await page.goto('http://localhost:4243/',{waitUntil:'networkidle'})
await page.fill('input[type=text]','Camille'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()
await pickWizard(page)
await page.waitForSelector('text=Choose your Nest',{timeout:15000})
await page.locator('button',{hasText:'Sea Eagles'}).first().click()
await page.locator('button',{hasText:/^Join the /}).click()
// The nest leads to the practice question, then the ceremony. Take the
// defaults for both: this test is about the scratch pad.
await takePractice(page)
await skipAttunement(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
await page.locator('button',{hasText:'Enter the Maze'}).click(); await page.waitForTimeout(900)
await walkToDoor(page)
console.log('1. the door on a tablet')
check('door opened', await page.locator('text=/^◆ (SEALED DOOR|RUNE OF RETURN)$/').count()>0)
check('scratch paper alongside it', await page.locator('text=SCRATCH PAPER').count()===1)
// Draw on it.
const pad = page.locator('canvas').nth(await page.locator('canvas').count() - 1)
const box = await pad.boundingBox()
await page.mouse.move(box.x+40, box.y+60); await page.mouse.down()
for (let i=1;i<=12;i++) await page.mouse.move(box.x+40+i*14, box.y+60+Math.sin(i/2)*26)
await page.mouse.up()
await page.waitForTimeout(200)
const inked = await pad.evaluate(cv => {
  const ctx = cv.getContext('2d')
  const d = ctx.getImageData(0,0,cv.width,cv.height).data
  let lit = 0
  for (let i=0;i<d.length;i+=4) if (d[i+1] > 150 && d[i+2] > 150) lit++
  return lit
})
check('the pad takes ink', inked > 200, inked+' lit pixels')
await page.screenshot({path:`${OUT}/door-tablet.png`})
await page.locator('button',{hasText:'Wipe'}).click(); await page.waitForTimeout(200)
const after = await pad.evaluate(cv => {
  const ctx = cv.getContext('2d')
  const d = ctx.getImageData(0,0,cv.width,cv.height).data
  let lit = 0
  for (let i=0;i<d.length;i+=4) if (d[i+1] > 150 && d[i+2] > 150) lit++
  return lit
})
check('Wipe clears it', after < 40, after+' lit pixels')

// A phone is the same door at a narrower viewport, so shrink this one rather
// than walking a second wizard to a second door: it tests the breakpoint
// itself, which is the thing that decides whether the pad appears.
console.log('2. the same door on a phone')
await page.setViewportSize({ width: 390, height: 780 })
await page.waitForTimeout(400)
check('door still open', await page.locator('text=/^◆ (SEALED DOOR|RUNE OF RETURN)$/').count()>0)
check('no scratch paper on a phone', await page.locator('text=SCRATCH PAPER').count()===0)
await page.screenshot({path:`${OUT}/door-phone.png`})
await page.setViewportSize({ width: 1024, height: 768 })
await page.waitForTimeout(400)
check('and it comes back on a tablet', await page.locator('text=SCRATCH PAPER').count()===1)

console.log(fails?`${fails} FAILED`:'all passed')
console.log('ERRORS:',errs.length?errs.join(' | '):'none')
await b.close(); srv.close(); process.exit(fails?1:0)
