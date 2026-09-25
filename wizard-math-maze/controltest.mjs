// Regression: a hold on the movement pad must not survive the pad.
//
// Camille finished one maze and the next one walked itself. The cause was a
// repeat interval with no unmount cleanup: she reached the exit still holding
// ▲, the win screen ate the pointer-up, and the interval went on firing moves
// into the maze that came after. These three checks are that bug, from three
// directions.
import http from 'http'
import { SHOTS, DIST, launch } from './testenv.mjs'

const b = await launch()
const page = await b.newPage({ viewport: { width: 430, height: 700 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.goto('http://localhost:4241/controlsheet.html', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__done, { timeout: 15000 })

const fwd = page.locator('button[aria-label="Walk forward"]')
const moves = () => page.evaluate(() => window.__moves)
const reset = () => page.evaluate(() => { window.__moves = 0 })
let fails = 0
const check = (name, ok, detail) => {
  console.log(`   ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`)
  if (!ok) fails++
}

// 1. The repeat still has to work, or the fix has broken walking.
console.log('1. holding still repeats')
await reset()
const box = await fwd.boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.waitForTimeout(900)
const held = await moves()
await page.mouse.up()
check('a 900ms hold walks several squares', held >= 3, `${held} moves`)
await page.waitForTimeout(500)
check('and stops on release', (await moves()) === held, `${await moves()} moves`)

// 2. The bug itself: unmount mid-hold, no pointer-up anywhere.
console.log('2. torn down mid-hold (the win-screen case)')
await reset()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.waitForTimeout(700)
await page.evaluate(() => window.__unmount())
const atUnmount = await moves()
await page.waitForTimeout(1200)
const after = await moves()
await page.mouse.up()
check('the repeat dies with the pad', after === atUnmount, `${atUnmount} → ${after} moves after unmount`)

// 3. Disabling the pad (a door, an encounter) also ends the hold.
console.log('3. disabled mid-hold (a door opening)')
await page.reload({ waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__done, { timeout: 15000 })
await page.evaluate(() => { window.__moves = 0 })
const box2 = await page.locator('button[aria-label="Walk forward"]').boundingBox()
await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2)
await page.mouse.down()
await page.waitForTimeout(700)
await page.evaluate(() => window.__disable())
const atDisable = await moves()
await page.waitForTimeout(1000)
const after2 = await moves()
await page.mouse.up()
check('the repeat stops when the pad greys out', after2 === atDisable, `${atDisable} → ${after2}`)

console.log(fails ? `${fails} FAILED` : 'all passed')
console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none')
await b.close()
process.exit(fails ? 1 : 0)
