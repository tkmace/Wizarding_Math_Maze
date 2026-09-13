import { chromium } from 'playwright'
import http from 'http'; import fs from 'fs'; import path from 'path'
const ROOT='/home/claude/wmm/dist'
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4232,r))
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await b.newPage({viewport:{width:430,height:960},deviceScaleFactor:2})
const errs=[]; page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4232/',{waitUntil:'networkidle'})
await page.fill('input[type=text]','Camille'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
await page.waitForTimeout(400)
await page.screenshot({path:`${OUT}/98-hub-collapsed.png`,fullPage:true})
console.log('page errors:', errs.length?errs.join('|'):'none')
const rows = await page.locator('button').filter({hasText:/Novice|Sorcerer|Legendary/}).count()
console.log('fixed tiers hidden by default:', rows===0?'PASS':'FAIL ('+rows+' showing)')
await page.locator('text=Show fixed skill level modes').click(); await page.waitForTimeout(300)
const rows2 = await page.locator('button').filter({hasText:/Novice|Sorcerer|Legendary/}).count()
console.log('toggle reveals them:', rows2===3?'PASS':'FAIL ('+rows2+')')
await page.screenshot({path:`${OUT}/99-hub-expanded.png`,fullPage:true})
await page.locator('button',{hasText:'Back to the Castle'}).first().click().catch(()=>{})
await page.waitForTimeout(300)
await page.locator('button',{hasText:'My Look'}).first().click(); await page.waitForTimeout(600)
await page.screenshot({path:`${OUT}/97-lookpicker.png`,fullPage:true})
await b.close(); srv.close()
