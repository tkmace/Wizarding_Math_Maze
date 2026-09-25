import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const b=await launch()
const page=await b.newPage({viewport:{width:830,height:1130},deviceScaleFactor:2})
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await page.goto('http://localhost:4200/fovtest.html',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__done,{timeout:15000})
await page.waitForTimeout(400)
await page.screenshot({path:`${OUT}/60-fov-compare.png`,fullPage:true})
console.log('errors:',errs.length?errs.join(' | '):'none')
await b.close()
