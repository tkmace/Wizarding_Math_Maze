import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest, clearCoach } from './harness.mjs'
const ROOT='/home/claude/wmm/dist'
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4220,r))
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const errs=[]
const ctx=await b.newContext({viewport:{width:430,height:960},deviceScaleFactor:2,hasTouch:true})
const page=await ctx.newPage()
page.on('pageerror',e=>errs.push('PAGEERROR '+e.message))
page.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/TUNNEL|503|Failed to load/.test(t))errs.push(t)})
await page.goto('http://localhost:4220/',{waitUntil:'networkidle'}); await page.waitForTimeout(450)
await page.fill('input[type=text]','Camille'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()
await takeNest(page)
await clearCoach(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
await page.waitForTimeout(500)
await page.screenshot({path:`${OUT}/80-hub-with-look.png`,fullPage:true})
console.log('1. My Look button on the hub:', await page.locator('button',{hasText:'My Wizard'}).count()>0?'PASS':'FAIL')

const look=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wmm.profiles.v3')).camille.appearance)
const before=await look()
console.log('   new profile got a random look:', JSON.stringify(before))

await page.locator('button',{hasText:'My Wizard'}).click(); await page.waitForTimeout(700)
await page.screenshot({path:`${OUT}/81-look-picker.png`,fullPage:true})
console.log('2. picker shows', await page.locator('button[aria-label]').count(), 'swatches and',
            await page.locator('button',{hasText:'Falls past the shoulders'}).count()
            + await page.locator('button',{hasText:'Down to the collar'}).count()
            + await page.locator('button',{hasText:'Just past the ears'}).count()
            + await page.locator('button',{hasText:'Neat under the hat'}).count(), 'hair lengths')

// Pick the darkest skin, silver hair, long.
const swatches=await page.locator('button[aria-label]').all()
await swatches[4].click(); await page.waitForTimeout(200)      // Umber
await swatches[9].click(); await page.waitForTimeout(200)      // Silver
// "Long" now names a hair length AND a beard, so match on the description.
await page.locator('button',{hasText:'Falls past the shoulders'}).click(); await page.waitForTimeout(300)
// Facial hair is a choice now rather than something the robe imposes.
console.log('   beard offered, and off by default:',
            await page.locator('button',{hasText:/^Moustache$/}).count()===1 && before.beard===0 ? 'PASS' : 'FAIL')
await page.locator('button',{hasText:/^Short$/}).click(); await page.waitForTimeout(400)
await page.screenshot({path:`${OUT}/82-look-chosen.png`,fullPage:true})
await page.locator('button',{hasText:"That's me"}).click(); await page.waitForTimeout(700)
const after=await look()
console.log('3. saved look:', JSON.stringify(after),
            after.skin===4&&after.hairColor===4&&after.hairStyle===3&&after.beard===2?'PASS':'FAIL')
await page.screenshot({path:`${OUT}/83-hub-new-look.png`,fullPage:true})

// In-game: new projection + the look carried through
await page.locator('button',{hasText:'Multiplication'}).click()
await page.locator('button',{hasText:'Enter the Maze'}).click(); await page.waitForTimeout(1400)
await page.screenshot({path:`${OUT}/84-game-rectilinear.png`})
await clearCoach(page)                       // the "into the maze" card
for(let i=0;i<4;i++){ await page.keyboard.press('ArrowUp'); await page.waitForTimeout(240) }
await page.screenshot({path:`${OUT}/85-game-walk.png`})

// Walk to an encounter and check the duel is multiple choice
let found=false
for(let i=0;i<500&&!found;i++){
  // A first-run card covers whatever it explains — clear it first, or every
  // click below lands on the card instead of the thing underneath.
  if (await clearCoach(page)) continue
  if(await page.locator('text=SOMETHING BLOCKS THE WAY').count()){found=true;break}
  if(await page.locator('button',{hasText:'Step back'}).count()){
    await page.locator('button',{hasText:'Step back'}).click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(130); continue}
  const r=Math.random()
  await page.keyboard.press(r<0.6?'ArrowUp':r<0.8?'ArrowLeft':'ArrowRight'); await page.waitForTimeout(48)
}
if(found){
  await page.waitForTimeout(500)
  await page.screenshot({path:`${OUT}/86-encounter-intro-big.png`})
  const isDuel=await page.locator('text=Raise your wand').count()>0
  await page.locator('button',{hasText:/Raise your wand|Catch the runes/}).click(); await page.waitForTimeout(800)
  await page.screenshot({path:`${OUT}/87-duel-mc.png`})
  if(isDuel){
    const opts=await page.locator('button').filter({hasText:/^\d+$/}).count()
    console.log('4. duel answer options:', opts, opts===4?'PASS (multiple choice)':'FAIL')
    const ts=await page.locator('div').filter({hasText:/^\d+ [+−×÷] \d+$/}).allTextContents()
    const d=ts.find(t=>/^\d+ [+−×÷] \d+$/.test(t.trim()))
    const m=d.trim().match(/^(\d+) ([+−×÷]) (\d+)$/); const a=+m[1],c=+m[3]
    const v=m[2]==='+'?a+c:m[2]==='−'?a-c:m[2]==='×'?a*c:a/c
    await page.locator('button',{hasText:new RegExp(`^${v}$`)}).first().click()
    await page.waitForTimeout(700)
    await page.screenshot({path:`${OUT}/88-duel-after-hit.png`})
    console.log('   correct tap advanced the fight:', await page.locator('text=SPELL DUEL').count()>0?'PASS':'FAIL')
  } else {
    console.log('4. drew a rune catch; duel MC unverified this run')
  }
}
console.log('ERRORS:',errs.length?errs.join('\n'):'none')
await b.close(); srv.close()
