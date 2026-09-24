// --- Painted portraits --------------------------------------------------------
// A second renderer, for the screens where you are looking a wizard in the face.
//
// The maze figure cannot do this job. It is drawn from behind, small, sixty
// times a second, at whatever scale the corridor puts it — so it has to be
// cheap and it has to work at 40px. This one is the opposite: chest-up, one
// wizard, redrawn only when something changes, at 150-400px. Different
// constraints, so a different renderer, and the split falls where it should —
// nobody is studying a face in the maze.
//
// What separates a painted face from a drawn one, in rough order of payoff:
//
//  1. NO UNIFORM OUTLINES. A single-weight contour round every shape is the
//     loudest cartoon signal there is. Form is carried by shading here; where
//     an edge is needed it is soft, and it varies.
//  2. Big, soft, overlapping shadows — temple, cheekbone, under the jaw, either
//     side of the nose. Far more than feels reasonable. This is most of it.
//  3. Warm and cool, not light and dark. Skin is translucent: it goes WARM
//     where it is thin and where light passes through (ears, nose, cheeks,
//     lower eyelid) and cool-grey where it turns away. One hue lightened and
//     darkened reads as plastic however well it is shaded.
//  4. A rim of light along the shadow edge, which is what makes a head read as
//     a solid thing sitting in a space rather than a shape on a background.
//  5. Hair as overlapping locks with their own shading, not a silhouette with
//     lines scratched into it.
//  6. A little grain over everything. Almost free, and it does more for
//     "painted rather than vector" than any amount of extra geometry.

import { paletteFor } from '../game/wizards.js'
import { drawTrinkets } from './trinkets.js'

const TAU = Math.PI * 2

/** Deterministic noise — texture must not crawl between frames. */
function noise(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)

function parse(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex))
  if (!m) return [128, 128, 128]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgba(hex, a) {
  const [r, g, b] = parse(hex)
  return `rgba(${r},${g},${b},${a})`
}
function shade(hex, amt) {
  const ch = parse(hex).map(v => {
    const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)
    return Math.max(0, Math.min(255, Math.round(out)))
  })
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}
function mix(a, b, t) {
  const pa = parse(a), pb = parse(b)
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}

/**
 * A soft blob of colour, clipped to a shape.
 *
 * Every piece of modelling on this face is one of these. There is no line work
 * to speak of — a cheekbone is a warm smear that fades out, a temple is a cool
 * one. Drawn generously and at low alpha they build up the way paint does.
 */
function blob(ctx, cx, cy, rx, ry, rot, color, alpha) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, rgba(color, alpha))
  g.addColorStop(0.55, rgba(color, alpha * 0.45))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/**
 * Canvas grain.
 *
 * The cheapest trick in here by a distance. A perfectly smooth gradient is a
 * computer's idea of a surface; a slightly broken one is a painted one. Kept
 * faint enough that you would not name it if asked what changed.
 */
const TILE = 64
const grainTiles = new Map()

/**
 * The grain, baked once into a small tile and then repeated.
 *
 * It used to be drawn a rectangle at a time, every frame — around six thousand
 * fill calls per grained shape. With one grain pass on the face that was
 * invisible; with grain on the face, the collar, the hat, the brim, the band
 * and the robe it more than doubled the cost of drawing a wizard, and the hub
 * portrait runs this sixty times a second. The noise never changes, so the only
 * honest place for it is a cache.
 */
function grainTile(seed, step) {
  const key = `${seed}|${step}`
  const hit = grainTiles.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = TILE * step
  const g = c.getContext('2d')
  for (let gy = 0; gy < TILE; gy++) {
    for (let gx = 0; gx < TILE; gx++) {
      const n = noise(gx * step * 0.7 + seed, gy * step * 0.7)
      if (n < 0.5) continue
      g.fillStyle = n > 0.82 ? '#ffffff' : '#1a1024'
      g.fillRect(gx * step, gy * step, step * 0.9, step * 0.9)
    }
  }
  grainTiles.set(key, c)
  return c
}

