import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const b=await launch()
const page=await b.newPage({viewport:{width:420,height:1400},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4241/exitsheet.html',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__done,{timeout:15000})
await page.waitForTimeout(250)
await page.screenshot({path:`${OUT}/exit-${process.argv[2]||1}.png`,fullPage:true})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
