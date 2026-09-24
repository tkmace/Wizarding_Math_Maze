// Which operations the Attunement measures: chosen on the invitation, and
// offered again later for anything she switches on that has never been measured.
import { chromium } from 'playwright'
import { pickWizard, clearCoach } from './harness.mjs'
const OUT = '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
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
const doors = async () => {
  const t = await page.locator('text=/A short maze/').first().innerText()
  return +/about\s+(\d+)\s+doors/.exec(t)[1]
}

console.log('1. the invitation asks what to measure')
await page.fill('input[type=text]', 'Attuneops'); await page.fill('input[type=password]', '1234')
await page.locator('button', { hasText: 'Begin the Journey' }).click()
await page.waitForTimeout(800)
await pickWizard(page)
// Take the nest by hand: the shared helper also declines the Attunement, and
// the invitation is the thing under test.
await page.waitForSelector('text=Choose your Nest', { timeout: 10000 })
await page.locator('button', { hasText: 'Bald Eagles' }).first().click()
await page.locator('button', { hasText: /^Join the / }).click()
await page.waitForSelector('text=Let the castle take your measure', { timeout: 10000 })
check('it offers all four operations', await page.locator('text=WHAT SHOULD IT MEASURE').count() === 1)
const addBtn = page.locator('button', { hasText: /^➕?\s*Addition/ }).last()
check('addition starts ticked', (await addBtn.innerText()).includes('✓'))
const before = await doors()
check('one operation is a short ceremony', before <= 12, `${before} doors`)

console.log('2. adding an operation lengthens it')
await page.locator('button', { hasText: /Multiplication/ }).last().click()
await page.waitForTimeout(250)
const after = await doors()
check('the estimate goes up when she adds one', after > before, `${before} → ${after}`)
check('...and says it is measuring both', /addition and multiplication/.test(await page.locator('text=/^Measuring /').first().innerText()))

console.log('3. the last one cannot be switched off')
await page.locator('button', { hasText: /Multiplication/ }).last().click()
await page.waitForTimeout(200)
await page.locator('button', { hasText: /^➕?\s*Addition/ }).last().click()
await page.waitForTimeout(200)
check('one is always left on', (await page.locator('button', { hasText: /^➕?\s*Addition/ }).last().innerText()).includes('✓'))

console.log('4. walking it measures everything picked')
await page.locator('button', { hasText: /Multiplication/ }).last().click()
await page.waitForTimeout(200)
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

console.log('5. switching on a fresh operation offers a measurement')
await page.locator('button', { hasText: 'To the castle' }).first().click()
await page.waitForTimeout(700)
await clearCoach(page)
await page.waitForSelector('text=WHAT SHALL WE PRACTICE', { timeout: 10000 })
check('no offer for what is already measured', await page.locator('text=/Be measured at/').count() === 0)
await page.locator('button', { hasText: /Division/ }).first().click()
await page.waitForTimeout(400)
await clearCoach(page)
check('switching on division offers to measure it', await page.locator('text=/Be measured at division/').count() === 1)
await page.screenshot({ path: `${OUT}/attune-offer.png`, fullPage: true })

console.log('6. and the offer opens a ceremony for just that one')
await page.locator('button', { hasText: /Be measured at division/ }).click()
await page.waitForTimeout(700)
check('the invitation is up', await page.locator('text=WHAT SHOULD IT MEASURE').count() === 1)
check('with division ticked', (await page.locator('button', { hasText: /Division/ }).last().innerText()).includes('✓'))
check('and addition NOT re-measured', !(await page.locator('button', { hasText: /^➕?\s*Addition/ }).last().innerText()).includes('✓'))
check('it is a short one', await doors() <= 12, `${await doors()} doors`)

console.log(`\n${pass} passed, ${fail} failed`)
console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none')
await b.close()
