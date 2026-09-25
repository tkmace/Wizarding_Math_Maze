import { SHOTS, DIST, launch } from './testenv.mjs'
// The Great Rune must stay in FRONT of the way out when it is standing between
// you and it. It used to vanish: the exit was painted after every stone,
// whatever the distance.
const OUT = SHOTS
const b=await launch()
const page=await b.newPage({viewport:{width:900,height:700},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4241/runeorder.html',{waitUntil:'networkidle'})
await page.waitForFunction(()=>window.__done,{timeout:15000}).catch(()=>{})
await page.waitForTimeout(300)
const gold = await page.evaluate(() => window.__gold)
await page.screenshot({path:`${OUT}/rune-order.png`,fullPage:true})
let pass=0, fail=0
const check=(what,ok,note='')=>{console.log(`  ${ok?'PASS':'FAIL'}  ${what}${note?' :: '+note:''}`); ok?pass++:fail++}
check('the great rune is drawn in front of the exit', gold.infront > 60, `${gold.infront} gold pixels`)
check('...and the same view without one has no gold in it', gold.behind < gold.infront / 4, `${gold.behind} vs ${gold.infront}`)
check('an ordinary stone in front of the exit still shows', gold.plain > 200, `${gold.plain} teal pixels`)
console.log(`\n${pass} passed, ${fail} failed`)
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
