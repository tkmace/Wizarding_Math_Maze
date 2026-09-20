import { chromium } from 'playwright'
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await b.newPage({viewport:{width:1250,height:1200},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4241/robesheet.html',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__done,{timeout:15000}).catch(()=>{})
await page.waitForTimeout(400)
await page.screenshot({path:`${OUT}/robe-${process.argv[2]||'1'}.png`,fullPage:true})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