export function grain(ctx, x, y, w, h, seed, alpha = 0.03) {
  const step = Math.max(2, Math.round(w / 110))
  ctx.save()
  ctx.globalAlpha = alpha
  if (typeof document === 'undefined') {
    // No DOM to bake a tile into (a test harness, a server render): fall back
    // to the slow path rather than losing the texture.
    for (let gy = y; gy < y + h; gy += step) {
      for (let gx = x; gx < x + w; gx += step) {
        const n = noise(gx * 0.7 + seed, gy * 0.7)
        if (n < 0.5) continue
        ctx.fillStyle = n > 0.82 ? '#ffffff' : '#1a1024'
        ctx.fillRect(gx, gy, step * 0.9, step * 0.9)
      }
    }
  } else {
    ctx.translate(x, y)
    ctx.fillStyle = ctx.createPattern(grainTile(seed, step), 'repeat')
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

/**
 * @param ctx    canvas 2D context
 * @param o.cx   horizontal centre
 * @param o.cy   vertical centre of the HEAD (not the picture)
 * @param o.R    head radius in pixels — everything else is a fraction of it
 * @param o.wiz  a WIZARDS entry — her SHAPE
 * @param o.skin a SKIN_PALETTES entry — her colour, which is the child's choice
 * @param o.eye  iris colour, #rrggbb
 * @param o.hair hair colour, #rrggbb
 * @param o.form a FORMS entry, for the robe and hat colours
 * @param o.t    milliseconds, for the faintest idle motion
 */
export function drawPortrait(ctx, o) {
  drawHead(ctx, o)
}

/**
 * The same painted head, with the chest-up furniture made optional.
 *
 * The full-figure sprite already has a neck, a collar and shoulders of its own,
 * drawn to ITS proportions — so when the wardrobe and the rank-up screen want
 * this face on that body, they ask for the head alone and drop it onto the
 * figure. One face rig, two framings; a wizard cannot end up with a different
 * nose depending on which screen she is standing on.
 *
 * @param o.neck      draw the throat (off when the caller has its own)
 * @param o.shoulders draw the robed chest (ditto)
 * @param o.breathe   the slow idle rise (off when the body already bobs, or the
 *                    head floats a pixel away from the neck it is sitting in)
 */
export function drawHead(ctx, o) {
  const {
    cx, cy, R, wiz, skin, eye = '#5b3a24', hair = '#6b4326', form, t = 0,
    neck = true, shoulders = true, breathe: breathing = true, trinkets,
  } = o
  if (!wiz) return
  // Fall back to her usual tone rather than bailing. A missing palette used to
  // return silently, which meant one forgetful caller got a blank canvas and no
  // error — the kind of failure you find by screenshot three days later.
  const sk = skin || paletteFor(wiz.skin)
  const robe = form?.robe || '#6f6fae'
  const trim = form?.trim || '#cfcff0'
  const H = wiz.head
  const breathe = breathing ? Math.sin(t / 2600) * R * 0.012 : 0

  ctx.save()
  ctx.translate(cx, cy + breathe)
  ctx.rotate(H.tilt || 0)

  // ── The head's outline, as one path everything else clips to ──
  const headPath = () => {
    const W = R * H.w, C = R * H.cheek, J = R * H.jaw, CH = R * H.chin
    ctx.beginPath()
    ctx.moveTo(0, -R * 1.02)
    // temple → cheekbone → jaw → chin, right side
    ctx.bezierCurveTo(W * 0.92, -R * 1.0, C * 1.02, -R * 0.12, C * 0.86, R * 0.42)
    ctx.bezierCurveTo(J * 1.22, R * 0.82, J * 0.86, CH * 0.88, 0, CH)
    ctx.bezierCurveTo(-J * 0.86, CH * 0.88, -J * 1.22, R * 0.82, -C * 0.86, R * 0.42)
    ctx.bezierCurveTo(-C * 1.02, -R * 0.12, -W * 0.92, -R * 1.0, 0, -R * 1.02)
    ctx.closePath()
  }

  drawHairBack(ctx, R, wiz, hair)
  if (neck) drawNeck(ctx, R, wiz, sk)
  if (shoulders) drawShoulders(ctx, R, wiz, robe, trim)
  drawEars(ctx, R, wiz, sk)

  // ── Skin ──
  headPath()
  ctx.fillStyle = sk.base
  ctx.fill()

  ctx.save()
  headPath()
  ctx.clip()
  modelFace(ctx, R, wiz, sk)
  ctx.restore()

  drawEyes(ctx, R, wiz, sk, eye)
  drawBrows(ctx, R, wiz, hair)
  drawNose(ctx, R, wiz, sk)
  drawMouth(ctx, R, wiz, sk)

  // Rim light down the shadow side, clipped to the head so it hugs the edge.
  // This is what stops a head reading as a cut-out.
  ctx.save()
  headPath()
  ctx.clip()
  const rim = ctx.createLinearGradient(R * 0.55, 0, R * 1.05, 0)
  rim.addColorStop(0, rgba(sk.lit, 0))
  rim.addColorStop(1, rgba(sk.lit, 0.5))
  ctx.fillStyle = rim
  ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.8)
  ctx.restore()

  drawHairFront(ctx, R, wiz, hair)
  if (form?.hat && form.hat !== 'none') drawHat(ctx, R, wiz, form.hat, robe, trim, t)

  // What she bought herself, over the top of what she was given. A headband
  // goes over hair and a pendant hangs over a collar, so this is last.
  drawTrinkets(ctx, { R, ids: trinkets, wiz, form, t })

  grain(ctx, -R * 2.0, -R * 2.6, R * 4.0, R * 5.2, (wiz.id || '').length * 13 + 7)
  ctx.restore()
}

/**
 * Everything that makes the skin look like skin, painted inside the silhouette.
 *
 * The order matters: broad cool shadow first to establish which way the head
 * turns, then the warm places, then the small dark ones where forms meet.
 */
function modelFace(ctx, R, wiz, sk) {
  const H = wiz.head

  // The whole right side falls away from the light.
  const side = ctx.createLinearGradient(-R * 0.15, 0, R * 1.05, 0)
  side.addColorStop(0, rgba(sk.shadow, 0))
  side.addColorStop(1, rgba(sk.shadow, 0.72))
  ctx.fillStyle = side
  ctx.fillRect(-R * 1.2, -R * 1.3, R * 2.4, R * 2.9)

  // Under the brow, where the eye socket sits back into the skull.
  blob(ctx, -R * 0.40, -R * 0.08, R * 0.46, R * 0.30, -0.10, sk.shadow, 0.34)
  blob(ctx, R * 0.40, -R * 0.08, R * 0.46, R * 0.30, 0.10, sk.shadow, 0.40)

  // The brow ridge: a shelf of bone above the eyes that throws its own shadow.
  // Heavier on some faces than others, and the clearest structural difference
  // between a face that reads masculine and one that does not — the one cue
  // that still works when the hair is hidden under a hat.
  if (H.ridge) {
    for (const s of [-1, 1]) {
      blob(ctx, s * R * 0.42, -R * 0.30, R * 0.42, R * 0.13, s * 0.06, sk.shadow, 0.34 * H.ridge)
    }
    blob(ctx, 0, -R * 0.34, R * 0.26, R * 0.10, 0, sk.shadow, 0.2 * H.ridge)
  }

  // Temples, drawing the top of the skull in.
  blob(ctx, -R * 0.82, -R * 0.52, R * 0.34, R * 0.44, 0, sk.shadow, 0.30)
  blob(ctx, R * 0.82, -R * 0.52, R * 0.34, R * 0.44, 0, sk.shadow, 0.38)

  // Cheekbones: warm, because the skin is thin and close to the bone there.
  blob(ctx, -R * 0.56, R * 0.30, R * 0.40, R * 0.27, -0.22, sk.warm, 0.30)
  blob(ctx, R * 0.56, R * 0.30, R * 0.40, R * 0.27, 0.22, sk.warm, 0.24)

  // The hollow under the cheekbone, which is what gives a face any structure
  // at all. Subtle on a child — but not absent, which is what "doll" means.
  blob(ctx, -R * 0.62, R * 0.58, R * 0.30, R * 0.20, -0.30, sk.shadow, 0.22)
  blob(ctx, R * 0.62, R * 0.58, R * 0.30, R * 0.20, 0.30, sk.shadow, 0.28)

  // Chin: a lit ball with a crease above it.
  blob(ctx, 0, R * (H.chin - 0.30), R * 0.26, R * 0.18, 0, sk.lit, 0.22)
  blob(ctx, 0, R * (H.chin - 0.52), R * 0.20, R * 0.09, 0, sk.shadow, 0.24)

  // The light itself, broad across the forehead and the near cheek.
  blob(ctx, -R * 0.30, -R * 0.58, R * 0.58, R * 0.38, -0.12, sk.lit, 0.30)
  blob(ctx, -R * 0.44, R * 0.18, R * 0.30, R * 0.26, 0, sk.lit, 0.16)

  // Where the jaw turns under. Deep, and warm rather than grey — an edge of
  // skin with light coming through it is never neutral.
  const jawG = ctx.createLinearGradient(0, R * (H.chin - 0.42), 0, R * (H.chin + 0.12))
  jawG.addColorStop(0, rgba(sk.deep, 0))
  jawG.addColorStop(1, rgba(sk.deep, 0.5))
  ctx.fillStyle = jawG
  ctx.fillRect(-R * 1.2, R * (H.chin - 0.42), R * 2.4, R * 0.6)
}

function drawNeck(ctx, R, wiz, sk) {
  const H = wiz.head
  const N = wiz.neck || { top: 0.36, bot: 0.56 }
  const top = R * (H.chin - 0.45)
  const bot = R * 2.05
  const halfTop = R * N.top, halfBot = R * N.bot
  ctx.beginPath()
  ctx.moveTo(-halfTop, top)
  ctx.bezierCurveTo(-halfTop * 1.02, top + (bot - top) * 0.5, -halfBot * 0.9, bot - (bot - top) * 0.2, -halfBot, bot)
  ctx.lineTo(halfBot, bot)
  ctx.bezierCurveTo(halfBot * 0.9, bot - (bot - top) * 0.2, halfTop * 1.02, top + (bot - top) * 0.5, halfTop, top)
  ctx.closePath()
  ctx.fillStyle = sk.shadow
  ctx.fill()
  ctx.save()
  ctx.clip()
  // The head's shadow, thrown straight down the throat. Heavy on purpose: a
  // neck as bright as a cheek is the single most common way a painted head
  // ends up looking stuck on.
  const g = ctx.createLinearGradient(0, top, 0, bot)
  g.addColorStop(0, rgba(sk.deep, 0.78))
  g.addColorStop(0.55, rgba(sk.deep, 0.34))
  g.addColorStop(1, rgba(sk.deep, 0.12))
  ctx.fillStyle = g
  ctx.fillRect(-R, top, R * 2, bot - top)
  blob(ctx, -R * 0.22, R * (H.chin + 0.36), R * 0.24, R * 0.30, 0, sk.lit, 0.14)
  ctx.restore()
}

function drawEars(ctx, R, wiz, sk) {
  for (const s of [-1, 1]) {
    const ex = s * R * 0.93, ey = R * 0.12
    const rx = R * 0.17, ry = R * 0.27
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(s * 0.2)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU)
    ctx.fillStyle = sk.base
    ctx.fill()
    ctx.clip()
    // An ear is thin enough to glow. Painting it the same colour as the cheek
    // is a tell.
    blob(ctx, 0, 0, rx * 1.3, ry * 1.2, 0, sk.warm, 0.5)
    blob(ctx, -s * rx * 0.35, ry * 0.1, rx * 0.7, ry * 0.55, 0, sk.deep, 0.34)
    ctx.restore()
    // The rim of the bowl, as a soft stroke rather than a line.
    ctx.save()
    ctx.globalAlpha = 0.4
    ctx.strokeStyle = sk.deep
    ctx.lineWidth = R * 0.028
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ex + s * rx * 0.1, ey - ry * 0.5)
    ctx.quadraticCurveTo(ex - s * rx * 0.5, ey, ex + s * rx * 0.1, ey + ry * 0.42)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * Eyes.
 *
 * The parts that matter, in order: the shadow the upper lid throws onto the
 * white (without it an eye is a bead), the lid line being heaviest at the outer
 * corner, an iris with a dark ring and a lighter middle, and a lower lid that
 * catches light — that last one is what makes an eye look wet.
 */
function drawEyes(ctx, R, wiz, sk, eye) {
  const e = wiz.eyes
  const ry = R * e.ry, rx = R * e.rx
  for (const s of [-1, 1]) {
    const cx = s * R * e.out, cy = R * e.y
    const tilt = s * e.tilt

    // Socket shadow, wider than the eye.
    blob(ctx, cx, cy - ry * 0.3, rx * 1.7, ry * 1.9, 0, sk.shadow, 0.3)

    const eyePath = () => {
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, tilt, 0, TAU)
      ctx.closePath()
    }
    eyePath()
    ctx.fillStyle = mix('#ffffff', sk.warm, 0.12)
    ctx.fill()

    ctx.save()
    eyePath(); ctx.clip()
    // Lid shadow across the top of the white.
    const lg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry * 0.4)
    lg.addColorStop(0, rgba(sk.deep, 0.62))
    lg.addColorStop(1, rgba(sk.deep, 0))
    ctx.fillStyle = lg
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2)

    // Iris.
    const ir = Math.min(rx, ry) * e.iris
    const iy = cy + ry * 0.06
    const ig = ctx.createRadialGradient(cx, iy + ir * 0.25, ir * 0.1, cx, iy, ir)
    ig.addColorStop(0, shade(eye, 0.4))
    ig.addColorStop(0.62, eye)
    ig.addColorStop(1, shade(eye, -0.62))
    ctx.fillStyle = ig
    ctx.beginPath(); ctx.arc(cx, iy, ir, 0, TAU); ctx.fill()
    ctx.fillStyle = '#140b08'
    ctx.beginPath(); ctx.arc(cx, iy, ir * 0.44, 0, TAU); ctx.fill()
    // The iris sits UNDER the lid, so the top of it is in shadow too.
    const io = ctx.createLinearGradient(0, iy - ir, 0, iy + ir * 0.2)
    io.addColorStop(0, 'rgba(20,10,8,0.5)')
    io.addColorStop(1, 'rgba(20,10,8,0)')
    ctx.fillStyle = io
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2)
    ctx.restore()

    // Catchlight, and a dim bounce opposite it.
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.95
    ctx.beginPath()
    ctx.ellipse(cx - ir * 0.34, iy - ir * 0.44, ir * 0.24, ir * 0.19, -0.5, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 0.3
    ctx.beginPath(); ctx.arc(cx + ir * 0.4, iy + ir * 0.4, ir * 0.13, 0, TAU); ctx.fill()
    ctx.globalAlpha = 1

    // Lash line: a tapered sweep, heaviest outside.
    ctx.save()
    ctx.strokeStyle = shade(sk.deep, -0.35)
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.92
    ctx.lineWidth = R * 0.030
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 1.02, ry * 1.02, tilt, Math.PI * 1.02, Math.PI * 1.98)
    ctx.stroke()
    ctx.lineWidth = R * 0.042
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 1.02, ry * 1.02, tilt,
      Math.PI * (s < 0 ? 1.02 : 1.5), Math.PI * (s < 0 ? 1.44 : 1.98))
    ctx.stroke()
    // Lower lid: light, not line. This is the "wet" cue.
    ctx.globalAlpha = 0.42
    ctx.strokeStyle = sk.lit
    ctx.lineWidth = R * 0.016
    ctx.beginPath()
    ctx.ellipse(cx, cy + ry * 0.12, rx * 0.94, ry * 0.94, tilt, Math.PI * 0.14, Math.PI * 0.86)
    ctx.stroke()
    ctx.restore()
  }
}

