// Shared bits for the Playwright harnesses.
//
// Every wizard now chooses a nest before the castle opens, which sits between
// "Begin the Journey" and every hub assertion in every test. Rather than teach
// twelve scripts about it, they call this.

/**
 * Get through the arrival ceremonies to the castle.
 *
 * A new wizard now picks WHO SHE IS, then a nest, then is offered the
 * Attunement — three screens between "Begin the Journey" and every hub
 * assertion in every test. Rather than teach a dozen scripts about each new
 * ceremony as it arrives, they all call this. A wizard who has already done
 * them falls straight through.
 */
export async function takeNest(page, nest = 'Bald Eagles') {
  try {
    await page.waitForSelector(
      'text=/Who are you\\?|Choose your Nest|WHAT SHALL WE PRACTICE|Choose the robes you will wear|YOUR POINTS HAVE EARNED/',
      { timeout: 8000 })
  } catch { /* the caller's own wait will report it */ }
  let did = false
  if (await pickWizard(page)) did = true
  if (await page.locator('text=Choose your Nest').count()) {
    await page.locator('button', { hasText: nest }).first().click()
    await page.locator('button', { hasText: /^Join the / }).click()
    await page.waitForTimeout(250)
    did = true
  }
  if (await takePractice(page)) did = true
  if (await skipAttunement(page)) did = true
  return did
}

/** Accept whichever of the six is offered first, for tests that aren't about it. */
export async function pickWizard(page, name = null) {
  // Waits, rather than checking once. Called straight after "Begin the
  // Journey" the screen has not rendered yet, so a bare count() returns zero
  // and the caller sails on into a timeout further down.
  await page.locator('text=Who are you?').first()
    .waitFor({ state: 'visible', timeout: 6000 }).catch(() => {})
  if (!(await page.locator('text=Who are you?').count())) return false
  if (name) await page.locator('button[aria-label="' + name + '"]').click()
  await page.locator('button', { hasText: /^This is me/ }).click()
  await page.waitForTimeout(250)
  // A first pick leads straight into the rest of her look. Accept it as it
  // comes — a test that is not about her face should not have to know the
  // onboarding order.
  await takeLook(page)
  return true
}

/** Accept the look she was handed, for tests that aren't about it. */
export async function takeLook(page) {
  const b = page.locator('button', { hasText: /^That's me!/ })
  await b.first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  if (!(await b.count())) return false
  await b.first().click()
  await page.waitForTimeout(250)
  return true
}

/** Accept whatever practice list is offered on the way in. */
export async function takePractice(page) {
  const b = page.locator('button', { hasText: /^Onward ✦$/ })
  if (!(await b.count())) return false
  await b.first().click()
  await page.waitForTimeout(300)
  return true
}

/** Decline the Attunement, for any test that isn't about the Attunement. */
export async function skipAttunement(page) {
  const b = page.locator('button', { hasText: /^Not now — take me to the castle$/ })
  if (!(await b.count())) return false
  await b.first().click()
  await page.waitForTimeout(250)
  return true
}

/**
 * Dismiss a first-run explanation if one is up.
 *
 * The tips freeze movement by design, so any harness that walks has to be able
 * to clear them — a test is not a first-time player. Matches on the BUTTON:
 * the tips quote each other's subjects, so their prose is not unique.
 */
// One locator, not six — this gets called inside walking loops that run
// hundreds of iterations, and six round trips per step is a minute of nothing.
const TIP_BTN = /^(Let's go!|I can do this|Back to the doors|Raise my wand|Mine now|Let me look|I'm ready)$/

export async function clearCoach(page) {
  const b = page.locator('button', { hasText: TIP_BTN })
  if (!(await b.count())) return false
  await b.first().click().catch(() => {})
  await page.waitForTimeout(150)
  return true
}
