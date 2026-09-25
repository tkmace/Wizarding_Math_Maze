// Which operations the Attunement measures: chosen on the way in, on its own
// screen, and offered again at the maze door for anything she picks later that
// has never been measured.
import { pickWizard, clearCoach } from './harness.mjs'
import { SHOTS, DIST, launch } from './testenv.mjs'
const OUT = SHOTS
const b = await launch()
const page = await b.newPage({ viewport: { width: 430, height: 960 }, deviceScaleFactor: 2 })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })

let pass = 0, fail = 0
const check = (what, ok, note = '') => {
  console.log(`   ${ok ? 'PASS' : 'FAIL'} — ${what}${note ? ' :: ' + note : ''}`)
  ok ? pass++ : fail++
}
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('wmm.profiles.v3')).attuneops)
// The count sits inside a <strong>, so the sentence spans elements — read the
// whole paragraph rather than trying to match across the boundary.
// The count sits inside a <strong>, so the sentence spans elements — read the
// whole paragraph rather than trying to match across the boundary.
const doors = async (near = 'A short maze') => {
  const t = await page.locator(`text=/${near}/`).first().innerText()
  return +/about\s+(\d+)\s+doors/.exec(t)[1]
}

console.log('1. she is asked what to practise, before the ceremony')
await page.fill('input[type=text]', 'Attuneops'); await page.fill('input[type=password]', '1234')
await page.locator('button', { hasText: 'Begin the Journey' }).click()
await page.waitForTimeout(800)
await pickWizard(page)
// Take the nest by hand: the shared helper also declines the Attunement, and
// the invitation is the thing under test.
await page.waitForSelector('text=Choose your Nest', { timeout: 10000 })
await page.locator('button', { hasText: 'Bald Eagles' }).first().click()
await page.locator('button', { hasText: /^Join the / }).click()
await page.waitForSelector('text=What shall we practise', { timeout: 10000 })
check('the practice question comes first', true)
check('it offers all four operations', await page.locator('button', { hasText: /Division/ }).count() >= 1)
const addBtn = page.locator('button', { hasText: /^➕?\s*Addition/ }).last()
check('addition starts ticked', (await addBtn.innerText()).includes('✓'))
const before = await doors('Next the castle takes your measure')
check('one operation is a short ceremony', before <= 12, `${before} doors`)

console.log('2. adding an operation lengthens it')
await page.locator('button', { hasText: /Multiplication/ }).last().click()
await page.waitForTimeout(250)
const after = await doors('Next the castle takes your measure')
check('the estimate goes up when she adds one', after > before, `${before} → ${after}`)
check('...and it is still only two taps in', after <= 18, `${after} doors`)

console.log('3. the last one cannot be switched off')
await page.locator('button', { hasText: /Multiplication/ }).last().click()
await page.waitForTimeout(200)
await page.locator('button', { hasText: /^➕?\s*Addition/ }).last().click()
await page.waitForTimeout(200)
check('one is always left on', (await page.locator('button', { hasText: /^➕?\s*Addition/ }).last().innerText()).includes('✓'))

console.log('4. walking it measures everything picked')
await page.locator('button', { hasText: /Multiplication/ }).last().click()
await page.waitForTimeout(200)
await page.locator('button', { hasText: /^Onward ✦$/ }).click()
await page.waitForSelector('text=Let the castle take your measure', { timeout: 10000 })
check('the ceremony does not ask the same question again',
  await page.locator('text=WHAT SHOULD IT MEASURE').count() === 0)
check('it says what it is measuring', /addition and multiplication/.test(await page.locator('text=/^Measuring /').first().innerText()))
await page.locator('button', { hasText: 'Begin the Attunement' }).click()
await page.waitForSelector('text=THE ATTUNEMENT', { timeout: 10000 })
const SUM = /^(\d+) ([+−×÷]) (\d+)$/
const sum = async () => {
  const t = await page.getByText(SUM).first().innerText({ timeout: 1500 }).catch(() => '')
  return SUM.exec(t.trim())
}
const answer = async () => {
  let m = null
  for (let i = 0; i < 6 && !m; i++) { m = await sum(); if (!m) await page.waitForTimeout(250) }
  let v = 99999
  if (m) { const [, a, op, c] = m; v = op === '+' ? +a + +c : op === '−' ? +a - +c : op === '×' ? +a * +c : +a / +c }
  await page.keyboard.press('Escape')
  await page.keyboard.type(String(v))
  await page.keyboard.press('Enter')
  for (let i = 0; i < 20 && await sum(); i++) await page.waitForTimeout(150)
}
const findDoor = async (limit = 60) => {
  for (let i = 0; i < limit; i++) {
    if (await page.locator('text=/^◆ SEALED DOOR$/').count()) return true
    if (await page.getByText('↰').count()) await page.keyboard.press('ArrowLeft')
    else if (await page.getByText('↱').count()) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(70)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(70)
  }
  return false
}
for (let i = 0; i < 60 && !(await page.locator('text=The castle knows you now').count()); i++) {
  if (!(await findDoor())) break
  await answer()
}
check('the ceremony finished', await page.locator('text=The castle knows you now').count() === 1)
let p = await saved()
check('both operations were recorded as measured', ['addition', 'multiplication'].every(k => (p.attunedOps || []).includes(k)), JSON.stringify(p.attunedOps))
check('both have a placement', p.skill.addition > 0 && p.skill.multiplication > 0, `add ${p.skill.addition} mul ${p.skill.multiplication}`)
check('the ones she skipped were left alone', !(p.attunedOps || []).includes('division'))

console.log('5. a new operation is offered a Quick Tuning at the maze door')
await page.locator('button', { hasText: 'To the castle' }).first().click()
await page.waitForTimeout(700)
await clearCoach(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 10000 })
check('nothing interrupts a maze of what she has been measured at', true)
await page.locator('button', { hasText: /Division/ }).first().click()
await page.waitForTimeout(350)
await clearCoach(page)
await page.locator('button', { hasText: 'Enter the Maze' }).click()
await page.waitForTimeout(700)
check('the offer appears instead of the maze', await page.locator('text=A Quick Tuning?').count() === 1)
check('it names the operation', /division/.test(await page.locator('text=/never measured your/').first().innerText()))
check('it is a short one', await doors('The castle has never measured') <= 12)
await page.screenshot({ path: `${OUT}/quick-tuning.png`, fullPage: true })

console.log('6. declining goes straight into the maze')
await page.locator('button', { hasText: 'Not now' }).click()
await page.waitForTimeout(900)
await clearCoach(page)
check('she is in a maze', await page.locator('text=EXIT SEALED').count() > 0 || await page.locator('text=/^◆ SEALED DOOR$/').count() > 0)
p = await saved()
check('and division is still unmeasured, so it will ask again', !(p.attunedOps || []).includes('division'))

console.log(`\n${pass} passed, ${fail} failed`)
console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none')
await b.close()