function drawBrows(ctx, R, wiz, hair) {
  const b = wiz.brow
  const e = wiz.eyes
  const col = shade(hair, -0.3)
  for (const s of [-1, 1]) {
    const x0 = s * R * (e.out - b.len * 0.55)
    const x1 = s * R * (e.out + b.len * 0.62)
    const y = R * (e.y - b.lift)
    ctx.save()
    // The body of the brow, soft-edged.
    ctx.globalAlpha = 0.85
    ctx.strokeStyle = col
    ctx.lineCap = 'round'
    ctx.lineWidth = R * b.w
    ctx.beginPath()
    ctx.moveTo(x0, y + R * b.tilt)
    ctx.quadraticCurveTo(s * R * e.out, y - R * b.arch, x1, y - R * b.tilt * 0.3)
    ctx.stroke()
    // A few hairs breaking the outer edge, so it isn't a painted stripe.
    ctx.globalAlpha = 0.5
    ctx.lineWidth = R * 0.012
    for (let i = 0; i < 5; i++) {
      const f = 0.25 + i * 0.18
      const px = x0 + (x1 - x0) * f
      const py = y - R * b.arch * (1 - Math.abs(f - 0.5) * 1.6) * 0.7 + R * b.tilt * (1 - f)
      ctx.beginPath()
      ctx.moveTo(px, py + R * b.w * 0.3)
      ctx.lineTo(px + s * R * 0.05, py - R * b.w * 0.55)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/**
 * A nose with no line on it anywhere.
 *
 * A drawn nose is the fastest way back to a cartoon. What is actually there is
 * a plane turning away on the shadow side, a lit ridge, two soft nostril
 * shadows and a warm tip — nothing that would survive being traced.
 */
function drawNose(ctx, R, wiz, sk) {
  const n = wiz.nose
  const ty = R * n.y
  const w = R * n.w
  ctx.save()
  // The shadow side of the bridge.
  const g = ctx.createLinearGradient(w * 0.1, 0, w * 1.5, 0)
  g.addColorStop(0, rgba(sk.shadow, 0.5))
  g.addColorStop(1, rgba(sk.shadow, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(w * 0.1, ty - R * n.bridge)
  ctx.quadraticCurveTo(w * 1.3, ty - R * n.bridge * 0.2, w * 1.25, ty + w * 0.3)
  ctx.quadraticCurveTo(w * 0.4, ty + w * 0.5, w * 0.1, ty)
  ctx.closePath()
  ctx.fill()
  // The lit ridge.
  blob(ctx, -w * 0.25, ty - R * n.bridge * 0.55, w * 0.42, R * n.bridge * 0.62, 0, sk.lit, 0.34)
  // Under the tip, and the tip itself catching warmth.
  blob(ctx, 0, ty + w * 0.42, w * 1.05, w * 0.42, 0, sk.deep, 0.42)
  blob(ctx, -w * 0.18, ty - w * 0.1, w * 0.62, w * 0.48, 0, sk.warm, 0.3)
  blob(ctx, -w * 0.28, ty - w * 0.28, w * 0.34, w * 0.26, 0, sk.lit, 0.42)
  // Nostrils: soft dents, not holes.
  for (const s of [-1, 1]) {
    blob(ctx, s * w * 0.66, ty + w * 0.2, w * 0.3, w * 0.22, s * 0.4, sk.deep, 0.5)
  }
  ctx.restore()
}

function drawMouth(ctx, R, wiz, sk) {
  const m = wiz.mouth
  const my = R * m.y
  const mw = R * m.w
  ctx.save()
  // The seam. Darkest in the middle, fading at the corners — a line of even
  // weight across the whole mouth is what makes a smiley.
  const seam = ctx.createLinearGradient(-mw, 0, mw, 0)
  seam.addColorStop(0, rgba('#8a4a42', 0.25))
  seam.addColorStop(0.5, rgba('#7a3c36', 0.92))
  seam.addColorStop(1, rgba('#8a4a42', 0.25))
  ctx.strokeStyle = seam
  ctx.lineCap = 'round'
  ctx.lineWidth = R * 0.030
  ctx.beginPath()
  ctx.moveTo(-mw, my - R * m.curve * 0.42)
  ctx.quadraticCurveTo(0, my + R * m.curve * 0.55, mw, my - R * m.curve * 0.42)
  ctx.stroke()

  // Upper lip: always darker than the lower one, because it faces down.
  blob(ctx, 0, my - R * m.upper * 0.9, mw * 0.9, R * m.upper, 0, sk.deep, 0.24)
  // Lower lip: lit, and warm.
  blob(ctx, 0, my + R * m.lower * 1.2, mw * 0.72, R * m.lower, 0, sk.warm, 0.42)
  blob(ctx, -mw * 0.18, my + R * m.lower, mw * 0.34, R * m.lower * 0.5, 0, sk.lit, 0.34)
  // The shadow the lower lip casts onto the chin.
  blob(ctx, 0, my + R * m.lower * 3.0, mw * 0.8, R * m.lower * 0.9, 0, sk.shadow, 0.28)
  // Corners, dug in a little — this is where an expression lives.
  for (const s of [-1, 1]) {
    blob(ctx, s * mw * 0.92, my - R * m.curve * 0.3, mw * 0.16, mw * 0.13, 0, sk.deep, 0.45)
  }
  ctx.restore()
}

/**
 * One lock of hair, as a tapered sliver that falls under its own weight.
 *
 * Described by where it leaves the scalp and where it ends, in head radii,
 * rather than by an angle and a sweep — an angle is easy to write and
 * impossible to picture, and the first version of this sent every lock flying
 * out sideways like a splash. A hairstyle gets hand-placed, so the numbers
 * should be ones a person can hold in their head.
 */
function lock(ctx, R, L, col, lit) {
  const x0 = L.x * R, y0 = L.y * R
  const x1 = x0 + L.sweep * R, y1 = y0 + L.len * R
  const w = R * L.thick
  const bend = (L.curl || 0) * R
  const cx = (x0 + x1) / 2 + bend

  // The tip keeps a little width and is capped with a curve. Converging to a
  // point turns every lock into a glass shard, which is what the first version
  // of this looked like — hair tapers, it does not come to a needle.
  const tw = w * 0.3
  ctx.beginPath()
  ctx.moveTo(x0 - w * 0.5, y0)
  ctx.bezierCurveTo(cx - w * 0.5, y0 + (y1 - y0) * 0.5, x1 - tw * 1.2, y1 - (y1 - y0) * 0.24, x1 - tw, y1)
  ctx.quadraticCurveTo(x1, y1 + tw * 0.9, x1 + tw, y1)
  ctx.bezierCurveTo(x1 + tw * 1.3, y1 - (y1 - y0) * 0.26, cx + w * 0.55, y0 + (y1 - y0) * 0.48, x0 + w * 0.5, y0)
  ctx.closePath()
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, lit ? shade(col, 0.3) : shade(col, -0.1))
  g.addColorStop(0.5, col)
  g.addColorStop(1, shade(col, -0.5))
  ctx.fillStyle = g
  ctx.fill()
}

function drawHairBack(ctx, R, wiz, hair) {
  const p = wiz.hairPlan
  const dark = shade(hair, -0.5)
  ctx.beginPath()
  ctx.ellipse(0, -R * 0.1, R * 1.14, R * 1.16, 0, 0, TAU)
  ctx.fillStyle = dark
  ctx.fill()
  if (p.back > 0) {
    ctx.beginPath()
    ctx.moveTo(-R * 1.08, -R * 0.2)
    ctx.bezierCurveTo(-R * 1.3, R * p.back * 0.5, -R * 1.0, R * p.back * 0.9, -R * 0.62, R * p.back)
    ctx.quadraticCurveTo(0, R * p.back * 1.14, R * 0.62, R * p.back)
    ctx.bezierCurveTo(R * 1.0, R * p.back * 0.9, R * 1.3, R * p.back * 0.5, R * 1.08, -R * 0.2)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, -R, 0, R * p.back)
    g.addColorStop(0, dark)
    g.addColorStop(1, shade(hair, -0.7))
    ctx.fillStyle = g
    ctx.fill()
  }
}

/**
 * The hair over the skull.
 *
 * The crown is a shape with a HAIRLINE, not an ellipse — an ellipse big enough
 * to cover the back of the head hangs down over the eyes, which is exactly what
 * the first attempt did. The lower edge dips at the centre and lifts at the
 * temples, because that is where a hairline actually sits.
 */
/**
 * Coiled hair, as a cloud of overlapping clumps rather than falling locks.
 *
 * The lock model is wrong for this and no amount of tuning fixes it: a lock
 * hangs, and a coil does not — it springs out from the scalp and holds its
 * volume. So curly hair gets its own construction, which is the whole argument
 * for hand-authoring each wizard instead of parameterising one. Wren's hair and
 * Kestrel's are not the same thing with different numbers.
 *
 * Built the way it reads: a soft mass first, then a lit edge along the top, then
 * a few visible coils. Blurred, because hair has no edges.
 */
function drawCurls(ctx, R, p, hair) {
  const lit = shade(hair, 0.34), dark = shade(hair, -0.52)

  ctx.save()
  if (typeof ctx.filter === 'string') ctx.filter = `blur(${(R * 0.045).toFixed(2)}px)`
  for (const c of p.curls) {
    const cx = c.x * R, cy = c.y * R, r = c.r * R
    // Each clump lit from the same upper-left as everything else, so the mass
    // turns as one thing rather than reading as a pile of separate balls.
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r)
    g.addColorStop(0, lit)
    g.addColorStop(0.5, hair)
    g.addColorStop(1, dark)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, TAU)
    ctx.fill()
  }
  ctx.restore()

  // The coils themselves: short arcs following each clump, so there is
  // something to read as hair at portrait size without turning into noise.
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < p.curls.length; i++) {
    const c = p.curls[i]
    const cx = c.x * R, cy = c.y * R, r = c.r * R
    const up = cy < -R * 0.5 || Math.abs(cx) > R * 0.9
    ctx.globalAlpha = up ? 0.5 : 0.32
    ctx.strokeStyle = i % 3 === 0 ? lit : dark
    ctx.lineWidth = R * 0.022
    const a0 = noise(i * 3.1, 7) * TAU
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a0) * r * 0.2, cy + Math.sin(a0) * r * 0.2, r * 0.56, a0, a0 + 3.4)
    ctx.stroke()
    ctx.globalAlpha *= 0.7
    ctx.strokeStyle = i % 2 === 0 ? dark : lit
    ctx.beginPath()
    ctx.arc(cx - Math.cos(a0) * r * 0.24, cy - Math.sin(a0) * r * 0.18, r * 0.4, a0 + 2.2, a0 + 5.2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawHairFront(ctx, R, wiz, hair) {
  const p = wiz.hairPlan
  const crown = () => {
    ctx.beginPath()
    ctx.moveTo(-R * 1.02, R * p.temple)
    // Controls well above the skull. A cubic sits only three-quarters of the
    // way towards its control points, so -1.05 put the crown's apex at about
    // -0.79R — below the top of a head that reaches -1.02R. The result was a
    // crescent of bare scalp between the hair and the hat brim.
    ctx.bezierCurveTo(-R * 1.16, -R * 1.5, R * 1.16, -R * 1.5, R * 1.02, R * p.temple)
    ctx.quadraticCurveTo(R * 0.52, R * (p.hairline - 0.1), R * p.peak, R * p.hairline)
    ctx.quadraticCurveTo(-R * 0.52, R * (p.hairline - 0.12), -R * 1.02, R * p.temple)
    ctx.closePath()
  }
  ctx.save()
  crown()
  ctx.fillStyle = hair
  ctx.fill()
  crown(); ctx.clip()
  blob(ctx, -R * 0.34, -R * 0.86, R * 0.62, R * 0.34, -0.2, '#ffffff', 0.28)
  blob(ctx, R * 0.56, -R * 0.66, R * 0.44, R * 0.34, 0.2, '#000000', 0.22)
  blob(ctx, 0, R * (p.hairline - 0.05), R * 0.9, R * 0.16, 0, '#000000', 0.2)
  ctx.restore()

  if (p.curls) {
    drawCurls(ctx, R, p, hair)
    return
  }

  // The locks themselves, drawn slightly out of focus.
  //
  // Hair has no edges. Drawn crisply, every lock reads as a slab of cut paper
  // — which is exactly what this looked like before the blur went on. A soft
  // mass with a few sharp strands over the top is how hair is actually
  // painted, and it is the difference between a wig and a head of hair.
  const soft = R * 0.035
  ctx.save()
  if (typeof ctx.filter === 'string') ctx.filter = `blur(${soft.toFixed(2)}px)`
  for (const L of p.side) lock(ctx, R, L, shade(hair, -0.14), L.x < 0)
  for (const L of p.fringe) lock(ctx, R, L, hair, L.x < p.peak)
  ctx.restore()

  // Strand detail, in focus, following the locks that carry it.
  ctx.save()
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.5
  for (const L of [...p.side, ...p.fringe]) {
    for (let i = -1; i <= 1; i += 2) {
      const off = i * L.thick * 0.26
      ctx.strokeStyle = i < 0 ? shade(hair, 0.3) : shade(hair, -0.45)
      ctx.lineWidth = R * 0.016
      ctx.beginPath()
      ctx.moveTo((L.x + off) * R, L.y * R)
      ctx.quadraticCurveTo(
        (L.x + off + L.sweep * 0.4 + (L.curl || 0)) * R, (L.y + L.len * 0.55) * R,
        (L.x + off + L.sweep * 0.94) * R, (L.y + L.len * 0.94) * R)
      ctx.stroke()
    }
  }
  ctx.restore()

  // A few loose strands. Hair that ends in a perfectly clean edge is a wig.
  ctx.save()
  ctx.strokeStyle = shade(hair, 0.05)
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.7
  for (const f of p.flyaway) {
    ctx.lineWidth = R * f.w
    ctx.beginPath()
    ctx.moveTo(f.x * R, f.y * R)
    ctx.quadraticCurveTo((f.x + f.sweep * 0.5) * R, (f.y + f.len * 0.4) * R,
      (f.x + f.sweep) * R, (f.y + f.len) * R)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * The robe, painted rather than filled.
 *
 * The faces got six layers of modelling and the garment got a flat colour with
 * four strokes on it, which is exactly what you could see: a painted head
 * sitting on a vector body. Cloth needs the same three things skin needed —
 * a direction the light comes from, soft transitions rather than lines, and a
 * texture — plus one of its own: folds hang from where the cloth is CAUGHT (the
 * shoulders and the clasp) and open out as they fall.
 *
 * Every fold is a soft dark valley with a narrow lit ridge beside it, on the
 * light's side. A fold drawn as a single dark line is a crease in paper.
 */
function drawShoulders(ctx, R, wiz, robe, trim) {
  const top = R * 1.95
  const halfW = R * 2.05
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(-halfW, R * 3.4)
    ctx.bezierCurveTo(-halfW * 0.96, top + R * 0.22, -R * 1.0, top - R * 0.16, -R * 0.52, top - R * 0.2)
    ctx.quadraticCurveTo(0, top + R * 0.12, R * 0.52, top - R * 0.2)
    ctx.bezierCurveTo(R * 1.0, top - R * 0.16, halfW * 0.96, top + R * 0.22, halfW, R * 3.4)
    ctx.closePath()
  }

  body()
  ctx.fillStyle = robe
  ctx.fill()

  ctx.save()
  body()
  ctx.clip()

  // The broad fall of light across the chest, lit side to shadow side.
  const g = ctx.createLinearGradient(-halfW, 0, halfW, 0)
  g.addColorStop(0, rgba('#ffffff', 0.17))
  g.addColorStop(0.42, rgba('#ffffff', 0))
  g.addColorStop(1, rgba('#000010', 0.38))
  ctx.fillStyle = g
  ctx.fillRect(-halfW, top - R, halfW * 2, R * 3)

  // Weave. Barely visible on its own; what it does is stop the cloth reading as
  // a coloured rectangle, the same job the grain does on skin.
  ctx.save()
  ctx.lineWidth = Math.max(0.4, R * 0.009)
  let n = 0
  for (let y = top - R * 0.1; y < R * 3.5; y += R * 0.062) {
    // Uneven weight and uneven spacing. Evenly spaced lines of equal weight
    // are corduroy, which is what the first attempt at this looked like.
    ctx.strokeStyle = rgba('#000010', 0.05 + 0.05 * Math.abs(noise(n, 5)))
    ctx.beginPath()
    ctx.moveTo(-halfW, y + noise(y, 3) * R * 0.02)
    ctx.lineTo(halfW, y + noise(y, 7) * R * 0.02)
    ctx.stroke()
    n++
  }
  ctx.restore()

  // Folds. Each is caught at the top and swings out as it falls; the ones on
  // the shadow side are deeper, because that is where the cloth turns away.
  const folds = [
    { x: -1.36, sway: -0.30, deep: 0.30 },
    { x: -0.86, sway: -0.16, deep: 0.24 },
    { x: -0.34, sway: -0.06, deep: 0.16 },
    { x: 0.42, sway: 0.08, deep: 0.26 },
    { x: 0.92, sway: 0.20, deep: 0.36 },
    { x: 1.42, sway: 0.34, deep: 0.44 },
  ]
  const fold = f => {
    ctx.beginPath()
    ctx.moveTo(R * f.x * 0.66, top + R * 0.12)
    ctx.quadraticCurveTo(R * (f.x * 0.9 + f.sway * 0.4), top + R * 0.8, R * (f.x + f.sway), R * 3.5)
  }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.filter = `blur(${Math.max(0.6, R * 0.055)}px)`
  for (const f of folds) {
    ctx.strokeStyle = rgba('#000010', f.deep)
    ctx.lineWidth = R * 0.13
    fold(f)
    ctx.stroke()
  }
  ctx.filter = 'none'
  // The lit ridge, always on the light's side of its own valley.
  ctx.save()
  ctx.translate(-R * 0.075, 0)
  ctx.filter = `blur(${Math.max(0.4, R * 0.03)}px)`
  for (const f of folds) {
    ctx.strokeStyle = rgba('#ffffff', 0.13 - f.x * 0.035)
    ctx.lineWidth = R * 0.055
    fold(f)
    ctx.stroke()
  }
  ctx.restore()
  ctx.restore()

  // What the head and the collar throw onto the chest.
  blob(ctx, 0, top + R * 0.3, R * 1.15, R * 0.5, 0, '#000010', 0.38)

  // Rim light down the lit shoulder: the edge where the robe meets the dark
  // behind it. Without it the silhouette is a cut-out, exactly as the head was.
  ctx.save()
  ctx.filter = `blur(${Math.max(0.6, R * 0.04)}px)`
  ctx.strokeStyle = rgba('#ffffff', 0.3)
  ctx.lineWidth = R * 0.07
  ctx.beginPath()
  ctx.moveTo(-halfW * 0.99, R * 3.4)
  ctx.bezierCurveTo(-halfW * 0.95, top + R * 0.22, -R * 1.0, top - R * 0.16, -R * 0.54, top - R * 0.2)
  ctx.stroke()
  ctx.restore()

  grain(ctx, -halfW, top - R * 0.4, halfW * 2, R * 2.2, 31, 0.035)
  ctx.restore()

  // ── The collar ──
  // Rolled rather than cut out: a darker under-fold, the collar itself with the
  // light running across it, and the trim as a stitched edge with a highlight
  // above it. A single flat polygon with a stroke round it was the second most
  // vector-looking thing in the picture after the hat.
  const collar = (out = 0) => {
    const a = R * (0.56 + out), b = R * (0.88 + out)
    const y0 = top - R * 0.2, y1 = top + R * (0.36 + out * 0.5)
    ctx.beginPath()
    ctx.moveTo(-a, y0)
    ctx.quadraticCurveTo(0, top + R * 0.16, a, y0)
    // The outer corners are turned, not mitred: cloth folded over on itself
    // has no sharp points, and the two right angles here were doing more to
    // make this look like clip art than anything else in the picture.
    ctx.quadraticCurveTo(R * (0.84 + out), y0 + R * 0.12, b, y1)
    ctx.quadraticCurveTo(0, top + R * (0.9 + out * 0.6), -b, y1)
    ctx.quadraticCurveTo(-R * (0.84 + out), y0 + R * 0.12, -a, y0)
    ctx.closePath()
  }
  ctx.save()
  collar(0.05)
  ctx.fillStyle = shade(robe, -0.55)
  ctx.fill()
  collar()
  const cg = ctx.createLinearGradient(-R * 0.9, 0, R * 0.9, 0)
  cg.addColorStop(0, shade(robe, -0.14))
  cg.addColorStop(0.45, shade(robe, -0.32))
  cg.addColorStop(1, shade(robe, -0.52))
  ctx.fillStyle = cg
  ctx.fill()
  ctx.save()
  collar()
  ctx.clip()
  grain(ctx, -R, top - R * 0.3, R * 2, R * 1.3, 17, 0.04)
  ctx.restore()
  // Stitched trim: the bright line, and a darker one just inside it so the
  // trim has a thickness rather than being a coloured outline.
  collar()
  ctx.strokeStyle = rgba(shade(trim, -0.5), 0.8)
  ctx.lineWidth = R * 0.07
  ctx.stroke()
  collar()
  ctx.strokeStyle = rgba(trim, 0.72)
  ctx.lineWidth = R * 0.03
  ctx.filter = `blur(${Math.max(0.3, R * 0.008)}px)`
  ctx.stroke()
  ctx.filter = 'none'
  ctx.restore()

  // The clasp, with a cast shadow so it sits ON the collar.
  const clY = top + R * 0.5, clR = R * 0.14
  ctx.save()
  ctx.filter = `blur(${Math.max(0.5, R * 0.03)}px)`
  ctx.fillStyle = rgba('#000010', 0.5)
  ctx.beginPath(); ctx.arc(R * 0.03, clY + R * 0.05, clR, 0, TAU); ctx.fill()
  ctx.restore()
  const cl = ctx.createRadialGradient(-clR * 0.3, clY - clR * 0.35, clR * 0.1, 0, clY, clR)
  cl.addColorStop(0, shade(trim, 0.6))
  cl.addColorStop(0.6, trim)
  cl.addColorStop(1, shade(trim, -0.5))
  ctx.fillStyle = cl
  ctx.beginPath(); ctx.arc(0, clY, clR, 0, TAU); ctx.fill()
  // One specular dot: the difference between a coloured circle and a stone.
  ctx.fillStyle = rgba('#ffffff', 0.85)
  ctx.beginPath(); ctx.ellipse(-clR * 0.32, clY - clR * 0.36, clR * 0.26, clR * 0.2, -0.5, 0, TAU); ctx.fill()
}

/**
 * Hats, drawn to sit ON the hair rather than above it.
 *
 * Two things do that: the brim line bows down at the centre because it is
 * wrapped round a skull, and a shadow falls from it onto the forehead. Without
 * the second one a hat floats however well the first is drawn.
 *
 * Everything else here is the same argument the robe makes. A cone filled with
 * a left-to-right gradient is a cone; a HAT is felt, which means it takes the
 * grain, it catches a line of light along its lit edge, it goes dark in the
 * crease where the band is tied, and its brim has a thickness you can see. The
 * faces are painted, so a vector hat on top of one is the first thing the eye
 * finds — and it was.
 */
function drawHat(ctx, R, wiz, kind, robe, trim, t) {
  const brimY = -R * 0.86
  const col = shade(robe, 0.08)

  ctx.save()
  // Shadow onto the hair and brow first, under everything else.
  blob(ctx, 0, brimY + R * 0.12, R * 1.15, R * 0.42, 0, '#1e0e1a', 0.62)

  /** Felt: grain and a soft inner shading, inside whatever shape was drawn. */
  const felt = (path, bb, seed) => {
    ctx.save()
    path()
    ctx.clip()
    grain(ctx, bb[0], bb[1], bb[2], bb[3], seed, 0.05)
    ctx.restore()
  }
  /** The line of light along an edge. Blurred, or it is just a stroke. */
  const rim = (path, alpha = 0.3, w = 0.05) => {
    ctx.save()
    ctx.filter = `blur(${Math.max(0.5, R * 0.03)}px)`
    ctx.strokeStyle = rgba('#ffffff', alpha)
    ctx.lineWidth = R * w
    path()
    ctx.stroke()
    ctx.restore()
  }

  const crownPath = (h, w, lean) => () => {
    ctx.beginPath()
    ctx.moveTo(-w / 2, brimY)
    ctx.quadraticCurveTo(-w * 0.16, brimY - h * 0.74, lean, brimY - h)
    ctx.quadraticCurveTo(w * 0.2, brimY - h * 0.46, w / 2, brimY)
    ctx.quadraticCurveTo(0, brimY + R * 0.3, -w / 2, brimY)
    ctx.closePath()
  }
  const crown = (h, w, lean) => {
    const path = crownPath(h, w, lean)
    path()
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, shade(col, 0.14))
    g.addColorStop(0.38, col)
    g.addColorStop(1, shade(col, -0.46))
    ctx.fillStyle = g
    ctx.fill()
    felt(path, [-w, brimY - h - R * 0.2, w * 2, h + R * 0.7], 41)
    // Where the cone meets the head it turns away from the light on every side,
    // so it darkens into the brim. This is what stops a cone reading as a
    // triangle of flat colour with a gradient painted across it.
    ctx.save()
    path()
    ctx.clip()
    const ao = ctx.createLinearGradient(0, brimY - h * 0.55, 0, brimY + R * 0.3)
    ao.addColorStop(0, rgba('#1a0c18', 0))
    ao.addColorStop(1, rgba('#1a0c18', 0.42))
    ctx.fillStyle = ao
    ctx.fillRect(-w, brimY - h, w * 2, h + R * 0.4)
    ctx.restore()
    // The lit edge, left side only, from the tip down to the brim.
    rim(() => {
      ctx.beginPath()
      ctx.moveTo(lean, brimY - h * 0.98)
      ctx.quadraticCurveTo(-w * 0.16, brimY - h * 0.74, -w * 0.49, brimY - R * 0.02)
    }, 0.34, 0.045)
  }

  const brim = (w, th) => {
    // A brim has a top and an under-side, and you can see both. Drawing the
    // under-side first, offset down, is the whole trick: without it the brim is
    // a disc of zero thickness stuck through the hat.
    ctx.beginPath()
    ctx.ellipse(0, brimY + R * 0.17, w / 2, th, 0, 0, TAU)
    ctx.fillStyle = shade(robe, -0.62)
    ctx.fill()
    const top = () => {
      ctx.beginPath()
      ctx.ellipse(0, brimY + R * 0.1, w / 2, th, 0, 0, TAU)
    }
    top()
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, shade(robe, 0.02))
    g.addColorStop(0.45, shade(robe, -0.14))
    g.addColorStop(1, shade(robe, -0.52))
    ctx.fillStyle = g
    ctx.fill()
    felt(top, [-w, brimY - th, w * 2, th * 3], 23)
    // The near edge of the brim catches the light along its whole sweep.
    rim(() => {
      ctx.beginPath()
      ctx.ellipse(0, brimY + R * 0.1, w / 2 - R * 0.02, th - R * 0.02, 0, Math.PI * 0.62, Math.PI * 1.9)
    }, 0.22, 0.04)
  }

  const band = w => {
    // Wrapped, not stuck on: the near edge of a band round a cone dips towards
    // you, and a straight strip is the single thing that makes a hat look like
    // a sticker.
    const path = () => {
      ctx.beginPath()
      ctx.moveTo(-w * 0.44, brimY - R * 0.3)
      ctx.quadraticCurveTo(0, brimY - R * 0.18, w * 0.44, brimY - R * 0.3)
      ctx.lineTo(w * 0.46, brimY - R * 0.08)
      ctx.quadraticCurveTo(0, brimY + R * 0.06, -w * 0.46, brimY - R * 0.08)
      ctx.closePath()
    }
    ctx.save()
    // Cloth gathers where it is tied, so the crown darkens just above the band.
    ctx.save()
    ctx.filter = `blur(${Math.max(0.6, R * 0.045)}px)`
    ctx.fillStyle = rgba('#1a0c18', 0.45)
    ctx.beginPath()
    ctx.moveTo(-w * 0.44, brimY - R * 0.4)
    ctx.quadraticCurveTo(0, brimY - R * 0.28, w * 0.44, brimY - R * 0.4)
    ctx.lineTo(w * 0.44, brimY - R * 0.24)
    ctx.quadraticCurveTo(0, brimY - R * 0.12, -w * 0.44, brimY - R * 0.24)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    path()
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, shade(trim, 0.14)); g.addColorStop(0.42, trim); g.addColorStop(1, shade(trim, -0.46))
    ctx.fillStyle = g
    ctx.fill()
    felt(path, [-w, brimY - R * 0.5, w * 2, R], 59)
    ctx.restore()
  }

  const star = (sx, sy, size) => {
    ctx.save()
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t / 420)
    ctx.fillStyle = trim
    ctx.font = `900 ${size}px serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('✦', sx, sy)
    ctx.restore()
  }

  if (kind === 'wide') {
    brim(R * 3.5, R * 0.17); crown(R * 1.5, R * 1.85, R * 0.1); band(R * 1.85)
    star(R * 0.06, brimY - R * 1.52, R * 0.42)
  } else if (kind === 'hood') {
    // A ring of cloth with the face cut out of it: the outer edge falls to the
    // shoulders, the inner edge arches over the brow and runs down past the
    // jaw. Drawn as one path with evenodd so the opening is genuinely a hole.
    // The outer edge flares onto the shoulders instead of running straight
    // down. A hood with parallel sides is an archway with a face in it, which
    // is what this looked like: cloth draped over a head is WIDER where it
    // reaches the shoulders than where it crosses the crown.
    const ring = () => {
      ctx.beginPath()
      ctx.moveTo(-R * 1.94, R * 2.4)
      ctx.bezierCurveTo(-R * 1.82, R * 0.55, -R * 1.34, -R * 1.72, -R * 0.14, -R * 1.98)
      ctx.quadraticCurveTo(R * 0.54, -R * 2.12, R * 0.82, -R * 1.62)
      ctx.bezierCurveTo(R * 1.5, -R * 0.78, R * 1.84, R * 0.6, R * 1.96, R * 2.4)
      ctx.closePath()
      ctx.moveTo(-R * 1.12, R * 2.4)
      ctx.bezierCurveTo(-R * 1.16, -R * 0.4, -R * 0.66, -R * 1.3, 0, -R * 1.32)
      ctx.bezierCurveTo(R * 0.66, -R * 1.3, R * 1.16, -R * 0.4, R * 1.12, R * 2.4)
      ctx.closePath()
    }
    ring()
    const g = ctx.createLinearGradient(-R * 1.7, 0, R * 1.7, 0)
    g.addColorStop(0, shade(col, 0.12))
    g.addColorStop(0.42, col)
    g.addColorStop(1, shade(col, -0.56))
    ctx.fillStyle = g
    ctx.fill('evenodd')
    ctx.save()
    ring()
    ctx.clip('evenodd')
    grain(ctx, -R * 1.8, -R * 2.2, R * 3.6, R * 4.6, 71, 0.05)
    // Two folds in the cloth, falling from where it is drawn over the crown.
    ctx.filter = `blur(${Math.max(0.6, R * 0.05)}px)`
    ctx.lineCap = 'round'
    for (const f of [[-1.38, -1.78, 0.26], [1.4, 1.8, 0.34], [-1.0, -1.2, 0.16]]) {
      ctx.strokeStyle = rgba('#1a0c18', f[2])
      ctx.lineWidth = R * 0.14
      ctx.beginPath()
      ctx.moveTo(R * f[0] * 0.72, -R * 1.5)
      ctx.quadraticCurveTo(R * f[0], -R * 0.2, R * f[1], R * 2.4)
      ctx.stroke()
    }
    ctx.restore()
    // The lit outer edge — a hood is mostly silhouette, so this does more work
    // here than anywhere else.
    rim(() => {
      ctx.beginPath()
      ctx.moveTo(-R * 1.9, R * 2.0)
      ctx.bezierCurveTo(-R * 1.8, R * 0.55, -R * 1.34, -R * 1.74, -R * 0.14, -R * 2.0)
    }, 0.22, 0.05)
    // Shadow thrown into the hood, so the face sits inside it.
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-R * 1.12, R * 2.4)
    ctx.bezierCurveTo(-R * 1.16, -R * 0.4, -R * 0.66, -R * 1.3, 0, -R * 1.32)
    ctx.bezierCurveTo(R * 0.66, -R * 1.3, R * 1.16, -R * 0.4, R * 1.12, R * 2.4)
    ctx.closePath()
    ctx.clip()
    const hg = ctx.createLinearGradient(0, -R * 1.3, 0, -R * 0.2)
    hg.addColorStop(0, 'rgba(18,6,22,0.6)')
    hg.addColorStop(1, 'rgba(18,6,22,0)')
    ctx.fillStyle = hg
    ctx.fillRect(-R * 1.2, -R * 1.4, R * 2.4, R * 1.4)
    ctx.restore()
    // The lining, where the cloth turns back on itself round the face.
    ctx.save()
    ctx.strokeStyle = rgba(shade(trim, -0.3), 0.55)
    ctx.lineWidth = R * 0.055
    ctx.beginPath()
    ctx.moveTo(-R * 1.13, R * 1.6)
    ctx.bezierCurveTo(-R * 1.16, -R * 0.4, -R * 0.66, -R * 1.29, 0, -R * 1.31)
    ctx.bezierCurveTo(R * 0.66, -R * 1.29, R * 1.16, -R * 0.4, R * 1.13, R * 1.6)
    ctx.stroke()
    ctx.restore()
  } else if (kind === 'crown') {
    const w = R * 1.7
    const path = () => {
      ctx.beginPath()
      ctx.moveTo(-w / 2, brimY + R * 0.1)
      ctx.lineTo(-w / 2, brimY - R * 0.28)
      for (let i = 0; i < 4; i++) {
        const px = -w / 2 + (w / 4) * i
        ctx.lineTo(px + w / 8, brimY - R * (i % 2 === 0 ? 0.82 : 0.56))
        ctx.lineTo(px + w / 4, brimY - R * 0.28)
      }
      ctx.lineTo(w / 2, brimY + R * 0.1)
      ctx.quadraticCurveTo(0, brimY + R * 0.42, -w / 2, brimY + R * 0.1)
      ctx.closePath()
    }
    path()
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, shade(trim, -0.3)); g.addColorStop(0.45, trim); g.addColorStop(1, shade(trim, -0.5))
    ctx.fillStyle = g
    ctx.fill()
    // Metal, not felt: no grain, but a hard horizontal specular band, because
    // what makes something read as polished is a sharp edge between light and
    // dark rather than a smooth ramp.
    ctx.save()
    path()
    ctx.clip()
    const sp = ctx.createLinearGradient(0, brimY - R * 0.3, 0, brimY + R * 0.12)
    sp.addColorStop(0, rgba('#ffffff', 0))
    sp.addColorStop(0.45, rgba('#ffffff', 0.5))
    sp.addColorStop(0.62, rgba('#ffffff', 0.06))
    sp.addColorStop(1, rgba('#2a1a06', 0.42))
    ctx.fillStyle = sp
    ctx.fillRect(-w, brimY - R, w * 2, R * 1.6)
    ctx.restore()
    // A stone in the middle band.
    const gy = brimY - R * 0.08
    const gg = ctx.createRadialGradient(-R * 0.03, gy - R * 0.04, R * 0.01, 0, gy, R * 0.12)
    gg.addColorStop(0, rgba('#ffffff', 0.9))
    gg.addColorStop(0.5, shade(robe, 0.2))
    gg.addColorStop(1, shade(robe, -0.5))
    ctx.fillStyle = gg
    ctx.beginPath(); ctx.ellipse(0, gy, R * 0.12, R * 0.13, 0, 0, TAU); ctx.fill()
  } else if (kind === 'horned') {
    crown(R * 1.5, R * 1.72, R * 0.06)
    for (const s of [-1, 1]) {
      const horn = () => {
        ctx.beginPath()
        // Wide where it leaves the hat, tapering to an actual point. The first
        // pass had both curves finishing far apart, so the horns ended in a
        // blunt stub and read as two pink ribbons pinned to the crown.
        ctx.moveTo(s * R * 0.6, brimY - R * 0.04)
        ctx.quadraticCurveTo(s * R * 1.5, brimY - R * 0.6, s * R * 1.28, brimY - R * 1.34)
        ctx.quadraticCurveTo(s * R * 1.02, brimY - R * 0.66, s * R * 0.46, brimY - R * 0.3)
        ctx.closePath()
      }
      horn()
      // Horn rather than sticker: dark where it leaves the hat, bright at the
      // point, with the light on the same side as everything else.
      const hg = ctx.createLinearGradient(s * R * 0.5, brimY, s * R * 1.2, brimY - R * 1.2)
      hg.addColorStop(0, shade(trim, -0.5))
      hg.addColorStop(0.55, trim)
      hg.addColorStop(1, shade(trim, 0.3))
      ctx.fillStyle = hg
      ctx.fill()
      felt(horn, [-R * 1.6, brimY - R * 1.4, R * 3.2, R * 1.6], 83 + s)
    }
    band(R * 1.72)
  } else {
    crown(R * 1.95, R * 1.72, R * 0.16); band(R * 1.72)
    star(R * 0.2, brimY - R * 1.9, R * 0.44)
  }
  ctx.restore()
}
