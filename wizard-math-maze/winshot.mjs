import { chromium } from 'playwright'
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
for (const [q,name] of [['2','A-levelled'],['none','B-plain']]) {
  const page=await b.newPage({viewport:{width:430,height:1000},deviceScaleFactor:2})
  const errs=[]; page.on('pageerror',e=>errs.push(e.message))
  await page.goto(`http://localhost:4241/winsheet.html?rank=${q}`,{waitUntil:'networkidle'})
  await page.waitForTimeout(1600)
  await page.screenshot({path:`${OUT}/win-${name}.png`,fullPage:true})
  console.log(name,'errors:',errs.length?errs.join('|'):'none')
  await page.close()
}
await b.close()
