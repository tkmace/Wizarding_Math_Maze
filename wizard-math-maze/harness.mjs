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
