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
 *
 * What makes a mascot eagle read as an EAGLE rather than a bird:
 *
 *  - the nape is a mass of individual pointed feathers, layered like roof
 *    tiles, not a smooth outline with spikes stuck to it. This is most of the
 *    picture and nearly all of the character.
 *  - the eye is SMALL and hard, set close behind the beak. A big round eye with
 *    a highlight is a cartoon chick; the same head with a small almond eye
 *    under a heavy brow is a raptor.
 *  - the brow is a solid black wedge, not a grey bar floating over the eye.
 *  - the beak is long, deep at the cere, and hooks to a point BELOW the jaw,
 *    with the mouth line running back under the eye.
 *
 * Flat fills and hard ink, deliberately: this is heraldry on a badge that has
 * to survive being 44px wide, which is the opposite problem from the painted
 * faces and wants the opposite treatment.
 */
function drawEagle(ctx, w, h, n, t) {
  // Set so the beak clears the left edge and the ruff has room to spill to the
  // right without touching the border. The head is smaller than it looks: most
  // of the mass in the shield is feathers, which is true of the bird as well.
  const cx = w * 0.05, cy = h * 0.455
  const R = w * 0.225
  const ink = n.ink
  const line = Math.max(1.1, w * 0.030)

  ctx.save()
  ctx.translate(cx, cy)

  const stroke = (lw = 1) => {
    ctx.strokeStyle = ink
    ctx.lineWidth = line * lw
    ctx.stroke()
  }

  /**
   * One feather: a pointed leaf from `base`, swept along `a`, widest a third of
   * the way out. Drawn tip-last so a row of them overlaps like tiles.
   */
  const feather = (bx, by, a, len, wide, fill, lw = 0.62) => {
    const ca = Math.cos(a), sa = Math.sin(a)
    const nx = -sa * wide, ny = ca * wide
    ctx.beginPath()
    ctx.moveTo(bx + nx, by + ny)
    ctx.quadraticCurveTo(bx + ca * len * 0.55 + nx * 1.05, by + sa * len * 0.55 + ny * 1.05,
                         bx + ca * len, by + sa * len)
    ctx.quadraticCurveTo(bx + ca * len * 0.55 - nx * 1.05, by + sa * len * 0.55 - ny * 1.05,
                         bx - nx, by - ny)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    stroke(lw)
  }

  const dark = shade(n.nape, -0.18)

  // ── The crest ──────────────────────────────────────────────────────────────
  // A harpy wears two long feathers standing straight off the crown and splayed
  // apart; a golden eagle has a short stiff ruff; a bald eagle has none at all.
  // This is the one difference still legible at badge size, so it goes in first
  // and everything else is drawn over its roots.
  if (n.crest > 0.05) {
    const up = R * (0.28 + n.crest * 0.62)
    // Two kinds of crown, and the angle is the whole difference. A harpy's
    // stands straight off the skull and splays; a golden eagle's lies back
    // along the nape towards the tail, which is why hers looked wrong standing
    // up — she was wearing a harpy's hairstyle.
    const roots = n.lay
      ? [[R * 0.10, -R * 0.86], [R * 0.34, -R * 0.78], [R * 0.56, -R * 0.62]]
      : [[-R * 0.06, -R * 0.84], [R * 0.22, -R * 0.84], [R * 0.50, -R * 0.66]]
    const angles = n.lay ? [-0.98, -0.74, -0.50] : [-1.62, -1.34, -1.06]
    const lens = n.lay ? [0.86, 0.78, 0.66] : [1, 0.96, 0.82]
    for (let i = 0; i < 3; i++) {
      feather(roots[i][0], roots[i][1], angles[i], up * lens[i],
              R * (0.17 - i * 0.015), i === 1 ? dark : n.nape)
    }
  }

  // ── The nape ───────────────────────────────────────────────────────────────
  // Two rows sweeping from the crown round to the throat, the lower ones longer
  // so the ruff hangs rather than radiating. Back row first, in the darker
  // tone, so the front row reads as sitting on top of it.
  const ruff = (r0, lenK, wideK, tone, lw, count = 8) => {
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1)
      const a = -0.78 + f * 2.08                    // where on the skull it grows
      // Where it POINTS is not where it grows. Feathers laid back along the
      // neck all sweep the same way, towards the shoulder; letting each one
      // point straight out from the skull turns the ruff into a sunburst, and
      // the bird into a lion.
      const dir = a * 0.55 + 0.12
      const bx = Math.cos(a) * R * r0, by = Math.sin(a) * R * r0
      const len = R * lenK * (0.78 + 0.46 * Math.sin(Math.PI * f))
      feather(bx, by, dir, len, R * wideK * (1 - f * 0.22),
              i % 2 ? tone : shade(tone, -0.1), lw)
    }
  }
  // Rooted OUTSIDE the skull, or the whole ruff hides behind it — which is
  // exactly what the first attempt did, leaving a bald head with a few spikes.
  // Fewer, chunkier feathers on a small badge. Ten feathers and two rows is a
  // texture at 150px and a smudge at 44px, where the outlines alone are wider
  // than the gaps between them.
  const small = w < 64
  ruff(1.08, 0.56, small ? 0.22 : 0.17, shade(n.nape, -0.34), 0.5, small ? 6 : 10)
  if (!small) ruff(0.90, 0.48, 0.16, n.nape, 0.55, 9)

  // ── Skull ──────────────────────────────────────────────────────────────────
  // Flat along the crown, deepest at the back, tapering into the beak. The
  // throat runs down and forward so the ruff appears to grow out of it.
  ctx.beginPath()
  ctx.moveTo(-R * 0.92, -R * 0.30)
  ctx.bezierCurveTo(-R * 0.70, -R * 0.96, R * 0.20, -R * 1.06, R * 0.72, -R * 0.52)
  ctx.bezierCurveTo(R * 1.02, -R * 0.14, R * 0.94, R * 0.48, R * 0.52, R * 0.86)
  ctx.bezierCurveTo(R * 0.10, R * 1.14, -R * 0.44, R * 0.86, -R * 0.66, R * 0.40)
  ctx.bezierCurveTo(-R * 0.82, R * 0.14, -R * 0.96, -R * 0.02, -R * 0.92, -R * 0.30)
  ctx.closePath()
  const hg = ctx.createLinearGradient(-R * 0.6, -R, R * 0.9, R)
  hg.addColorStop(0, shade(n.head, 0.16))
  hg.addColorStop(0.58, n.head)
  hg.addColorStop(1, shade(n.head, -0.22))
  ctx.fillStyle = hg
  ctx.fill()
  stroke(1)

  // A few feather marks where the skull meets the ruff, so the join is not a
  // bare edge. Short strokes, curving back: barbs, not scratches.
  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.strokeStyle = shade(n.head, -0.45)
  ctx.lineWidth = line * 0.45
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * 0.44
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * R * 0.30, Math.sin(a) * R * 0.30 + R * 0.1)
    ctx.quadraticCurveTo(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56 + R * 0.12,
                         Math.cos(a + 0.2) * R * 0.74, Math.sin(a + 0.2) * R * 0.74 + R * 0.1)
    ctx.stroke()
  }
  ctx.restore()

  // ── Beak ───────────────────────────────────────────────────────────────────
  const bx0 = -R * 0.80, by0 = -R * 0.40
  ctx.beginPath()
  ctx.moveTo(bx0, by0)
  ctx.bezierCurveTo(-R * 1.42, -R * 0.42, -R * 1.86, R * 0.06, -R * 1.70, R * 0.80)   // down to the hook
  ctx.bezierCurveTo(-R * 1.66, R * 0.32, -R * 1.34, R * 0.12, -R * 0.98, R * 0.14)    // back under
  ctx.lineTo(-R * 0.72, R * 0.02)
  ctx.closePath()
  const bg = ctx.createLinearGradient(-R * 1.8, -R * 0.5, -R * 0.7, R * 0.7)
  bg.addColorStop(0, shade(n.beak, 0.30))
  bg.addColorStop(0.6, n.beak)
  bg.addColorStop(1, shade(n.beak, -0.34))
  ctx.fillStyle = bg
  ctx.fill()
  stroke(1)

  // Lower mandible, tucked under the hook.
  ctx.beginPath()
  ctx.moveTo(-R * 0.74, R * 0.06)
  ctx.quadraticCurveTo(-R * 1.34, R * 0.22, -R * 1.22, R * 0.54)
  ctx.quadraticCurveTo(-R * 1.00, R * 0.38, -R * 0.66, R * 0.34)
  ctx.closePath()
  ctx.fillStyle = shade(n.beak, -0.38)
  ctx.fill()
  stroke(0.8)

  // The mouth line, running back past the eye. Half the scowl is here: it puts
  // a hard horizontal under the eye that the brow can close against.
  ctx.beginPath()
  ctx.moveTo(-R * 1.28, R * 0.20)
  ctx.quadraticCurveTo(-R * 0.96, R * 0.10, -R * 0.52, R * 0.02)
  stroke(0.75)

  // Cere and nostril.
  ctx.beginPath()
  ctx.moveTo(-R * 0.84, -R * 0.38)
  ctx.quadraticCurveTo(-R * 1.08, -R * 0.26, -R * 1.10, R * 0.04)
  ctx.save()
  ctx.globalAlpha = 0.34
  stroke(0.7)
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(-R * 0.99, -R * 0.16, Math.max(0.8, R * 0.09), Math.max(0.6, R * 0.06), -0.4, 0, TAU)
  ctx.fillStyle = 'rgba(0,0,0,.55)'
  ctx.fill()

  // ── Eye ────────────────────────────────────────────────────────────────────
  // Small, almond, tipped down towards the beak.
  const ex = -R * 0.34, ey = -R * 0.20, er = R * 0.20
  ctx.save()
  ctx.translate(ex, ey)
  ctx.rotate(0.22)
  ctx.beginPath()
  ctx.moveTo(-er * 1.25, 0)
  ctx.quadraticCurveTo(-er * 0.2, -er * 0.92, er * 1.2, -er * 0.16)
  ctx.quadraticCurveTo(er * 0.1, er * 0.78, -er * 1.25, 0)
  ctx.closePath()
  ctx.fillStyle = '#fdf7e8'
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.beginPath()
  ctx.arc(-er * 0.12, -er * 0.04, er * 0.72, 0, TAU)
  ctx.fillStyle = n.eye
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-er * 0.18, 0, er * 0.40, 0, TAU)
  ctx.fillStyle = '#120b03'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-er * 0.42, -er * 0.34, er * 0.16, 0, TAU)
  ctx.fillStyle = 'rgba(255,255,255,.9)'
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(-er * 1.25, 0)
  ctx.quadraticCurveTo(-er * 0.2, -er * 0.92, er * 1.2, -er * 0.16)
  ctx.quadraticCurveTo(er * 0.1, er * 0.78, -er * 1.25, 0)
  ctx.closePath()
  stroke(0.6)
  ctx.restore()

  // ── Brow ───────────────────────────────────────────────────────────────────
  // A solid wedge of ink from the back of the skull, over the eye, down to a
  // point at the cere. `brow` sets how far it dips over the eye, which is the
  // whole difference between a bald eagle's glare and a sea eagle's stare.
  const dip = er * (0.12 + n.brow * 0.52)
  ctx.beginPath()
  ctx.moveTo(ex + er * 1.90, ey - er * 1.30)
  ctx.quadraticCurveTo(ex + er * 0.20, ey - er * 1.80, ex - er * 2.30, ey - er * 0.52)
  ctx.quadraticCurveTo(ex - er * 1.10, ey - er * 0.42 - dip * 0.2, ex - er * 0.20, ey - er * 0.70 + dip)
  ctx.quadraticCurveTo(ex + er * 1.05, ey - er * 1.02, ex + er * 1.94, ey - er * 0.64)
  ctx.closePath()
  ctx.fillStyle = shade(n.ink, 0.06)
  ctx.fill()

  ctx.restore()
}
