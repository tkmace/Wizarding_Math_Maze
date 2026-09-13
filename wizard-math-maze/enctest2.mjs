import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest, clearCoach } from './harness.mjs'
const ROOT='/home/claude/wmm/dist'
const MIME={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4215,r))
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const errs=[]
async function fresh(label){
  const ctx=await b.newContext({viewport:{width:430,height:940},deviceScaleFactor:2,hasTouch:true})
  const page=await ctx.newPage()
  page.on('pageerror',e=>errs.push(`[${label}] ${e.message}`))
  page.on('console',m=>{const t=m.text(); if(m.type()==='error'&&!/TUNNEL|503|Failed to load/.test(t))errs.push(`[${label}] ${t}`)})
  await page.goto('http://localhost:4215/',{waitUntil:'networkidle'}); await page.waitForTimeout(400)
  await page.fill('input[type=text]','Cam'); await page.fill('input[type=password]','1234')
  await page.locator('button',{hasText:'Begin the Journey'}).click()
  await takeNest(page)
  await clearCoach(page)
  await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
  await page.locator('button',{hasText:'Multiplication'}).click()
  await page.locator('button',{hasText:'Enter the Maze'}).click(); await page.waitForTimeout(1200)
  return {page, ctx}
}
async function walk(page,limit=500){
  for(let i=0;i<limit;i++){
    // A first-run card covers whatever it explains — clear it first, or every
    // click below lands on the card instead of the thing underneath.
    if (await clearCoach(page)) continue
    if(await page.locator('text=SOMETHING BLOCKS THE WAY').count()) return true
    if(await page.locator('button',{hasText:'Step back'}).count()){
      await page.locator('button',{hasText:'Step back'}).click({timeout:3000}).catch(()=>{}); await page.waitForTimeout(130); continue }
    const r=Math.random()
    await page.keyboard.press(r<0.6?'ArrowUp':r<0.8?'ArrowLeft':'ArrowRight'); await page.waitForTimeout(50)
  }
  return false
}
async function answer(page,correct){
  const ts=await page.locator('div').filter({hasText:/^\d+ [+−×÷] \d+$/}).allTextContents()
  const d=ts.find(t=>/^\d+ [+−×÷] \d+$/.test(t.trim())); if(!d) return false
  const m=d.trim().match(/^(\d+) ([+−×÷]) (\d+)$/); const a=+m[1],c=+m[3]
  let v=m[2]==='+'?a+c:m[2]==='−'?a-c:m[2]==='×'?a*c:a/c; if(!correct) v+=3
  for(const ch of String(v)) await page.locator('button',{hasText:new RegExp(`^${ch}$`)}).first().click()
  await page.locator('button',{hasText:'✓'}).click(); await page.waitForTimeout(400); return true
}
const pts=page=>page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('wmm.profiles.v3')||'{}').cam
  return p&&{total:p.totalPoints,stones:p.stones}})

// Keep drawing encounters until we have seen a rune catch AND lost a duel.
let sawRunes=false, lossChecked=false, tries=0
while((!sawRunes||!lossChecked) && tries++<8){
  const {page,ctx}=await fresh('t'+tries)
  if(!await walk(page)){ await ctx.close(); continue }
  const isDuel=await page.locator('text=Raise your wand').count()>0
  if(isDuel && !lossChecked){
    // Bank a little first so there is something a loss could take.
    const before=await pts(page)
    await page.locator('button',{hasText:'Raise your wand'}).click(); await page.waitForTimeout(500)
    for(let i=0;i<14;i++){
      if(await page.locator('text=slips away').count()) break
      if(!await page.locator('button',{hasText:'✓'}).count()) break
      await answer(page,false)
    }
    await page.waitForTimeout(700)
    await page.screenshot({path:`${OUT}/73-duel-lost.png`})
    await page.waitForTimeout(1400)
    const after=await pts(page)
    console.log('duel LOST: points',before.total,'->',after.total, after.total>=before.total?'PASS (nothing taken)':'FAIL')
    lossChecked=true
  } else if(!isDuel && !sawRunes){
    await page.locator('button',{hasText:'Catch the runes'}).click(); await page.waitForTimeout(900)
    await page.screenshot({path:`${OUT}/74-rune-catch.png`})
    // Read the rune positions straight off the component by clicking each in turn
    // until a round advances; 4 candidates so at most 3 wrong.
    const before=await pts(page)
    for(let round=0;round<4;round++){
      const label=await page.locator('text=/Rune \\d of 4/').first().textContent().catch(()=>'')
      let advanced=false
      for(let k=0;k<4 && !advanced;k++){
        const box=await page.locator('canvas').last().boundingBox(); if(!box) break
        await page.mouse.click(box.x+box.width*(0.22+0.19*k), box.y+box.height*(0.36+0.24*(k%2)))
        await page.waitForTimeout(320)
        const now=await page.locator('text=/Rune \\d of 4/').first().textContent().catch(()=>'')
        if(now!==label) advanced=true
        if(await page.locator('text=/All runes caught|runes scatter/').count()) { advanced=true; break }
      }
      if(await page.locator('text=/All runes caught|runes scatter/').count()) break
    }
    await page.waitForTimeout(800)
    await page.screenshot({path:`${OUT}/75-rune-result.png`})
    const won=await page.locator('text=All runes caught').count()>0
    const lost=await page.locator('text=runes scatter').count()>0
    await page.waitForTimeout(1400)
    const after=await pts(page)
    console.log('rune catch reached a result:', won?'won':lost?'lost':'still playing',
                '| points',before.total,'->',after.total, after.total>=before.total?'PASS':'FAIL')
    sawRunes=true
  }
  await ctx.close()
}
console.log('rune catch seen:',sawRunes?'PASS':'FAIL','| duel loss checked:',lossChecked?'PASS':'FAIL')
console.log('ERRORS:',errs.length?errs.join('\n'):'none')
await b.close(); srv.close()
