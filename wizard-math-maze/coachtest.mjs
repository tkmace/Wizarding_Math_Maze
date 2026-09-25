// The first-run explanations: each one turns up at its own moment, once.
import http from 'http'; import fs from 'fs'; import path from 'path'
import { takeNest } from './harness.mjs'
import { SHOTS, DIST, launch } from './testenv.mjs'
const ROOT = DIST
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4245,r))
const OUT = SHOTS
const b=await launch()
const page=await b.newPage({viewport:{width:430,height:900},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
let fails=0
const check=(n,ok,d)=>{console.log(`   ${ok?'PASS':'FAIL'} — ${n}${d?' :: '+d:''}`);if(!ok)fails++}
const seen=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wmm.profiles.v3')||'{}').camille?.seen||{})

await page.goto('http://localhost:4245/',{waitUntil:'networkidle'})
await page.waitForTimeout(600)
await page.screenshot({path:`${OUT}/coach-login.png`})
console.log('page errors so far:', errs.length?errs.join(' | '):'none')
await page.fill('input[type=text]','Camille'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})

console.log('1. the wardrobe explains itself the first time')
await page.locator('button',{hasText:'Wardrobe'}).click(); await page.waitForTimeout(600)
check('wardrobe tip shown', await page.locator('button',{hasText:'Let me look'}).count()===1)
await page.screenshot({path:`${OUT}/coach-wardrobe.png`})
await page.locator('button',{hasText:'Let me look'}).click(); await page.waitForTimeout(300)
check('recorded', (await seen()).wardrobe===true)
await page.locator('button',{hasText:'Back to the Castle'}).first().click(); await page.waitForTimeout(400)
await page.locator('button',{hasText:'Wardrobe'}).click(); await page.waitForTimeout(600)
// "The Wardrobe" is also the page's own heading, so match the tip's button.
check('not shown a second time', await page.locator('button',{hasText:'Let me look'}).count()===0)
await page.locator('button',{hasText:'Back to the Castle'}).first().click(); await page.waitForTimeout(400)

console.log('2. the maze explains itself on the way in')
await page.locator('button',{hasText:'Enter the Maze'}).click(); await page.waitForTimeout(700)
check('maze tip shown', await page.locator('text=Into the maze').count()>0)
await page.screenshot({path:`${OUT}/coach-maze.png`})
// It must actually block walking, or a held key walks on behind the card.
await page.keyboard.press('ArrowUp'); await page.waitForTimeout(200)
check('still up after an arrow key', await page.locator('text=Into the maze').count()>0)
await page.locator('button',{hasText:"Let's go"}).click(); await page.waitForTimeout(300)
check('recorded', (await seen()).maze===true)

console.log('3. the first door explains itself')
let opened=false
for (let i=0;i<400 && !opened;i++){
  // Match the tips by their BUTTON, not their prose — the tips quote each
  // other's subjects ("…and maybe a rune stone"), and so do the games.
  if (await page.locator('button',{hasText:'I can do this'}).count()) { opened=true; break }
  for (const cta of ['Raise my wand','Back to the doors','Mine now']) {
    const b = page.locator('button',{hasText:cta})
    if (await b.count()) { await b.click(); await page.waitForTimeout(200) }
  }
  if (await page.locator('text=SOMETHING BLOCKS THE WAY').count()) {
    await page.locator('button',{hasText:/Raise your wand|Catch the runes/}).click().catch(()=>{})
    await page.waitForTimeout(300); continue
  }
  if (await page.locator('text=/^◆ SPELL DUEL$/').count()) {
    await page.keyboard.press(String(1+(i%4))); await page.waitForTimeout(140); continue
  }
  if (await page.locator('text=/^◆ RUNE CATCH$/').count()) {
    await page.locator('canvas').last().click({position:{x:30+(i%5)*40,y:40+(i%4)*30}}).catch(()=>{})
    await page.waitForTimeout(180); continue
  }
  const r=i%7
  await page.keyboard.press(r<4?'ArrowUp':r<6?'ArrowLeft':'ArrowRight')
  await page.waitForTimeout(80)
}
check('door tip shown', opened, opened?'':'walk never reached a door this run')
if (opened) {
  await page.screenshot({path:`${OUT}/coach-door.png`})
  await page.locator('button',{hasText:'I can do this'}).click(); await page.waitForTimeout(300)
  check('recorded', (await seen()).door===true)
  check('the door itself is underneath it', await page.locator('text=/^◆ (SEALED DOOR|RUNE OF RETURN)$/').count()>0)
}

console.log('4. a veteran is not taught to walk')
await page.evaluate(()=>{
  const all=JSON.parse(localStorage.getItem('wmm.profiles.v3'))
  const v={...all.camille, name:'Vet', passcode:'1234', plays:60, seen:undefined}
  delete v.seen
  all.vet=v
  localStorage.setItem('wmm.profiles.v3', JSON.stringify(all))
})
await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(500)
await page.locator('button',{hasText:'Vet'}).click(); await page.waitForTimeout(250)
await page.locator('input[type=password]').fill('1234')
await page.locator('button',{hasText:'Enter the Realm'}).click()
await takeNest(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
await page.locator('button',{hasText:'Enter the Maze'}).click(); await page.waitForTimeout(700)
check('no maze tip for 60 plays', await page.locator('text=Into the maze').count()===0)

console.log(fails?`${fails} FAILED`:'all passed')
console.log('ERRORS:',errs.length?errs.join(' | '):'none')
await b.close(); srv.close(); process.exit(fails?1:0)
