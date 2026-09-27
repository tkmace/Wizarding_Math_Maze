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

// --- Determinism -------------------------------------------------------------
//
// The maze is built with Math.random, so every run hands a walking harness a
// different problem. That is how scratchtest came to fail one run in three on
// code nobody had touched — and a test whose input changes every time is not
// measuring what it claims to measure, it is sampling.
//
// Two halves, and both are needed. seedPage replaces the PAGE's Math.random
// before a line of app code runs, which fixes the maze. rng() gives a harness
// its own seeded stream for the walk, which fixes the route. Together: same
// seed, same maze, same steps, same answer, every run and every machine.
//
// The seed is fixed by default and overridable, so the suite is deterministic
// while fuzzing stays one variable away:
//
//   WMM_SEED=12345 npm test -- scratchtest
//
// Worth doing deliberately when touching maze generation, since a fixed seed
// buys reproducibility by giving up coverage — it walks one maze well rather
// than a different maze badly.
export const SEED = Number(process.env.WMM_SEED) || 20260927

/** mulberry32. Small, fast, and thoroughly boring, which is the entire point. */
export function rng(seed = SEED) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Hand the page a seeded Math.random, before any app code runs.
 *
 * addInitScript, not an evaluate after goto: the maze for the first room is
 * built during the app's first render, so anything that arrives afterwards is
 * already too late to decide what it looks like.
 */
export async function seedPage(page, seed = SEED) {
  await page.addInitScript(s => {
    let a = s >>> 0
    Math.random = () => {
      a = (a + 0x6D2B79F5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }, seed)
}
