import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const b=await launch()
const page=await b.newPage({viewport:{width:1250,height:1200},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4241/robesheet.html',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__done,{timeout:15000}).catch(()=>{})
await page.waitForTimeout(400)
await page.screenshot({path:`${OUT}/robe-${process.argv[2]||'1'}.png`,fullPage:true})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
