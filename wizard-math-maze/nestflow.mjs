// The nest flow, end to end: a new wizard is asked once, the crest turns up on
// the hub, it survives a reload, and it can be changed from the castle.
import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
const ROOT='/home/claude/wmm/dist'
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4235,r))
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await b.newPage({viewport:{width:430,height:900},deviceScaleFactor:2})
const errs=[]; page.on('pageerror',e=>errs.push(e.message))
let fails=0
const check=(n,ok,d)=>{console.log(`   ${ok?'PASS':'FAIL'} — ${n}${d?' :: '+d:''}`); if(!ok)fails++}

await page.goto('http://localhost:4235/',{waitUntil:'networkidle'})
await page.fill('input[type=text]','Camille'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()

console.log('1. a new wizard is asked to choose')
await page.waitForSelector('text=Choose your Nest',{timeout:15000})
check('the nest screen comes up first', true)
check('all four nests offered', await page.locator('canvas[aria-label$="Eagles"]').count()===4)
check('no way to skip it', await page.locator('button',{hasText:'Back to the Castle'}).count()===0)
await page.screenshot({path:`${OUT}/nest-picker.png`,fullPage:true})

await page.locator('button',{hasText:'Harpy Eagles'}).click(); await page.waitForTimeout(300)
await page.locator('button',{hasText:'Join the Harpy Eagles'}).click()
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
console.log('2. the crest follows her to the castle')
check('crest on the hub', await page.locator('button[aria-label="Nest: Harpy Eagles"]').count()===1)
await page.waitForTimeout(400)
await page.screenshot({path:`${OUT}/nest-hub.png`})
const saved=()=>page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('wmm.profiles.v3')||'{}');return a.camille?.nest})
check('saved to the profile', await saved()==='harpy', String(await saved()))

console.log('3. it survives a reload')
await page.reload({waitUntil:'networkidle'})
await page.fill('input[type=password]','1234').catch(()=>{})
const back=await page.locator('button',{hasText:/Camille/}).count()
if(back){await page.locator('button',{hasText:/Camille/}).first().click(); await page.fill('input[type=password]','1234'); await page.locator('button',{hasText:/Enter|Begin/}).first().click()}
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
check('not asked again', await page.locator('text=Choose your Nest').count()===0)
check('crest still there', await page.locator('button[aria-label="Nest: Harpy Eagles"]').count()===1)

console.log('4. she can change it')
await page.locator('button[aria-label="Nest: Harpy Eagles"]').click()
await page.waitForSelector('text=Choose your Nest',{timeout:8000})
check('a way back out this time', await page.locator('button',{hasText:'Back to the Castle'}).count()===1)
await page.locator('button',{hasText:'Sea Eagles'}).click(); await page.waitForTimeout(200)
await page.locator('button',{hasText:'Join the Sea Eagles'}).click()
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:8000})
check('switched nests', await saved()==='sea', String(await saved()))

console.log(fails?`${fails} FAILED`:'all passed')
console.log('ERRORS:',errs.length?errs.join(' | '):'none')
await b.close(); srv.close()
process.exit(fails?1:0)
