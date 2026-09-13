// --- Nest crests --------------------------------------------------------------
// A heater shield with an eagle's head on it, drawn the same way as everything
// else here: pure canvas from the numbers in game/nests.js, so a crest costs a
// config block and there is nothing to host and nothing to license.
//
// The four birds have to be told apart at 44px on a hub card, which rules out
// plumage detail. What survives at that size is silhouette, so that is what
// carries the difference: how far the nape feathers flare (a harpy's split
// crest against a bald eagle's smooth skull), how heavy the brow sits, and the
// colour of the beak. Everything else is shared.

const TAU = Math.PI * 2

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const f = c => clamp(Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt), 0, 255)
  return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]
    .map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * The shield outline, as a path on the current context.
 * Width `w`, height `h`, centred on (0,0) horizontally with 0 at the top.
 */
function shieldPath(ctx, w, h) {
  const hw = w / 2, r = w * 0.10
  ctx.beginPath()
  ctx.moveTo(-hw + r, 0)
  ctx.lineTo(hw - r, 0)
  ctx.quadraticCurveTo(hw, 0, hw, r)          // squared-off top corners
  ctx.lineTo(hw, h * 0.46)
  // Sides sweep in to a rounded point at the bottom.
  ctx.bezierCurveTo(hw, h * 0.78, hw * 0.60, h * 0.95, 0, h)
  ctx.bezierCurveTo(-hw * 0.60, h * 0.95, -hw, h * 0.78, -hw, h * 0.46)
  ctx.lineTo(-hw, r)
  ctx.quadraticCurveTo(-hw, 0, -hw + r, 0)
  ctx.closePath()
}

/**
 * Draw a nest crest.
 *
 * @param o.x,o.y  top-centre of the shield
 * @param o.w      shield width; height follows at 1.22x
 * @param o.nest   an entry from game/nests.js
 * @param o.t      time in ms, for the slow highlight drift (optional)
 */
