// --- Drawing the trinkets -----------------------------------------------------
// Everything here is drawn in the PORTRAIT's coordinate space: origin at the
// centre of the head, +y downwards, one unit = the head radius R. That is the
// same space engine/portrait.js works in, so a trinket placed on the brow stays
// on the brow whether the wizard is 200px tall on the castle screen or 40px
// tall on a wardrobe tile — and it follows her head tilt for free, because the
// caller has already rotated the canvas.
//
// Each trinket owns a different part of the figure, so every combination can be
// worn at once without two of them landing in the same place.
//
//   circlet     the brow
//   spectacles  the eyes
//   pendant     the throat, above the collar
//   moth        the air above her left shoulder
//   crystal     the air beside her right arm
//   wand        held up on her left
//
// Drawn AFTER the hair and the hat, because a headband goes over hair and a
// pendant hangs over a collar. The two floating ones are drawn last of all so
// their glow lies over everything.

const TAU = Math.PI * 2

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)

function parse(hex) {
  const n = parseInt(String(hex).slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(hex, a) {
  const [r, g, b] = parse(hex)
  return `rgba(${r},${g},${b},${a})`
}

function shade(hex, amt) {
  const [r, g, b] = parse(hex)
  const f = c => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)
  return `#${[f(r), f(g), f(b)].map(v => clamp01(v / 255) * 255 | 0)
    .map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/** A soft round glow — the thing that makes a gem look lit rather than painted. */
function glow(ctx, x, y, r, hex, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(hex, alpha))
  g.addColorStop(0.45, rgba(hex, alpha * 0.35))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

/** A cut stone: two lit facets, two dark, and a specular chip. */
function gem(ctx, x, y, rx, ry, hex, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  ctx.moveTo(0, -ry)
  ctx.lineTo(rx, -ry * 0.18)
  ctx.lineTo(0, ry)
  ctx.lineTo(-rx, -ry * 0.18)
  ctx.closePath()
  const g = ctx.createLinearGradient(-rx, -ry, rx, ry)
  g.addColorStop(0, shade(hex, 0.55))
  g.addColorStop(0.45, hex)
  g.addColorStop(1, shade(hex, -0.45))
  ctx.fillStyle = g
  ctx.fill()
  // The near facet, catching the light.
  ctx.beginPath()
  ctx.moveTo(0, -ry)
  ctx.lineTo(-rx, -ry * 0.18)
  ctx.lineTo(0, ry * 0.2)
  ctx.closePath()
  ctx.fillStyle = rgba('#ffffff', 0.3)
  ctx.fill()
  ctx.strokeStyle = rgba('#ffffff', 0.55)
  ctx.lineWidth = Math.max(0.4, rx * 0.12)
  ctx.beginPath()
  ctx.moveTo(0, -ry)
  ctx.lineTo(rx, -ry * 0.18)
  ctx.lineTo(0, ry)
  ctx.lineTo(-rx, -ry * 0.18)
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

/**
 * @param o.R    head radius in pixels
 * @param o.ids  trinket ids being worn
 * @param o.wiz  the WIZARDS entry, for where her eyes actually are
 * @param o.form the worn form, for the trim colour
 * @param o.t    milliseconds
 */
export function drawTrinkets(ctx, o) {
  const { R, ids, wiz, form, t = 0 } = o
  if (!ids?.length || !R) return
  const trim = form?.trim || '#cfcff0'
  const has = id => ids.includes(id)

  if (has('circlet')) drawCirclet(ctx, R, trim, t)
  if (has('spectacles')) drawSpectacles(ctx, R, wiz)
  if (has('pendant')) drawPendant(ctx, R, t)
  if (has('wand')) drawWand(ctx, R, trim, t)
  if (has('crystal')) drawCrystal(ctx, R, t)
  if (has('moth')) drawMoth(ctx, R, t)
}

/**
 * A band across the brow.
 *
 * Bowed DOWNWARDS at the centre, because it is wrapped round a forehead and the
 * near part of a band round a curved surface dips towards you. Drawn straight,
 * it reads as a sticker across her face — the same mistake the hat band used to
 * make, for the same reason.
 */
function drawCirclet(ctx, R, trim, t) {
  const y = -R * 0.58, w = R * 0.86
  ctx.save()
  const band = (off = 0) => {
    ctx.beginPath()
    ctx.moveTo(-w, y - R * 0.04 + off)
    ctx.quadraticCurveTo(0, y + R * 0.14 + off, w, y - R * 0.04 + off)
  }
  // The shadow it casts on the hair just below it.
  ctx.strokeStyle = 'rgba(20,8,24,0.42)'
  ctx.lineWidth = R * 0.085
  band(R * 0.045)
  ctx.stroke()

  band()
  const g = ctx.createLinearGradient(-w, 0, w, 0)
  g.addColorStop(0, shade(trim, 0.35))
  g.addColorStop(0.4, trim)
  g.addColorStop(1, shade(trim, -0.5))
  ctx.strokeStyle = g
  ctx.lineWidth = R * 0.062
  ctx.lineCap = 'round'
  ctx.stroke()
  // A highlight along the top of the band: metal, not ribbon.
  band(-R * 0.014)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = R * 0.016
  ctx.stroke()

  const gy = y + R * 0.09
  glow(ctx, 0, gy, R * 0.3, '#ff9a4a', 0.5 + 0.18 * Math.sin(t / 700))
  gem(ctx, 0, gy, R * 0.09, R * 0.13, '#ff7b3a')
  ctx.restore()
}

/** Round lenses, on her eyes wherever her eyes happen to be. */
function drawSpectacles(ctx, R, wiz) {
  const e = wiz?.eyes || { out: 0.39, y: 0.07, rx: 0.19 }
  const ex = e.out * R, ey = e.y * R
  const r = Math.max(R * 0.2, e.rx * R * 1.28)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of [-1, 1]) {
    // The lens itself: glass, so barely anything — a wash and one streak.
    ctx.beginPath()
    ctx.arc(s * ex, ey, r, 0, TAU)
    ctx.fillStyle = 'rgba(210,235,255,0.17)'
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = r * 0.16
    ctx.beginPath()
    ctx.moveTo(s * ex - r * 0.7, ey + r * 0.5)
    ctx.lineTo(s * ex + r * 0.1, ey - r * 0.6)
    ctx.stroke()
    ctx.restore()
    // The rim, brighter on top where the light lands.
    ctx.beginPath()
    ctx.arc(s * ex, ey, r, 0, TAU)
    const g = ctx.createLinearGradient(0, ey - r, 0, ey + r)
    g.addColorStop(0, '#d9c27a')
    g.addColorStop(1, '#6b5320')
    ctx.strokeStyle = g
    ctx.lineWidth = R * 0.045
    ctx.stroke()
    // Arm, back towards the ear.
    ctx.beginPath()
    ctx.moveTo(s * (ex + r * 0.94), ey - r * 0.2)
    ctx.quadraticCurveTo(s * (ex + r * 1.7), ey - r * 0.3, s * R * 0.99, ey + r * 0.08)
    ctx.strokeStyle = '#8a6d2c'
    ctx.lineWidth = R * 0.033
    ctx.stroke()
  }
  // The bridge, sitting across the nose rather than floating in front of it.
  ctx.beginPath()
  ctx.moveTo(-ex + r * 0.9, ey + r * 0.06)
  ctx.quadraticCurveTo(0, ey + r * 0.34, ex - r * 0.9, ey + r * 0.06)
  ctx.strokeStyle = '#b8a05c'
  ctx.lineWidth = R * 0.036
  ctx.stroke()
  ctx.restore()
}

/** A cord round the throat with a pale stone hanging in the collar's V. */
function drawPendant(ctx, R, t) {
  const y0 = R * 1.5, yStone = R * 1.8
  ctx.save()
  ctx.strokeStyle = 'rgba(28,18,34,0.85)'
  ctx.lineWidth = R * 0.03
  ctx.beginPath()
  ctx.moveTo(-R * 0.46, y0)
  ctx.quadraticCurveTo(0, yStone + R * 0.02, R * 0.46, y0)
  ctx.stroke()
  // A second, lighter pass along the top of the cord so it reads as round.
  ctx.strokeStyle = 'rgba(200,190,210,0.4)'
  ctx.lineWidth = R * 0.012
  ctx.beginPath()
  ctx.moveTo(-R * 0.44, y0 + R * 0.01)
  ctx.quadraticCurveTo(0, yStone - R * 0.01, R * 0.44, y0 + R * 0.01)
  ctx.stroke()

  const pulse = 0.55 + 0.22 * Math.sin(t / 1100)
  glow(ctx, 0, yStone + R * 0.14, R * 0.46, '#bfe6ff', pulse * 0.6)
  // Moonstone: not faceted — a smooth dome with the light inside it rather than
  // on it, which is what makes a moonstone look like a moonstone.
  const g = ctx.createRadialGradient(-R * 0.03, yStone + R * 0.09, R * 0.01, 0, yStone + R * 0.14, R * 0.17)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.45, '#dff0ff')
  g.addColorStop(1, '#7f9ec4')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, yStone + R * 0.14, R * 0.13, R * 0.16, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = R * 0.014
  ctx.stroke()
  ctx.restore()
}

/**
 * Held up on her left, tip first.
 *
 * Left, not right, because the full-figure sprite already carries the form's
 * staff on the right — two sticks on the same side is a bundle of kindling.
 */
function drawWand(ctx, R, trim, t) {
  const x0 = -R * 1.32, y0 = R * 2.3       // down by the hand, off the bottom
  const x1 = -R * 1.02, y1 = R * 0.34      // the tip, up by her shoulder
  ctx.save()
  ctx.lineCap = 'round'
  // Shaft, tapering: drawn as two strokes rather than one, because a wand is
  // thicker at the grip and a single line width says "stick".
  ctx.strokeStyle = '#4a3320'
  ctx.lineWidth = R * 0.075
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(x0 + R * 0.1, (y0 + y1) / 2, x1, y1)
  ctx.stroke()
  ctx.strokeStyle = '#7a5836'
  ctx.lineWidth = R * 0.038
  ctx.beginPath()
  ctx.moveTo(x0 + R * 0.012, y0)
  ctx.quadraticCurveTo(x0 + R * 0.11, (y0 + y1) / 2, x1 + R * 0.01, y1)
  ctx.stroke()
  // The binding at the grip.
  ctx.strokeStyle = shade(trim, -0.2)
  ctx.lineWidth = R * 0.085
  ctx.beginPath()
  ctx.moveTo(x0 + R * 0.03, y0 - R * 0.28)
  ctx.lineTo(x0 + R * 0.06, y0 - R * 0.06)
  ctx.stroke()

  // The tip: a bright core, a bloom, and three sparks that drift and fade.
  const f = t / 520
  glow(ctx, x1, y1, R * 0.62, '#fff2c4', 0.62 + 0.2 * Math.sin(f))
  glow(ctx, x1, y1, R * 0.34, trim, 0.7)
  ctx.fillStyle = '#fffdf2'
  ctx.beginPath()
  ctx.arc(x1, y1, R * 0.062, 0, TAU)
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    const p = ((t / 1400) + i / 3) % 1
    const a = -1.5 + i * 1.1
    const d = R * (0.12 + p * 0.5)
    ctx.globalAlpha = (1 - p) * 0.8
    ctx.fillStyle = trim
    ctx.beginPath()
    ctx.arc(x1 + Math.cos(a) * d, y1 + Math.sin(a) * d - p * R * 0.2, R * 0.026, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/** A shard turning slowly in the air beside her. */
function drawCrystal(ctx, R, t) {
  const x = R * 1.42, y = R * 1.0 + Math.sin(t / 1600) * R * 0.09
  const spin = Math.sin(t / 2200) * 0.5
  // The width swings as it turns, so it reads as a solid turning in space
  // rather than a diamond rocking on a page.
  const k = 0.55 + 0.45 * Math.abs(Math.cos(t / 2200))
  ctx.save()
  glow(ctx, x, y, R * 0.66, '#b48cff', 0.42)
  gem(ctx, x, y, R * 0.17 * k, R * 0.34, '#9a6bff', spin)
  ctx.globalAlpha = 0.5
  glow(ctx, x, y + R * 0.5, R * 0.3, '#b48cff', 0.3)
  ctx.restore()
}

/** A small luminous moth, over her shoulder. */
function drawMoth(ctx, R, t) {
  const bx = -R * 1.3 + Math.sin(t / 1900) * R * 0.14
  const by = -R * 0.88 + Math.sin(t / 1300 + 1) * R * 0.11
  const flap = Math.sin(t / 150)
  ctx.save()
  ctx.translate(bx, by)
  ctx.scale(1.45, 1.45)
  glow(ctx, 0, 0, R * 0.42, '#ffe6a8', 0.4)
  for (const s of [-1, 1]) {
    ctx.save()
    // The near wing is wide, the far wing foreshortened — the flap is a change
    // of WIDTH, not an up-and-down wobble, which is what a wing actually does.
    ctx.scale(s * (0.55 + 0.45 * Math.abs(flap)), 1)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(R * 0.2, -R * 0.24, R * 0.26, -R * 0.05)
    ctx.quadraticCurveTo(R * 0.24, R * 0.12, 0, R * 0.06)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, -R * 0.2, R * 0.26, R * 0.1)
    g.addColorStop(0, 'rgba(255,246,214,0.92)')
    g.addColorStop(1, 'rgba(255,196,120,0.5)')
    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = '#5e4526'
  ctx.beginPath()
  ctx.ellipse(0, R * 0.01, R * 0.032, R * 0.075, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}
