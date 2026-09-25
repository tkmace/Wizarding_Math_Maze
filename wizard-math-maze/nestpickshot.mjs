import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const b=await launch()
const page=await b.newPage({viewport:{width:430,height:900},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4173/',{waitUntil:'networkidle'})
await page.fill('input[type=text]','Nestpick'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()
await page.waitForTimeout(900)
const pick = page.locator('button',{hasText:'This is me'})
if (await pick.count()) { await pick.first().click(); await page.waitForTimeout(700) }
await page.waitForTimeout(900)
await page.screenshot({path:`${OUT}/nest-picker-new.png`,fullPage:true})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
