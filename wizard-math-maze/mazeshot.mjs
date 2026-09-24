import { chromium } from 'playwright'
import { takeNest, clearCoach } from './harness.mjs'
const OUT='/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await b.newPage({viewport:{width:430,height:900},deviceScaleFactor:2})
const errs=[];page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://localhost:4173/',{waitUntil:'networkidle'})
await page.fill('input[type=text]','Mazeshot'); await page.fill('input[type=password]','1234')
await page.locator('button',{hasText:'Begin the Journey'}).click()
await page.waitForTimeout(800)
const pick = page.locator('button',{hasText:'This is me'})
if (await pick.count()) { await pick.first().click(); await page.waitForTimeout(600) }
await takeNest(page)
const skip = page.locator('button',{hasText:'Not now'})
if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(500) }
await clearCoach(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE',{timeout:15000})
await page.locator('button',{hasText:'Enter the Maze'}).click()
await page.waitForTimeout(1400)
for (let i=0;i<4;i++){ await clearCoach(page); await page.waitForTimeout(200) }
await page.keyboard.press('ArrowUp'); await page.waitForTimeout(500)
await clearCoach(page)
await page.waitForTimeout(600)
await page.screenshot({path:`${OUT}/maze-figure.png`})
console.log('errors:',errs.length?errs.join('|'):'none')
await b.close()
