import { SHOTS, DIST, launch } from './testenv.mjs'
// The rank-up banner is the brightest thing on the win screen and it shows the
// robes — so it has to be the thing you can press.
const b=await launch()
const page=await b.newPage({viewport:{width:430,height:900}})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
let fails=0
const check=(n,ok,d)=>{console.log(`   ${ok?'PASS':'FAIL'} — ${n}${d?' :: '+d:''}`);if(!ok)fails++}
await page.goto('http://localhost:4241/winsheet.html?rank=2',{waitUntil:'networkidle'})
await page.waitForTimeout(900)
const banner = page.locator('button', { hasText: 'new robes await you' })
check('the banner is a button', await banner.count()===1)
check('it says what to do', (await banner.innerText()).includes('TAP TO CHOOSE'))
await banner.click()
check('pressing it goes to the robes', await page.evaluate(()=>window.__again)===1)
await page.locator('button',{hasText:'Choose my new robes'}).click()
check('the CTA below still works too', await page.evaluate(()=>window.__again)===2)
await page.goto('http://localhost:4241/winsheet.html?rank=none',{waitUntil:'networkidle'})
await page.waitForTimeout(500)
check('no banner on an ordinary win', await page.locator('button',{hasText:'new robes await you'}).count()===0)
console.log(fails?`${fails} FAILED`:'all passed')
console.log('ERRORS:',errs.length?errs.join(' | '):'none')
await b.close(); process.exit(fails?1:0)
