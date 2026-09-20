import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await b.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:4241/portraitsheet.html', { waitUntil: 'networkidle' })
const out = await page.evaluate(async () => {
  const { drawPortrait } = await import('/src/engine/portrait.js')
  const { WIZARDS, paletteFor } = await import('/src/game/wizards.js')
  const { formById } = await import('/src/game/skins.js')
  const size = 196 * 2, form = formById('apprentice')
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size
  const ctx = cv.getContext('2d')
  const run = (wiz, n) => {
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
      ctx.clearRect(0, 0, size, size)
      drawPortrait(ctx, { cx: size / 2, cy: size * 0.46, R: size * 0.26, wiz,
        skin: paletteFor(wiz.skin), eye: '#5c3a22', hair: '#b0541f', form, t: i * 16 })
    }
    return (performance.now() - t0) / n
  }
  run(WIZARDS[0], 5)                       // warm up
  return { wren: run(WIZARDS[0], 40), kestrel: run(WIZARDS[1], 40) }
})
console.log(`Wren    ${out.wren.toFixed(1)} ms/frame`)
console.log(`Kestrel ${out.kestrel.toFixed(1)} ms/frame`)
console.log(`(a 60fps budget is 16.7ms, and this machine is faster than an iPad)`)
await b.close()
