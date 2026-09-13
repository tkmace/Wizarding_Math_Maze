// Shared bits for the Playwright harnesses.
//
// Every wizard now chooses a nest before the castle opens, which sits between
// "Begin the Journey" and every hub assertion in every test. Rather than teach
// twelve scripts about it, they call this.

/** Clear the nest screen if it's up. A no-op for a wizard who already has one. */
export async function takeNest(page, nest = 'Bald Eagles') {
  try {
    await page.waitForSelector(
      'text=/Choose your Nest|WHAT SHALL WE PRACTICE|Choose the robes you will wear|YOUR POINTS HAVE EARNED/',
      { timeout: 8000 })
  } catch { /* the caller's own wait will report it */ }
  if (!(await page.locator('text=Choose your Nest').count())) return false
  await page.locator('button', { hasText: nest }).first().click()
  await page.locator('button', { hasText: /^Join the / }).click()
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
const TIP_BTN = /^(Let's go!|I can do this|Back to the doors|Raise my wand|Mine now|Let me look)$/

export async function clearCoach(page) {
  const b = page.locator('button', { hasText: TIP_BTN })
  if (!(await b.count())) return false
  await b.first().click().catch(() => {})
  await page.waitForTimeout(150)
  return true
}
