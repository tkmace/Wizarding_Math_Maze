// --- Procedural creatures -----------------------------------------------------
// Drawn the same way as the wizards: pure canvas from a handful of data fields,
// so a new creature costs a config line and there is nothing to host.

import { grain } from './portrait.js'

const TAU = Math.PI * 2

export const CREATURES = [
  { id: 'imp',    name: 'Cinder Imp',    body: '#c4452c', accent: '#ffd070', eyes: 2, shape: 'imp',
    horns: true, wings: true, taunt: 'A spark-eyed imp blocks the hall!' },
  { id: 'slime',  name: 'Rune Slime',    body: '#3f9f7a', accent: '#c8ffe8', eyes: 2, shape: 'slime',
    horns: false, wings: false, taunt: 'A slime oozes across the floor, humming numbers.' },
  { id: 'batling',name: 'Night Batling', body: '#5a3f9a', accent: '#e0c8ff', eyes: 3, shape: 'bat',
    horns: false, wings: true, taunt: 'Wings snap out of the dark!' },
  { id: 'golem',  name: 'Chalk Golem',   body: '#7a7f90', accent: '#ffffff', eyes: 1, shape: 'golem',
    horns: true, wings: false, taunt: 'A golem of chalk and slate grinds awake.' },
]

export const randomCreature = () => CREATURES[Math.floor(Math.random() * CREATURES.length)]

/**
 * @param o.charge 0..1 how close the creature is to casting — drives a growing
 *                 aura, so the pressure is visible rather than only numeric
 * @param o.hit    0..1 recent-hit flash, for squash and a white flash
 * @param o.dying  0..1 defeat animation
 */
