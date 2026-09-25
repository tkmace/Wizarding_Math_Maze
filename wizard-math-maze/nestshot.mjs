import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const tag=process.argv[2]||'1'
const b=await launch()
const page=await b.newPage({viewport:{width:760,height:600},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4241/nestsheet.html',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__done,{timeout:15000})
await page.waitForTimeout(200)
await page.screenshot({path:`${OUT}/nests-${tag}.png`,fullPage:true})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
