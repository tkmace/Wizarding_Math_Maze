import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
const ROOT='/home/claude/wmm/dist'
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  let p=u.pathname==='/'?'/index.html':u.pathname; const f=path.join(ROOT,p)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4195,r))
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await b.newPage({viewport:{width:900,height:760},deviceScaleFactor:2})
const errs=[]; page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4195/',{waitUntil:'networkidle'})
await page.waitForTimeout(400)
await page.fill('input[type=text]','Cam'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
await page.locator('button',{hasText:'Enter the Maze'}).click()
await page.waitForTimeout(1500)
await page.screenshot({path:`${OUT}/52-wall-masonry.png`})
// walk a few steps down a corridor for a depth shot
for (let i=0;i<6;i++){ await page.keyboard.press('ArrowUp'); await page.waitForTimeout(260) }
await page.screenshot({path:`${OUT}/53-corridor-depth.png`})
// Hunt for a frame with a door signposted to the side — that's the geometry
// worth looking at, and a door straight ahead never exercises it.
for (let i=0;i<260;i++){
  const side = await page.locator('span', {hasText: /^DOOR$/}).count()
  if (side){ await page.waitForTimeout(400); await page.screenshot({path:`${OUT}/54-side-door.png`}); break }
  if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()){
    await page.locator('button',{hasText:/Raise your wand|Catch the runes/}).click(); await page.waitForTimeout(350); continue
  }
  if (await page.locator('text=/^◆ RUNE CATCH$/').count()){
    await page.locator('canvas').last().click({position:{x:30+(i%5)*40,y:40+(i%4)*30}}).catch(()=>{}); await page.waitForTimeout(180); continue
  }
  if (await page.locator('text=/^◆ SPELL DUEL$/').count()){ await page.keyboard.press(String(1+(i%4))); await page.waitForTimeout(150); continue }
  const r=Math.random()
  await page.keyboard.press(r<0.55?'ArrowUp':r<0.78?'ArrowLeft':'ArrowRight')
  await page.waitForTimeout(120)
}
console.log('errors:', errs.length?errs.join('|'):'none')
await b.close(); srv.close()