export function drawCreature(ctx, o) {
  const { x, y, h, creature: c, t = 0, charge = 0, hit = 0, dying = 0 } = o
  if (!c) return

  const breathe = 1 + Math.sin(t / 420) * 0.035
  const squash = 1 + hit * 0.28
  const stretch = 1 - hit * 0.2
  const fade = 1 - dying

  ctx.save()
  ctx.globalAlpha = Math.max(0, fade)
  ctx.translate(x, y + dying * h * 0.5)
  ctx.scale(squash * (1 + dying * 0.4), stretch * breathe * (1 - dying * 0.6))

  // Charge aura — the tell that it is about to cast.
  if (charge > 0.02) {
    const r = h * (0.55 + charge * 0.5)
    const g = ctx.createRadialGradient(0, -h * 0.35, h * 0.1, 0, -h * 0.35, r)
    g.addColorStop(0, `rgba(255,80,80,${0.05 + charge * 0.3})`)
    g.addColorStop(1, 'rgba(255,60,60,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(0, -h * 0.35, r, 0, TAU); ctx.fill()
    if (charge > 0.65) {
      ctx.globalAlpha = fade * (0.3 + 0.5 * Math.abs(Math.sin(t / 90)))
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = Math.max(1.5, h * 0.018)
      ctx.beginPath(); ctx.arc(0, -h * 0.35, h * 0.6, 0, TAU); ctx.stroke()
      ctx.globalAlpha = Math.max(0, fade)
    }
  }

  // Contact shadow, so it isn't floating.
  const gs = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.42)
  gs.addColorStop(0, 'rgba(0,0,0,0.4)')
  gs.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gs
  ctx.beginPath(); ctx.ellipse(0, h * 0.01, h * 0.4, h * 0.06, 0, 0, TAU); ctx.fill()

  // ── Wings, behind the body ──
  if (c.wings) {
    const flap = Math.sin(t / 150) * 0.5
    for (const sgn of [-1, 1]) {
      // A proper bat wing: a long swept leading edge up and out, then scalloped
      // back along the trailing edge. Flat flaps either side read as ears.
      const tip = 0.86 + flap * 0.12
      const wing = () => {
        ctx.beginPath()
        ctx.moveTo(sgn * h * 0.18, -h * 0.58)
        // leading edge, out to the tip
        ctx.quadraticCurveTo(sgn * h * 0.52, -h * (tip + 0.06), sgn * h * 0.78, -h * tip)
        // trailing edge, scalloped back in
        ctx.quadraticCurveTo(sgn * h * 0.6, -h * (tip - 0.14), sgn * h * 0.62, -h * 0.52)
        ctx.quadraticCurveTo(sgn * h * 0.46, -h * 0.42, sgn * h * 0.44, -h * 0.3)
        ctx.quadraticCurveTo(sgn * h * 0.32, -h * 0.3, sgn * h * 0.28, -h * 0.22)
        ctx.quadraticCurveTo(sgn * h * 0.22, -h * 0.34, sgn * h * 0.18, -h * 0.58)
        ctx.closePath()
      }
      wing()
      // Membrane, not leather: darker where it is stretched thin between the
      // fingers and lighter towards the body, with the light coming through it.
      const wg = ctx.createLinearGradient(sgn * h * 0.18, -h * 0.3, sgn * h * 0.8, -h * 0.9)
      wg.addColorStop(0, shadeC(c.body, -0.28))
      wg.addColorStop(1, shadeC(c.body, -0.52))
      ctx.fillStyle = wg
      ctx.fill()
      volume(ctx, wing, { x: sgn < 0 ? -h * 0.85 : 0, y: -h * 0.95, w: h * 0.85, h: h * 0.8 }, 0.8)
      ctx.save()
      wing(); ctx.clip()
      grain(ctx, -h, -h, h * 2, h * 1.2, 13, 0.05)
      ctx.restore()
      wing()
      outline(ctx, h, c.body, 0.8)
      // The leading edge is bone under skin and catches the light along its
      // whole length; the trailing edge does not.
      ctx.save()
      ctx.filter = `blur(${Math.max(0.5, h * 0.006)}px)`
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * fade})`
      ctx.lineWidth = Math.max(1, h * 0.012)
      ctx.beginPath()
      ctx.moveTo(sgn * h * 0.19, -h * 0.57)
      ctx.quadraticCurveTo(sgn * h * 0.52, -h * (tip + 0.05), sgn * h * 0.77, -h * tip)
      ctx.stroke()
      ctx.restore()
      // Membrane ribs
      ctx.save()
      wing(); ctx.clip()
      ctx.strokeStyle = shadeC(c.body, -0.62)
      ctx.globalAlpha = 0.5
      ctx.lineWidth = Math.max(1, h * 0.009)
      for (const [rx, ry] of [[0.46, 0.34], [0.62, 0.52], [0.74, 0.74]]) {
        ctx.beginPath()
        ctx.moveTo(sgn * h * 0.2, -h * 0.56)
        ctx.lineTo(sgn * h * rx, -h * ry)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  // ── Body ──
  const body = () => {
    ctx.beginPath()
    if (c.shape === 'slime') {
      // A dome with a wobbling skirt, so it reads as liquid rather than a hill.
      const w = Math.sin(t / 330) * h * 0.02
      ctx.moveTo(-h * 0.46 - w, 0)
      ctx.bezierCurveTo(-h * 0.52, -h * 0.46, -h * 0.34, -h * 0.76, 0, -h * 0.76)
      ctx.bezierCurveTo(h * 0.34, -h * 0.76, h * 0.52, -h * 0.46, h * 0.46 + w, 0)
      ctx.closePath()
    } else if (c.shape === 'golem') {
      ctx.moveTo(-h * 0.34, 0)
      ctx.lineTo(-h * 0.41, -h * 0.6)
      ctx.lineTo(-h * 0.2, -h * 0.79)
      ctx.lineTo(h * 0.2, -h * 0.79)
      ctx.lineTo(h * 0.41, -h * 0.6)
      ctx.lineTo(h * 0.34, 0)
      ctx.closePath()
    } else if (c.shape === 'bat') {
      ctx.ellipse(0, -h * 0.42, h * 0.31, h * 0.36, 0, 0, TAU)
      ctx.closePath()
    } else {
      // Imp: a pear, wider at the bottom, which is the cute shape.
      ctx.moveTo(-h * 0.33, 0)
      ctx.bezierCurveTo(-h * 0.44, -h * 0.34, -h * 0.36, -h * 0.66, -h * 0.17, -h * 0.74)
      ctx.bezierCurveTo(-h * 0.06, -h * 0.82, h * 0.06, -h * 0.82, h * 0.17, -h * 0.74)
      ctx.bezierCurveTo(h * 0.36, -h * 0.66, h * 0.44, -h * 0.34, h * 0.33, 0)
      ctx.closePath()
    }
  }

  // Ears, before the body so they tuck behind — the bat gets big round ones.
  if (c.shape === 'bat') {
    for (const sgn of [-1, 1]) {
      const ear = () => {
        ctx.beginPath()
        ctx.moveTo(sgn * h * 0.14, -h * 0.68)
        ctx.quadraticCurveTo(sgn * h * 0.36, -h * 0.98, sgn * h * 0.3, -h * 0.62)
        ctx.quadraticCurveTo(sgn * h * 0.24, -h * 0.56, sgn * h * 0.12, -h * 0.6)
        ctx.closePath()
      }
      ear()
      ctx.fillStyle = shadeC(c.body, -0.15)
      ctx.fill()
      ear()
      outline(ctx, h, c.body, 0.75)
      ctx.beginPath()
      ctx.ellipse(sgn * h * 0.23, -h * 0.74, h * 0.05, h * 0.08, sgn * 0.4, 0, TAU)
      ctx.fillStyle = shadeC(c.accent, -0.1)
      ctx.globalAlpha = 0.7
      ctx.fill()
      ctx.globalAlpha = Math.max(0, fade)
    }
  }

  // Tail, for the imp.
  if (c.shape === 'imp') {
    const sw = Math.sin(t / 300) * h * 0.05
    ctx.strokeStyle = shadeC(c.body, -0.2)
    ctx.lineWidth = Math.max(1.5, h * 0.035)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(h * 0.3, -h * 0.06)
    ctx.quadraticCurveTo(h * 0.52, -h * 0.02 + sw, h * 0.5, -h * 0.2 + sw)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(h * 0.5, -h * 0.2 + sw)
    ctx.lineTo(h * 0.58, -h * 0.26 + sw)
    ctx.lineTo(h * 0.46, -h * 0.3 + sw)
    ctx.closePath()
    ctx.fillStyle = c.accent
    ctx.fill()
  }

  body()
  ctx.fillStyle = c.body
  ctx.fill()
  volume(ctx, body, { x: -h * 0.5, y: -h * 0.85, w: h, h: h * 0.9 })
  surface(ctx, c, h, t, body, fade)
  body()
  outline(ctx, h, c.body)

  // Belly / chest patch in the accent colour — every friendly monster has one,
  // and it breaks up what is otherwise one flat mass.
  if (c.shape !== 'golem') {
    ctx.save()
    body(); ctx.clip()
    ctx.globalAlpha = 0.28
    ctx.fillStyle = c.accent
    ctx.beginPath()
    ctx.ellipse(0, -h * 0.16, h * 0.2, h * 0.2, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  // Slime: a glassy highlight and a couple of drips.
  if (c.shape === 'slime') {
    ctx.save()
    body(); ctx.clip()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(-h * 0.16, -h * 0.56, h * 0.11, h * 0.07, -0.5, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 0.22
    ctx.beginPath()
    ctx.ellipse(-h * 0.26, -h * 0.42, h * 0.05, h * 0.035, -0.5, 0, TAU)
    ctx.fill()
    ctx.restore()
    for (const [dx, dy, r] of [[-h * 0.3, -h * 0.06, h * 0.035], [h * 0.26, -h * 0.02, h * 0.028]]) {
      ctx.beginPath()
      ctx.arc(dx, dy + Math.sin(t / 500 + dx) * h * 0.01, r, 0, TAU)
      ctx.fillStyle = shadeC(c.body, 0.1)
      ctx.fill()
      outline(ctx, h, c.body, 0.6)
    }
  }

  // Golem: cracks and a chip out of one shoulder.
  if (c.shape === 'golem') {
    ctx.save()
    body(); ctx.clip()
    ctx.strokeStyle = shadeC(c.body, -0.55)
    ctx.globalAlpha = 0.65
    ctx.lineWidth = Math.max(1, h * 0.012)
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-h * 0.3, -h * 0.1); ctx.lineTo(-h * 0.14, -h * 0.3)
    ctx.lineTo(-h * 0.2, -h * 0.44); ctx.lineTo(-h * 0.02, -h * 0.62)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(h * 0.34, -h * 0.24); ctx.lineTo(h * 0.18, -h * 0.36)
    ctx.stroke()
    ctx.restore()
  }

  if (c.horns) {
    for (const sgn of [-1, 1]) {
      const horn = () => {
        ctx.beginPath()
        ctx.moveTo(sgn * h * 0.14, -h * 0.7)
        ctx.quadraticCurveTo(sgn * h * 0.32, -h * 0.88, sgn * h * 0.21, -h * 1.02)
        ctx.quadraticCurveTo(sgn * h * 0.18, -h * 0.84, sgn * h * 0.07, -h * 0.72)
        ctx.closePath()
      }
      horn()
      // Dark where it leaves the skull, bright at the point. A horn lit evenly
      // is a plastic traffic cone; the whole read is in the gradient.
      const hg = ctx.createLinearGradient(sgn * h * 0.1, -h * 0.68, sgn * h * 0.22, -h * 1.02)
      hg.addColorStop(0, shadeC(c.accent, -0.45))
      hg.addColorStop(0.55, c.accent)
      hg.addColorStop(1, shadeC(c.accent, 0.4))
      ctx.fillStyle = hg
      ctx.fill()
      ctx.save()
      horn(); ctx.clip()
      grain(ctx, -h * 0.4, -h * 1.1, h * 0.8, h * 0.45, 29, 0.055)
      // Growth rings, which is what separates horn from a shape.
      ctx.globalAlpha = Math.max(0, fade) * 0.3
      ctx.strokeStyle = shadeC(c.accent, -0.5)
      ctx.lineWidth = Math.max(0.6, h * 0.007)
      for (let i = 1; i < 4; i++) {
        const f = i / 4
        ctx.beginPath()
        ctx.moveTo(sgn * h * (0.14 + 0.1 * f), -h * (0.70 + 0.3 * f))
        ctx.lineTo(sgn * h * (0.06 + 0.08 * f), -h * (0.73 + 0.3 * f))
        ctx.stroke()
      }
      ctx.restore()
      horn()
      outline(ctx, h, c.accent, 0.7)
    }
  }

  // ── Eyes ──
  // Big, white, glossy. The old ones were 6% of the height and read as pinholes;
  // these are the creature's whole personality, so they get the same catchlight
  // treatment as the wizards.
  const eyeY = -h * 0.5
  const one = c.eyes === 1
  const eR = h * (one ? 0.15 : 0.095)
  const spread = one ? [0] : c.eyes === 2 ? [-h * 0.14, h * 0.14] : [-h * 0.19, 0, h * 0.19]
  const look = Math.sin(t / 700) * eR * 0.22
  for (const ex of spread) {
    ctx.beginPath(); ctx.ellipse(ex, eyeY, eR, eR * 1.06, 0, 0, TAU)
    ctx.fillStyle = '#fffbe8'; ctx.fill()
    outline(ctx, h, '#c9b68e', 0.55)
    ctx.beginPath(); ctx.arc(ex + look, eyeY + eR * 0.1, eR * 0.55, 0, TAU)
    ctx.fillStyle = '#1a0e08'; ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(ex + look - eR * 0.2, eyeY - eR * 0.16, eR * 0.2, 0, TAU); ctx.fill()
    ctx.globalAlpha = Math.max(0, fade) * 0.7
    ctx.beginPath(); ctx.arc(ex + look + eR * 0.24, eyeY + eR * 0.34, eR * 0.1, 0, TAU); ctx.fill()
    ctx.globalAlpha = Math.max(0, fade)
  }

  // Cheeks — even the monsters get them. Mischief, not menace.
  ctx.save()
  ctx.globalAlpha = Math.max(0, fade) * 0.3
  ctx.fillStyle = '#ff8a72'
  for (const sgn of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sgn * h * 0.24, -h * 0.38, h * 0.06, h * 0.04, 0, 0, TAU)
    ctx.fill()
  }
  ctx.restore()

  // ── Mouth ──
  const my = -h * 0.3
  if (c.shape === 'slime') {
    // A wide soft smile — a slime has no teeth to show.
    ctx.strokeStyle = shadeC(c.body, -0.62)
    ctx.lineWidth = Math.max(1.4, h * 0.02)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, my - h * 0.03, h * 0.1, 0.12 * Math.PI, 0.88 * Math.PI)
    ctx.stroke()
  } else if (c.shape === 'golem') {
    // A slab of a mouth, chipped.
    ctx.fillStyle = shadeC(c.body, -0.6)
    ctx.beginPath()
    ctx.moveTo(-h * 0.13, my - h * 0.02)
    ctx.lineTo(h * 0.13, my - h * 0.02)
    ctx.lineTo(h * 0.1, my + h * 0.05)
    ctx.lineTo(-h * 0.1, my + h * 0.05)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = shadeC(c.accent, -0.05)
    for (const fx of [-0.06, 0.02]) {
      ctx.beginPath()
      ctx.moveTo(h * fx, my - h * 0.02)
      ctx.lineTo(h * (fx + 0.035), my - h * 0.02)
      ctx.lineTo(h * (fx + 0.018), my + h * 0.035)
      ctx.closePath()
      ctx.fill()
    }
  } else {
    // A toothy grin with a tongue.
    const mw = h * 0.13, mh = h * 0.09
    const mouth = () => {
      ctx.beginPath()
      ctx.moveTo(-mw, my - mh * 0.3)
      ctx.quadraticCurveTo(0, my - mh * 0.65, mw, my - mh * 0.3)
      ctx.quadraticCurveTo(0, my + mh * 1.5, -mw, my - mh * 0.3)
      ctx.closePath()
    }
    mouth()
    ctx.fillStyle = '#3d1618'
    ctx.fill()
    ctx.save()
    mouth(); ctx.clip()
    ctx.beginPath()
    ctx.ellipse(0, my + mh * 0.95, mw * 0.6, mh * 0.7, 0, 0, TAU)
    ctx.fillStyle = '#e8737f'
    ctx.fill()
    // Fangs hanging from the top lip.
    ctx.fillStyle = '#fffbe8'
    for (const fx of [-0.55, 0.5]) {
      ctx.beginPath()
      ctx.moveTo(mw * fx - mw * 0.16, my - mh * 0.4)
      ctx.lineTo(mw * fx + mw * 0.16, my - mh * 0.4)
      ctx.lineTo(mw * fx, my + mh * 0.5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    mouth()
    outline(ctx, h, '#3d1618', 0.5)
  }

  if (hit > 0.05) {
    ctx.globalAlpha = hit * 0.8 * fade
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(0, -h * 0.4, h * 0.5, 0, TAU); ctx.fill()
  }
  ctx.restore()
}

// --- Shared shading, matching the wizards so the two read as one world --------
function outline(ctx, h, col, weight = 1) {
  ctx.strokeStyle = shadeC(col, -0.66)
  ctx.lineWidth = Math.max(1, h * 0.016 * weight)
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function volume(ctx, drawPath, bb, strength = 1) {
  ctx.save()
  drawPath()
  ctx.clip()
  const lx = bb.x + bb.w * 0.3, ly = bb.y + bb.h * 0.2
  const hl = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(bb.w, bb.h) * 0.8)
  hl.addColorStop(0, `rgba(255,255,255,${0.28 * strength})`)
  hl.addColorStop(0.55, `rgba(255,255,255,${0.08 * strength})`)
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hl
  ctx.fillRect(bb.x, bb.y, bb.w, bb.h)
  const sh = ctx.createLinearGradient(bb.x + bb.w * 0.42, bb.y + bb.h * 0.25, bb.x + bb.w, bb.y + bb.h)
  sh.addColorStop(0, 'rgba(10,5,26,0)')
  sh.addColorStop(1, `rgba(10,5,26,${0.42 * strength})`)
  ctx.fillStyle = sh
  ctx.fillRect(bb.x, bb.y, bb.w, bb.h)
  ctx.restore()
}

/** A bolt travelling from the wizard to the creature. */
export function drawBolt(ctx, x0, y0, x1, y1, p, color) {
  if (p <= 0 || p >= 1) return
  const x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p
  ctx.save()
  const g = ctx.createRadialGradient(x, y, 0, x, y, 26)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.3, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill()
  // A short tail behind it
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - (x1 - x0) * 0.08, y - (y1 - y0) * 0.08)
  ctx.stroke()
  ctx.restore()
}

function shadeC(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex))
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)
    return Math.max(0, Math.min(255, Math.round(out)))
  })
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}

/**
 * The material pass: what each creature is actually MADE of.
 *
 * Up to here every creature is a silhouette with one gradient across it, which
 * is why four very different animals all read as the same plastic toy in four
 * colours. The wizards got past that with modelling, texture and a rim light,
 * and the same three do the work here — plus the part that matters most for a
 * monster, which is that stone, slime, fur and hide catch light in four
 * completely different ways:
 *
 *   imp    hide, matte, mottled with soot, lit from within at the belly
 *   slime  translucent, so the light goes THROUGH it and pools at the bottom
 *   bat    fur, which has no hard edge at all — the silhouette breaks up
 *   golem  chalk, flat facets and dust, with the light snapping between planes
 *
 * All of it is clipped to the body, so none of it can leak onto the background
 * the way an unclipped shadow once did on the wizards' hats.
 */
function surface(ctx, c, h, t, body, fade = 1) {
  ctx.save()
  body()
  ctx.clip()

  // The light, from the upper left, for every creature.
  const lit = ctx.createLinearGradient(-h * 0.45, -h * 0.85, h * 0.45, -h * 0.05)
  lit.addColorStop(0, 'rgba(255,255,255,0.20)')
  lit.addColorStop(0.45, 'rgba(255,255,255,0)')
  lit.addColorStop(1, 'rgba(10,4,24,0.34)')
  ctx.fillStyle = lit
  ctx.fillRect(-h, -h * 1.1, h * 2, h * 1.2)

  // ...and the ground it is standing on, throwing a little of it back up.
  const bounce = ctx.createLinearGradient(0, h * 0.02, 0, -h * 0.22)
  bounce.addColorStop(0, 'rgba(255,214,170,0.18)')
  bounce.addColorStop(1, 'rgba(255,214,170,0)')
  ctx.fillStyle = bounce
  ctx.fillRect(-h, -h * 0.3, h * 2, h * 0.34)

  const seed = (c.id || '').length * 17 + 3

  if (c.shape === 'slime') {
    // Light goes in and comes back out lower down. That pooled glow near the
    // bottom is the entire difference between jelly and a painted dome.
    const deep = ctx.createRadialGradient(0, -h * 0.16, h * 0.02, 0, -h * 0.16, h * 0.42)
    deep.addColorStop(0, `rgba(255,255,255,${0.34 * fade})`)
    deep.addColorStop(0.55, `rgba(255,255,255,${0.09 * fade})`)
    deep.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = deep
    ctx.fillRect(-h, -h * 1.1, h * 2, h * 1.2)
    // Bubbles suspended in it, drifting up.
    ctx.globalAlpha = 0.3 * fade
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(0.6, h * 0.006)
    for (let i = 0; i < 5; i++) {
      const bx = (noiseC(i, seed) - 0.5) * h * 0.5
      const drift = ((t / 2600) + i / 5) % 1
      const by = -h * (0.08 + drift * 0.6)
      const br = h * (0.012 + 0.022 * noiseC(i + 9, seed))
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, TAU)
      ctx.stroke()
    }
    ctx.globalAlpha = fade
  } else if (c.shape === 'golem') {
    // Chalk: flat planes that snap from light to dark, and dust in the grain.
    ctx.fillStyle = 'rgba(255,255,255,0.13)'
    ctx.beginPath()
    ctx.moveTo(-h * 0.42, -h * 0.58)
    ctx.lineTo(-h * 0.2, -h * 0.8)
    ctx.lineTo(-h * 0.04, -h * 0.8)
    ctx.lineTo(-h * 0.3, -h * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(8,4,20,0.2)'
    ctx.beginPath()
    ctx.moveTo(h * 0.16, -h * 0.8)
    ctx.lineTo(h * 0.42, -h * 0.58)
    ctx.lineTo(h * 0.35, 0)
    ctx.lineTo(h * 0.1, 0)
    ctx.closePath()
    ctx.fill()
    grain(ctx, -h * 0.5, -h * 0.9, h, h, seed, 0.1)
  } else if (c.shape === 'bat') {
    grain(ctx, -h * 0.45, -h * 0.85, h * 0.9, h * 0.9, seed, 0.06)
    // Fur: short strokes all round the silhouette, inside the clip, so the
    // outline stops being a drawn line and starts being an animal.
    ctx.globalAlpha = 0.34 * fade
    ctx.strokeStyle = shadeC(c.body, -0.5)
    ctx.lineCap = 'round'
    ctx.filter = `blur(${Math.max(0.4, h * 0.005)}px)`
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU + noiseC(i, seed) * 0.08
      const rx = h * 0.31, ry = h * 0.36
      const x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry
      // Uneven lengths and weights. Forty identical spikes at even spacing is
      // stitching round the edge of a cushion, which is what the first pass at
      // this looked like.
      const k = 0.88 + 0.07 * noiseC(i + 4, seed)
      ctx.lineWidth = Math.max(0.5, h * (0.005 + 0.004 * noiseC(i + 11, seed)))
      ctx.beginPath()
      ctx.moveTo(x0 * k, -h * 0.42 + y0 * k)
      ctx.lineTo(x0 * 1.01, -h * 0.42 + y0 * 1.01)
      ctx.stroke()
    }
    ctx.filter = 'none'
    ctx.globalAlpha = fade
  } else {
    grain(ctx, -h * 0.5, -h * 0.9, h, h * 0.95, seed, 0.07)
    // Soot, in three soft patches rather than a pattern.
    ctx.globalAlpha = 0.22 * fade
    ctx.fillStyle = '#2a1008'
    ctx.filter = `blur(${Math.max(1, h * 0.02)}px)`
    for (const [bx, by, br] of [[-0.22, -0.62, 0.1], [0.26, -0.5, 0.08], [-0.05, -0.2, 0.12]]) {
      ctx.beginPath()
      ctx.ellipse(h * bx, h * by, h * br, h * br * 0.7, 0.4, 0, TAU)
      ctx.fill()
    }
    ctx.filter = 'none'
    ctx.globalAlpha = fade
    // An ember burning somewhere inside it.
    const emb = ctx.createRadialGradient(0, -h * 0.2, h * 0.01, 0, -h * 0.2, h * 0.3)
    emb.addColorStop(0, `rgba(255,170,60,${(0.22 + 0.08 * Math.sin(t / 600)) * fade})`)
    emb.addColorStop(1, 'rgba(255,120,30,0)')
    ctx.fillStyle = emb
    ctx.fillRect(-h, -h * 0.9, h * 2, h)
  }

  // The rim light, last and along the lit edge only. Same trick as the robes:
  // it is what stops a silhouette reading as a sticker on the background.
  ctx.filter = `blur(${Math.max(0.6, h * 0.01)}px)`
  ctx.strokeStyle = `rgba(255,255,255,${0.3 * fade})`
  ctx.lineWidth = Math.max(1, h * 0.022)
  ctx.save()
  ctx.translate(h * 0.012, h * 0.012)
  body()
  ctx.stroke()
  ctx.restore()
  ctx.restore()
}

/** Cheap deterministic noise, so a creature's blemishes stay put frame to frame. */
function noiseC(a, b) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}
