import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const tag = process.argv[2] || 'a'
const b=await launch()
const page=await b.newPage({viewport:{width:1280,height:1300},deviceScaleFactor:2})
const errs=[]; page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4241/creaturesheet.html',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__done,{timeout:15000})
await page.waitForTimeout(250)
await page.screenshot({path:`${OUT}/62-creatures-${tag}.png`,fullPage:true})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
