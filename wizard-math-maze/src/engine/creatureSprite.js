// --- Procedural creatures -----------------------------------------------------
// Drawn the same way as the wizards: pure canvas from a handful of data fields,
// so a new creature costs a config line and there is nothing to host.

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

  if (c.wings) {
    const flap = Math.sin(t / 150) * 0.5
    for (const sgn of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sgn * h * 0.2, -h * 0.45)
      ctx.quadraticCurveTo(sgn * h * (0.72 + flap * 0.1), -h * (0.72 + flap * 0.12), sgn * h * 0.62, -h * 0.28)
      ctx.quadraticCurveTo(sgn * h * 0.44, -h * 0.34, sgn * h * 0.2, -h * 0.32)
      ctx.closePath()
      ctx.fillStyle = shadeC(c.body, -0.35)
      ctx.fill()
    }
  }

  // Body
  ctx.beginPath()
  if (c.shape === 'slime') {
    ctx.moveTo(-h * 0.45, 0)
    ctx.quadraticCurveTo(-h * 0.5, -h * 0.7, 0, -h * 0.72)
    ctx.quadraticCurveTo(h * 0.5, -h * 0.7, h * 0.45, 0)
    ctx.closePath()
  } else if (c.shape === 'golem') {
    ctx.moveTo(-h * 0.34, 0)
    ctx.lineTo(-h * 0.4, -h * 0.62)
    ctx.lineTo(-h * 0.18, -h * 0.78)
    ctx.lineTo(h * 0.18, -h * 0.78)
    ctx.lineTo(h * 0.4, -h * 0.62)
    ctx.lineTo(h * 0.34, 0)
    ctx.closePath()
  } else if (c.shape === 'bat') {
    ctx.ellipse(0, -h * 0.42, h * 0.27, h * 0.34, 0, 0, TAU)
  } else {
    ctx.moveTo(-h * 0.3, 0)
    ctx.quadraticCurveTo(-h * 0.42, -h * 0.5, -h * 0.16, -h * 0.72)
    ctx.quadraticCurveTo(0, -h * 0.86, h * 0.16, -h * 0.72)
    ctx.quadraticCurveTo(h * 0.42, -h * 0.5, h * 0.3, 0)
    ctx.closePath()
  }
  const bg = ctx.createLinearGradient(-h * 0.4, 0, h * 0.4, -h * 0.7)
  bg.addColorStop(0, shadeC(c.body, -0.35))
  bg.addColorStop(0.5, c.body)
  bg.addColorStop(1, shadeC(c.body, 0.2))
  ctx.fillStyle = bg
  ctx.fill()

  if (c.horns) {
    for (const sgn of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sgn * h * 0.13, -h * 0.7)
      ctx.quadraticCurveTo(sgn * h * 0.3, -h * 0.86, sgn * h * 0.2, -h * 1.0)
      ctx.quadraticCurveTo(sgn * h * 0.17, -h * 0.83, sgn * h * 0.07, -h * 0.72)
      ctx.closePath()
      ctx.fillStyle = c.accent
      ctx.fill()
    }
  }

  // Eyes
  const eyeY = -h * 0.5
  const spread = c.eyes === 1 ? [0] : c.eyes === 2 ? [-h * 0.11, h * 0.11] : [-h * 0.15, 0, h * 0.15]
  for (const ex of spread) {
    ctx.beginPath(); ctx.arc(ex, eyeY, h * (c.eyes === 1 ? 0.1 : 0.062), 0, TAU)
    ctx.fillStyle = '#fffbe8'; ctx.fill()
    const look = Math.sin(t / 700) * h * 0.014
    ctx.beginPath(); ctx.arc(ex + look, eyeY + h * 0.006, h * (c.eyes === 1 ? 0.045 : 0.028), 0, TAU)
    ctx.fillStyle = '#1a0e08'; ctx.fill()
  }

  // Mouth — a grin that flattens when hurt.
  ctx.strokeStyle = shadeC(c.body, -0.6)
  ctx.lineWidth = Math.max(1.2, h * 0.016)
  ctx.beginPath()
  ctx.arc(0, -h * 0.33, h * 0.1, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()

  if (hit > 0.05) {
    ctx.globalAlpha = hit * 0.8 * fade
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(0, -h * 0.4, h * 0.5, 0, TAU); ctx.fill()
  }
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
