import http from 'http'; import fs from 'fs'; import path from 'path'
import { SHOTS, DIST, launch } from './testenv.mjs'
const ROOT = DIST
const M={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json'}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x')
  if(u.pathname==='/api/profile'){r.writeHead(503);return r.end('{}')}
  const f=path.join(ROOT,u.pathname==='/'?'/index.html':u.pathname)
  if(!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4239,r))
const OUT = SHOTS
const b=await launch()
const page=await b.newPage({viewport:{width:430,height:940},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4239/',{waitUntil:'networkidle'})
// a veteran with points on the board, so the progress line has something to say
await page.evaluate(()=>{localStorage.setItem('wmm.profiles.v3',JSON.stringify({camille:{
  v:4,name:'Camille',passcode:'1234',totalPoints:640,equippedSkin:'frost',
  chosen:{1:'candle',2:'frost'},bought:[],stones:9,plays:40,facts:{},
  appearance:{skin:1,hairColor:1,hairStyle:2,face:0,eyes:1,eyeColor:3,brows:0,nose:0,mouth:1,beard:0},
  nest:'harpy',skill:{addition:.3,subtraction:.2,multiplication:.15,division:.1},
  stats:{mazesCleared:5,doorsOpened:40,correct:30,wrong:10,bestStreak:6,hintsUsed:1,playMs:0},
  settings:{ops:['addition'],diff:'sense',showCompass:true,bigKeypad:true},
  createdAt:Date.now(),lastPlayed:Date.now()}}))
  localStorage.setItem('wmm.lastPlayer','Camille')})
await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(400)
await page.locator('button',{hasText:'Camille'}).click(); await page.waitForTimeout(250)
await page.locator('input[type=password]').fill('1234')
await page.locator('button',{hasText:'Enter the Realm'}).click()
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000}); await page.waitForTimeout(600)
await page.screenshot({path:`${OUT}/r2-hub.png`})
await page.locator('button',{hasText:'Wardrobe'}).click(); await page.waitForTimeout(900)
await page.screenshot({path:`${OUT}/r2-wardrobe.png`})
await page.locator('button',{hasText:'Back to the Castle'}).first().click(); await page.waitForTimeout(400)
await page.locator('button',{hasText:'My Wizard'}).click(); await page.waitForTimeout(800)
await page.screenshot({path:`${OUT}/r2-look.png`,fullPage:true})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close(); srv.close()