export function drawCrest(ctx, o) {
  const { x, y, w, nest: n, t = 0 } = o
  if (!n) return
  const h = w * 1.22

  ctx.save()
  ctx.translate(x, y)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // ── Field ──────────────────────────────────────────────────────────────────
  ctx.save()
  shieldPath(ctx, w, h)
  ctx.clip()

  const g = ctx.createLinearGradient(-w * 0.4, 0, w * 0.5, h)
  g.addColorStop(0, shade(n.shield, 0.22))
  g.addColorStop(0.55, n.shield)
  g.addColorStop(1, shade(n.shield, -0.30))
  ctx.fillStyle = g
  ctx.fillRect(-w, -h * 0.1, w * 2, h * 1.3)

  // A single diagonal sheen, so the shield reads as a curved surface.
  const sheen = ctx.createLinearGradient(-w * 0.5, 0, w * 0.1, h * 0.7)
  sheen.addColorStop(0, 'rgba(255,255,255,.22)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(-w, -h * 0.1, w * 2, h * 1.3)

  // The chief: a band across the top, the way a real crest carries a motto.
  ctx.fillStyle = 'rgba(0,0,0,.18)'
  ctx.fillRect(-w, 0, w * 2, h * 0.115)

  drawEagle(ctx, w, h, n, t)

  // Inner shadow around the rim, to seat the bird inside the shield.
  ctx.strokeStyle = 'rgba(0,0,0,.30)'
  ctx.lineWidth = w * 0.075
  shieldPath(ctx, w, h)
  ctx.stroke()
  ctx.restore()

  // ── Border ─────────────────────────────────────────────────────────────────
  shieldPath(ctx, w, h)
  ctx.strokeStyle = n.trim
  ctx.lineWidth = Math.max(1.2, w * 0.062)
  ctx.stroke()

  shieldPath(ctx, w * 0.86, h * 0.88)
  ctx.save()
  ctx.translate(0, h * 0.055)
  ctx.strokeStyle = 'rgba(255,255,255,.30)'
  ctx.lineWidth = Math.max(0.6, w * 0.018)
  shieldPath(ctx, w * 0.86, h * 0.86)
  ctx.stroke()
  ctx.restore()

  ctx.restore()
}

/**
 * The head, in profile, facing left — the heraldic convention and the one angle
 * where a hooked beak and a brow ridge do all the work.
 */
function drawEagle(ctx, w, h, n, t) {
  const cx = w * 0.10, cy = h * 0.50          // the eye sits near the shield's centre
  const R = w * 0.245                         // skull radius
  const ink = n.ink
  const line = Math.max(1, w * 0.032)

  ctx.save()
  ctx.translate(cx, cy)

  /** One feather: a leaf swept back from `base` along `a`. */
  const feather = (bx, by, a, len, wide, fill) => {
    const nx = -Math.sin(a) * wide, ny = Math.cos(a) * wide
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len
    ctx.beginPath()
    ctx.moveTo(bx + nx, by + ny)
    ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.62 + nx * 0.7,
                         by + Math.sin(a) * len * 0.62 + ny * 0.7, tx, ty)
    ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.62 - nx * 0.7,
                         by + Math.sin(a) * len * 0.62 - ny * 0.7, bx - nx, by - ny)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = ink
    ctx.lineWidth = line * 0.7
    ctx.stroke()
  }

  // ── Crown feathers ─────────────────────────────────────────────────────────
  // The harpy's double crest stands straight up; the bald eagle has almost
  // nothing. This is the difference you can still see at badge size.
  if (n.crest > 0.05) {
    const up = R * (0.34 + n.crest * 0.90)
    feather(-R * 0.04, -R * 0.70, -1.46, up, R * 0.21, n.nape)
    if (n.crest > 0.5) feather(R * 0.34, -R * 0.62, -1.08, up * 0.88, R * 0.19, shade(n.nape, -0.12))
  }

  // ── Nape feathers ──────────────────────────────────────────────────────────
  // Swept back and down off the skull — a ruff, not a sunburst.
  for (let i = 0; i < 4; i++) {
    const f = i / 3
    const a = -0.34 + f * 1.24
    const bx = Math.cos(a) * R * 0.74, by = Math.sin(a) * R * 0.74
    feather(bx, by, a, R * (0.56 - f * 0.10), R * (0.22 - f * 0.04),
            i % 2 ? n.nape : shade(n.nape, -0.12))
  }

  // ── Skull ──────────────────────────────────────────────────────────────────
  // A wedge: flat across the crown, widest at the back, tapering forward into
  // the beak and down into the throat. A circle here reads as an owl.
  ctx.beginPath()
  ctx.moveTo(-R * 0.86, -R * 0.34)                                   // brow, above the beak
  ctx.bezierCurveTo(-R * 0.66, -R * 0.86, R * 0.14, -R * 0.96, R * 0.64, -R * 0.56)
  ctx.bezierCurveTo(R * 1.00, -R * 0.24, R * 0.98, R * 0.42, R * 0.62, R * 0.80)
  ctx.bezierCurveTo(R * 0.26, R * 1.14, -R * 0.34, R * 0.96, -R * 0.62, R * 0.46)
  ctx.bezierCurveTo(-R * 0.76, R * 0.20, -R * 0.90, R * 0.00, -R * 0.86, -R * 0.34)
  ctx.closePath()
  const hg = ctx.createLinearGradient(-R * 0.6, -R, R * 0.9, R)
  hg.addColorStop(0, shade(n.head, 0.18))
  hg.addColorStop(0.55, n.head)
  hg.addColorStop(1, shade(n.head, -0.26))
  ctx.fillStyle = hg
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = line
  ctx.stroke()

  // ── Beak ───────────────────────────────────────────────────────────────────
  // Long, deep at the base, hooking to a point well below the jawline. This is
  // the shape that says "eagle" at any size, so it is given room.
  ctx.beginPath()
  ctx.moveTo(-R * 0.78, -R * 0.42)
  ctx.bezierCurveTo(-R * 1.36, -R * 0.40, -R * 1.74, -R * 0.02, -R * 1.62, R * 0.62)
  ctx.bezierCurveTo(-R * 1.58, R * 0.26, -R * 1.30, R * 0.10, -R * 0.96, R * 0.12)
  ctx.lineTo(-R * 0.74, R * 0.02)
  ctx.closePath()
  const bg = ctx.createLinearGradient(-R * 1.7, -R * 0.5, -R * 0.7, R * 0.6)
  bg.addColorStop(0, shade(n.beak, 0.34))
  bg.addColorStop(1, shade(n.beak, -0.30))
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = line
  ctx.stroke()

  // Lower mandible, a slim wedge tucked under the hook.
  ctx.beginPath()
  ctx.moveTo(-R * 0.76, R * 0.06)
  ctx.quadraticCurveTo(-R * 1.24, R * 0.18, -R * 1.14, R * 0.46)
  ctx.quadraticCurveTo(-R * 0.96, R * 0.34, -R * 0.70, R * 0.32)
  ctx.closePath()
  ctx.fillStyle = shade(n.beak, -0.36)
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = line * 0.8
  ctx.stroke()

  // The cere and one nostril — stops the beak reading as a flat wedge.
  ctx.beginPath()
  ctx.moveTo(-R * 0.80, -R * 0.40)
  ctx.quadraticCurveTo(-R * 1.02, -R * 0.30, -R * 1.04, R * 0.00)
  ctx.strokeStyle = 'rgba(0,0,0,.28)'
  ctx.lineWidth = line * 0.7
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-R * 0.94, -R * 0.18, Math.max(0.7, R * 0.08), 0, TAU)
  ctx.fillStyle = 'rgba(0,0,0,.50)'
  ctx.fill()

  // ── Eye ────────────────────────────────────────────────────────────────────
  const ex = -R * 0.26, ey = -R * 0.20, er = R * 0.26
  ctx.beginPath()
  ctx.arc(ex, ey, er, 0, TAU)
  ctx.fillStyle = '#fffaf0'
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = line * 0.7
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(ex - er * 0.14, ey + er * 0.04, er * 0.62, 0, TAU)
  ctx.fillStyle = n.eye
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ex - er * 0.16, ey + er * 0.06, er * 0.32, 0, TAU)
  ctx.fillStyle = '#140d04'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ex - er * 0.40, ey - er * 0.38, er * 0.19, 0, TAU)
  ctx.fillStyle = 'rgba(255,255,255,.95)'
  ctx.fill()

  // ── Brow ───────────────────────────────────────────────────────────────────
  // The shelf of bone that gives every eagle its glare: a wedge running from
  // the back of the head down over the eye toward the beak. Steepen it and the
  // bird scowls, level it and it merely watches — which is the whole difference
  // between a bald eagle and a sea eagle here.
  const dip = er * (0.04 + n.brow * 0.40)
  ctx.beginPath()
  ctx.moveTo(ex + er * 1.48, ey - er * 1.04)                    // thick at the skull
  ctx.quadraticCurveTo(ex + er * 0.10, ey - er * 1.42, ex - er * 1.92, ey - er * 0.62)
  ctx.quadraticCurveTo(ex - er * 1.30, ey - er * 0.62, ex - er * 1.74, ey - er * 0.40)
  ctx.quadraticCurveTo(ex - er * 0.30, ey - er * 0.94 + dip, ex + er * 1.52, ey - er * 0.52)
  ctx.closePath()
  ctx.fillStyle = shade(n.head, -0.40)                          // a shadow, not a line
  ctx.fill()
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = ink
  ctx.lineWidth = line * 0.55
  ctx.stroke()
  ctx.restore()

  ctx.restore()
}
