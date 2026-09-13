// --- Procedural wizard art ----------------------------------------------------
// Every form is drawn from the data in game/skins.js — two colours, a hat shape,
// a staff and an aura. Nothing is loaded from disk, so there are no image files
// to host, the art is crisp at any size, and adding a wizard costs one line of
// config rather than an asset pipeline.
//
// The same function draws the wizard walking ahead of the camera in the maze and
// the big preview in the wardrobe, which is what keeps the two looking like the
// same character.

import { resolveLook } from '../game/appearance.js'

const TAU = Math.PI * 2

/**
 * Stroke the path that was just filled, in a darker shade of its own colour.
 *
 * Kept as one helper so the whole figure shares a consistent line weight, and
 * so a later shading pass has a single place to hang cloth folds and rim light
 * off the same silhouette.
 */
function outline(ctx, h, col, weight = 1) {
  // Dark enough to read as a drawn line against the fill, but still the robe's
  // own hue — a black outline on a near-black background just eats the edge.
  // The fills were lightened at their edges to give this line something to sit
  // against; without that the gradient and the outline are the same colour and
  // the figure loses its silhouette.
  ctx.strokeStyle = shade(col, -0.72)
  ctx.lineWidth = Math.max(1, h * 0.011 * weight)
  ctx.lineJoin = 'round'
  ctx.stroke()
}

// --- Shading ------------------------------------------------------------------
// One light, high and to the upper left, used by everything. Consistency is what
// makes a set of flat shapes read as one solid object rather than a collage — so
// the hat, the head, the robe and the sleeves are all lit from the same place.

/**
 * Give the path just drawn some volume: a soft highlight where the light falls
 * and a shadow away from it, both clipped inside the shape.
 *
 * `bb` is a bounding box {x, y, w, h} for the gradients to span. It doesn't have
 * to be tight — it only sets where the falloff happens.
 */
function volume(ctx, drawPath, bb, strength = 1) {
  ctx.save()
  drawPath()
  ctx.clip()
  const lx = bb.x + bb.w * 0.3, ly = bb.y + bb.h * 0.2
  const hl = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(bb.w, bb.h) * 0.8)
  hl.addColorStop(0, `rgba(255,255,255,${0.25 * strength})`)
  hl.addColorStop(0.55, `rgba(255,255,255,${0.07 * strength})`)
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hl
  ctx.fillRect(bb.x, bb.y, bb.w, bb.h)

  const sh = ctx.createLinearGradient(bb.x + bb.w * 0.42, bb.y + bb.h * 0.25, bb.x + bb.w, bb.y + bb.h)
  sh.addColorStop(0, 'rgba(10,5,26,0)')
  sh.addColorStop(1, `rgba(10,5,26,${0.4 * strength})`)
  ctx.fillStyle = sh
  ctx.fillRect(bb.x, bb.y, bb.w, bb.h)
  ctx.restore()
}

/** Deterministic 0..1 noise — textures must not shimmer from frame to frame. */
function noise(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Woven cloth, as a scatter of short strokes inside the given path.
 *
 * Nothing here is legible as a thread — that's the point. What it does is stop
 * a large flat fill reading as plastic, which is most of the difference between
 * "a shape coloured in" and "cloth".
 */
function weave(ctx, drawPath, bb, seed, col) {
  ctx.save()
  drawPath()
  ctx.clip()
  ctx.strokeStyle = shade(col, -0.5)
  ctx.lineWidth = Math.max(0.5, bb.h * 0.006)
  ctx.globalAlpha = 0.075
  const step = Math.max(4, bb.h * 0.06)
  let i = 0
  for (let y = bb.y; y < bb.y + bb.h; y += step) {
    for (let x = bb.x; x < bb.x + bb.w; x += step) {
      i++
      const n = noise(i, seed)
      if (n < 0.45) continue
      const len = step * (0.3 + n * 0.4)
      const ox = (noise(i, seed + 1) - 0.5) * step
      const oy = (noise(i, seed + 2) - 0.5) * step
      ctx.beginPath()
      ctx.moveTo(x + ox, y + oy)
      ctx.lineTo(x + ox + len * 0.55, y + oy + len)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/**
 * @param ctx     canvas 2D context
 * @param o.x     horizontal centre
 * @param o.yBase vertical position of the feet
 * @param o.h     total height in pixels
 * @param o.form  a FORMS entry
 * @param o.t     milliseconds, for animation
 * @param o.moving whether to animate a walk
 * @param o.view  'back' (in the maze) or 'front' (previews)
 * @param o.lean  -1..1 turn lean
 * @param o.appearance skin tone / hair colour / hair length (see game/appearance.js)
 */
export function drawWizard(ctx, o) {
  const { x, yBase, h, form, t = 0, moving = false, view = 'back', lean = 0, appearance } = o
  if (!form) return
  const look = resolveLook(appearance)

  const robe = form.robe || '#6f6fae'
  const trim = form.trim || '#cfcff0'
  const stride = moving ? Math.sin(t / 125) : Math.sin(t / 900) * 0.25
  const bob = stride * h * 0.018
  const sway = stride * h * 0.022

  ctx.save()
  ctx.translate(x, yBase - bob)
  ctx.rotate(lean * 0.06)

  drawAura(ctx, h, form.aura, t, trim, 'under')

  // Proportions.
  //
  // Deliberately chibi: about three and a half heads tall rather than five. A
  // big head and a small round body is the single biggest lever on "cute" —
  // it's what every emoji, every mascot and every toy does, and it beats any
  // amount of rendering detail. The body is built from a waist, shoulders,
  // stubby sleeves and a bell hem so it still reads as a person in a robe
  // rather than a cone with a face on top.
  const hem = h * 0.235, waist = h * 0.155, shoulder = h * 0.185
  const yWaist = -h * 0.29, yShoulder = -h * 0.45
  const headY = -h * 0.605, headR = h * 0.142
  const seed = (form.robe || '').length + (form.title || '').length * 7

  // ── Contact shadow, so the figure stands on something ──
  ctx.save()
  const gs = ctx.createRadialGradient(0, 0, 0, 0, 0, hem * 1.1)
  gs.addColorStop(0, 'rgba(0,0,0,0.38)')
  gs.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gs
  ctx.beginPath()
  ctx.ellipse(0, h * 0.005, hem * 1.05, h * 0.028, 0, 0, TAU)
  ctx.fill()
  ctx.restore()

  // ── Shoes peeking under the hem ──
  ctx.fillStyle = shade(robe, -0.7)
  for (const sgn of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sgn * h * 0.08 + sway * 0.5, -h * 0.012, h * 0.05, h * 0.024, 0, 0, TAU)
    ctx.fill()
  }

  // ── Robe ──
  const robePath = () => {
    ctx.beginPath()
    ctx.moveTo(-hem + sway, 0)
    ctx.bezierCurveTo(-hem * 0.99, -h * 0.14, -waist * 1.04, -h * 0.22, -waist, yWaist)
    ctx.bezierCurveTo(-waist * 0.99, yWaist - h * 0.06, -shoulder, yShoulder + h * 0.05, -shoulder, yShoulder)
    ctx.quadraticCurveTo(0, yShoulder - h * 0.038, shoulder, yShoulder)
    ctx.bezierCurveTo(shoulder, yShoulder + h * 0.05, waist * 0.99, yWaist - h * 0.06, waist, yWaist)
    ctx.bezierCurveTo(waist * 1.04, -h * 0.22, hem * 0.99, -h * 0.14, hem + sway, 0)
    ctx.closePath()
  }
  robePath()
  ctx.fillStyle = robe
  ctx.fill()
  volume(ctx, robePath, { x: -hem * 1.1, y: yShoulder - h * 0.05, w: hem * 2.2, h: -yShoulder + h * 0.06 })
  weave(ctx, robePath, { x: -hem, y: yShoulder, w: hem * 2, h: -yShoulder }, seed, robe)

  // Folds. Three creases fanning from the waist to the hem, each with a lighter
  // ridge beside it — the cheapest way to say "cloth" rather than "surface".
  ctx.save()
  robePath()
  ctx.clip()
  ctx.lineCap = 'round'
  for (const f of [-0.62, -0.12, 0.44]) {
    const x0 = waist * f, x1 = hem * (f * 1.25 + 0.04)
    ctx.beginPath()
    ctx.moveTo(x0, yWaist + h * 0.01)
    ctx.quadraticCurveTo(x0 * 0.9 + x1 * 0.1, yWaist * 0.45, x1 + sway, -h * 0.012)
    ctx.strokeStyle = shade(robe, -0.42)
    ctx.globalAlpha = 0.5
    ctx.lineWidth = Math.max(1, h * 0.009)
    ctx.stroke()
    ctx.translate(h * 0.012, 0)
    ctx.strokeStyle = shade(robe, 0.3)
    ctx.globalAlpha = 0.22
    ctx.lineWidth = Math.max(1, h * 0.007)
    ctx.stroke()
    ctx.translate(-h * 0.012, 0)
  }
  ctx.restore()

  // A drawn line around the silhouette. Flat shapes butted against each other
  // read as assembled; the same shapes inside an outline read as drawn. The
  // line is a dark version of the robe rather than black, so it stays part of
  // the character instead of looking like a sticker edge.
  robePath()
  outline(ctx, h, robe)

  // Hem band, and a front placket (or back seam) for a sense of fabric.
  ctx.fillStyle = trim
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.moveTo(-hem + sway, 0)
  ctx.lineTo(hem + sway, 0)
  ctx.lineTo(hem * 0.95 + sway, -h * 0.035)
  ctx.lineTo(-hem * 0.95 + sway, -h * 0.035)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 0.42
  ctx.beginPath()
  ctx.moveTo(-h * 0.011, yShoulder)
  ctx.lineTo(h * 0.011, yShoulder)
  ctx.lineTo(h * 0.02 + sway, 0)
  ctx.lineTo(-h * 0.02 + sway, 0)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  // ── Sleeves and hands ──
  // Short and stubby, to match the head. The arms swing OUTSIDE the robe
  // silhouette and carry an outline — tucked against the body they just read as
  // two beige buttons stuck on a bell.
  const armSwing = stride * h * 0.02
  for (const sgn of [-1, 1]) {
    const handY = -h * 0.225 + sgn * armSwing
    const outer = shoulder + h * 0.08
    const sleeve = () => {
      ctx.beginPath()
      ctx.moveTo(sgn * shoulder * 0.9, yShoulder + h * 0.008)
      ctx.quadraticCurveTo(sgn * (outer + h * 0.025), yWaist + h * 0.03, sgn * outer, handY)
      ctx.lineTo(sgn * (outer - h * 0.058), handY + h * 0.008)
      ctx.quadraticCurveTo(sgn * (shoulder - h * 0.012), yWaist + h * 0.01, sgn * shoulder * 0.48, yShoulder + h * 0.03)
      ctx.closePath()
    }
    sleeve()
    ctx.fillStyle = sgn < 0 ? shade(robe, -0.2) : shade(robe, 0.06)
    ctx.fill()
    volume(ctx, sleeve, { x: sgn < 0 ? -outer * 1.1 : shoulder * 0.4, y: yShoulder, w: outer * 0.8, h: -yShoulder * 0.55 }, 0.8)
    sleeve()
    outline(ctx, h, robe, 0.8)
    // Cuff, then the hand clear of the sleeve.
    ctx.fillStyle = trim
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.ellipse(sgn * (outer - h * 0.026), handY + h * 0.004, h * 0.03, h * 0.014, sgn * 0.3, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(sgn * (outer - h * 0.012), handY + h * 0.03, h * 0.028, 0, TAU)
    ctx.fillStyle = look.skinHex
    ctx.fill()
  }

  // ── Shoulder cape / collar ──
  const cape = () => {
    ctx.beginPath()
    ctx.moveTo(-shoulder - h * 0.042, yShoulder + h * 0.032)
    ctx.quadraticCurveTo(0, yShoulder - h * 0.08, shoulder + h * 0.042, yShoulder + h * 0.032)
    ctx.quadraticCurveTo(0, yShoulder + h * 0.082, -shoulder - h * 0.042, yShoulder + h * 0.032)
    ctx.closePath()
  }
  cape()
  ctx.fillStyle = shade(robe, 0.22)
  ctx.fill()
  volume(ctx, cape, { x: -shoulder * 1.3, y: yShoulder - h * 0.08, w: shoulder * 2.6, h: h * 0.17 }, 0.9)
  cape()
  outline(ctx, h, robe, 0.8)
  ctx.strokeStyle = trim
  ctx.lineWidth = Math.max(1, h * 0.008)
  ctx.globalAlpha = 0.75
  ctx.stroke()
  ctx.globalAlpha = 1

  // ── Staff, held off to one side so it never covers the hat ──
  if (form.staff && form.staff !== 'none') drawStaff(ctx, h, form.staff, trim, t, stride)

  // ── Hair behind the head, so long styles fall over the shoulders ──
  drawHair(ctx, h, headY, headR, look, view, 'back')

  // ── Ears, before the head so they tuck behind it ──
  if (view === 'front') {
    for (const sgn of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(sgn * headR * 0.97, headY + headR * 0.14, headR * 0.17, headR * 0.24, 0, 0, TAU)
      ctx.fillStyle = shade(look.skinHex, -0.1)
      ctx.fill()
      outline(ctx, h, look.skinHex, 0.6)
    }
  }

  // ── Head ──
  // An egg rather than a circle: wide at the temples, narrowing to a soft chin.
  // A perfect circle reads as a ball with a face drawn on it; the taper is what
  // makes it a head.
  // Face shape comes from the appearance record: width at the temples, how far
  // the jaw tapers in, and how low the chin sits. A perfect circle reads as a
  // ball with a face drawn on it; the taper is what makes it a head.
  const fs = look.face
  const headPath = () => {
    const W = headR * fs.w, J = headR * fs.jaw, C = headR * fs.chin
    ctx.beginPath()
    ctx.moveTo(0, headY - headR)
    ctx.bezierCurveTo(W * 1.05, headY - headR * 0.96, W * 1.04, headY + headR * 0.26, J, headY + headR * 0.79)
    ctx.bezierCurveTo(J * 0.48, headY + C, -J * 0.48, headY + C, -J, headY + headR * 0.79)
    ctx.bezierCurveTo(-W * 1.04, headY + headR * 0.26, -W * 1.05, headY - headR * 0.96, 0, headY - headR)
    ctx.closePath()
  }
  headPath()
  ctx.fillStyle = view === 'front' ? look.skinHex : shade(look.skinHex, -0.12)
  ctx.fill()
  volume(ctx, headPath, { x: -headR * 1.1, y: headY - headR * 1.1, w: headR * 2.2, h: headR * 2.3 }, 0.85)
  headPath()
  outline(ctx, h, look.skinHex, 0.85)

  if (view === 'front') drawFace(ctx, h, headY, headR, look, form)

  // ── Hair in front of the head: fringe and side locks ──
  drawHair(ctx, h, headY, headR, look, view, 'front')

  // ── Hat, drawn last so its brim sits over the head ──
  drawHat(ctx, h, form.hat || 'pointed', robe, trim, t, view)

  drawAura(ctx, h, form.aura, t, trim, 'over')
  ctx.restore()
}

// --- Face ---------------------------------------------------------------------
/**
 * The front-facing face.
 *
 * Two dots and an arc is a smiley, not a character — it's readable but it isn't
 * ALIVE, which is what went missing when the emoji wizards were replaced with
 * drawn ones. What brings a cartoon face to life, in rough order of payoff:
 * brows (they carry nearly all the expression), an eyelid line over the eye so
 * it reads as an eye rather than a bead, a nose to give the face a middle, and
 * warm cheeks. All four are here.
 *
 * Everything is expressed as a fraction of headR, so this works at 64px in a
 * wardrobe tile and at 168px on the hub without a second set of numbers. It's
 * also where an expression system would go later — the brow angle and the mouth
 * arc are the only two values a "delighted" or "worried" face would change.
 */
function drawFace(ctx, h, headY, headR, look, form) {
  // Geometry shared by every part, so they stay in register with each other
  // however the parts are swapped.
  const f = {
    h, headY, headR,
    eo: headR * 0.40,                 // eye centre, out from the midline
    ey: headY + headR * 0.02,         // eye line
  }
  drawCheeks(ctx, f, look)
  drawEyes(ctx, f, look)
  drawBrows(ctx, f, look)
  drawNose(ctx, f, look)
  // An elder's beard draws the mouth itself, between moustache and whiskers.
  if (form.rank >= 5) drawBeard(ctx, f, look)
  else drawMouth(ctx, f, look)
  ctx.lineCap = 'butt'
}

/** Warmth across the cheekbones. Not makeup — the flush of a child outdoors. */
function drawCheeks(ctx, f, look) {
  const { headY, headR } = f
  ctx.save()
  for (const s of [-1, 1]) {
    const cx = s * headR * 0.62, cy = headY + headR * 0.34
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, headR * 0.3)
    g.addColorStop(0, 'rgba(230,116,98,0.42)')
    g.addColorStop(1, 'rgba(230,116,98,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(cx, cy, headR * 0.3, headR * 0.2, 0, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Eyes.
 *
 * The previous pass made these big and solid black, which is emoji-legible but
 * reads as a doll. A human eye has parts: a white with a shadow under the lid,
 * a COLOURED iris, a pupil inside it, a bright catchlight up towards the light
 * and a dim bounce light opposite, and a lash line that is heavier at the outer
 * corner. Drawing those parts — and letting the shape squash into an almond —
 * is what moves a face from doll to person while staying cartoon.
 *
 * The shape, the size and the iris colour all come from the appearance record,
 * so a different eye is a different row of numbers rather than different code.
 */
function drawEyes(ctx, f, look) {
  const { headR, eo, ey } = f
  const sp = look.eyes
  const rx = headR * sp.r, ry = headR * sp.r * sp.sq
  const lookX = 0

  for (const s of [-1, 1]) {
    const cx = s * eo
    const tilt = s * sp.tilt

    // Socket: a soft shadow so the eye sits IN the face.
    ctx.save()
    const sg = ctx.createRadialGradient(cx, ey, rx * 0.4, cx, ey, rx * 1.7)
    sg.addColorStop(0, 'rgba(120,74,58,0.16)')
    sg.addColorStop(1, 'rgba(120,74,58,0)')
    ctx.fillStyle = sg
    ctx.beginPath(); ctx.ellipse(cx, ey, rx * 1.7, ry * 1.8, 0, 0, TAU); ctx.fill()
    ctx.restore()

    const eyePath = () => {
      ctx.beginPath()
      ctx.ellipse(cx, ey, rx, ry, tilt, 0, TAU)
      ctx.closePath()
    }

    // The white.
    eyePath()
    ctx.fillStyle = '#fdf8f0'
    ctx.fill()
    // Shadow cast by the upper lid onto the white.
    ctx.save()
    eyePath(); ctx.clip()
    const lg = ctx.createLinearGradient(0, ey - ry, 0, ey + ry * 0.3)
    lg.addColorStop(0, 'rgba(120,90,80,0.4)')
    lg.addColorStop(1, 'rgba(120,90,80,0)')
    ctx.fillStyle = lg
    ctx.fillRect(cx - rx, ey - ry, rx * 2, ry * 2)
    ctx.restore()

    // Iris, pupil, and the ring that keeps the colour from going flat.
    const ir = Math.min(rx, ry) * 0.84
    const ix = cx + lookX, iy = ey + ry * 0.08
    ctx.save()
    eyePath(); ctx.clip()
    const ig = ctx.createRadialGradient(ix, iy - ir * 0.3, ir * 0.1, ix, iy, ir)
    ig.addColorStop(0, shade(look.eyeHex, 0.35))
    ig.addColorStop(0.6, look.eyeHex)
    ig.addColorStop(1, shade(look.eyeHex, -0.45))
    ctx.fillStyle = ig
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill()
    ctx.strokeStyle = shade(look.eyeHex, -0.6)
    ctx.lineWidth = Math.max(0.6, ir * 0.14)
    ctx.beginPath(); ctx.arc(ix, iy, ir * 0.94, 0, TAU); ctx.stroke()
    ctx.fillStyle = '#160c08'
    ctx.beginPath(); ctx.arc(ix, iy, ir * 0.46, 0, TAU); ctx.fill()
    ctx.restore()

    // Catchlight up towards the light, and a dim bounce opposite. The pair is
    // what makes an eye look wet rather than painted.
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(ix - ir * 0.36, iy - ir * 0.44, ir * 0.3, ir * 0.24, -0.5, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.arc(ix + ir * 0.4, iy + ir * 0.4, ir * 0.16, 0, TAU); ctx.fill()
    ctx.globalAlpha = 1

    // Lash line: heavier at the outer corner, which is most of what separates a
    // human eye from a circle.
    ctx.save()
    ctx.strokeStyle = '#33211a'
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, ry * 0.3)
    ctx.beginPath()
    ctx.ellipse(cx, ey, rx * 1.01, ry * 1.01, tilt, Math.PI * 1.04, Math.PI * 1.96)
    ctx.stroke()
    ctx.lineWidth = Math.max(1, ry * 0.42)
    ctx.beginPath()
    ctx.ellipse(cx, ey, rx * 1.01, ry * 1.01, tilt, Math.PI * (s < 0 ? 1.04 : 1.52), Math.PI * (s < 0 ? 1.46 : 1.96))
    ctx.stroke()
    // Lower lid, a whisper only.
    ctx.globalAlpha = 0.4
    ctx.lineWidth = Math.max(0.8, ry * 0.16)
    ctx.beginPath()
    ctx.ellipse(cx, ey, rx * 0.98, ry * 0.98, tilt, Math.PI * 0.12, Math.PI * 0.88)
    ctx.stroke()
    ctx.restore()
  }
}

/** Brows. High and open is friendly; low and flat is stern. */
function drawBrows(ctx, f, look) {
  const { headR, eo, ey } = f
  const b = look.brows
  ctx.save()
  ctx.strokeStyle = shade(look.hairHex, -0.32)
  ctx.lineWidth = Math.max(1, headR * b.w)
  ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    const y = ey - headR * b.lift
    ctx.beginPath()
    ctx.moveTo(s * (eo - headR * 0.26), y + headR * b.tilt)
    ctx.quadraticCurveTo(s * eo, y - headR * b.arch, s * (eo + headR * 0.26), y - headR * b.tilt * 0.4)
    ctx.stroke()
  }
  ctx.restore()
}

/** Nose — a bridge shadow and a lit tip, rather than a drawn-on line. */
function drawNose(ctx, f, look) {
  const { headY, headR } = f
  const n = look.nose
  const ty = headY + headR * n.len         // tip
  ctx.save()
  if (n.bridge > 0) {
    ctx.strokeStyle = shade(look.skinHex, -0.24)
    ctx.globalAlpha = 0.55
    ctx.lineWidth = Math.max(0.8, headR * 0.035)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-headR * 0.02, ty - headR * n.bridge)
    ctx.lineTo(-headR * 0.035, ty - headR * 0.04)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  // Underside shadow, then the lit tip on top of it.
  ctx.fillStyle = shade(look.skinHex, -0.3)
  ctx.beginPath()
  ctx.ellipse(0, ty, headR * n.w, headR * n.w * 0.8, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = shade(look.skinHex, 0.2)
  ctx.beginPath()
  ctx.ellipse(-headR * n.w * 0.18, ty - headR * n.w * 0.28, headR * n.w * 0.6, headR * n.w * 0.45, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** Mouth. `open` decides whether the jaw drops, `curve` how big the smile is. */
function drawMouth(ctx, f, look) {
  const { h, headY, headR } = f
  const m = look.mouth
  const my = headY + headR * 0.62
  const mw = headR * m.w
  const drop = headR * m.open
  const lift = headR * m.curve * 0.5

  if (drop < headR * 0.05) {
    // Closed smile: a tapered curve with a hint of a lower lip under it.
    ctx.save()
    ctx.strokeStyle = '#7a4034'
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, headR * 0.075)
    ctx.beginPath()
    ctx.moveTo(-mw, my - lift * 0.5)
    ctx.quadraticCurveTo(0, my + lift, mw, my - lift * 0.5)
    ctx.stroke()
    ctx.globalAlpha = 0.35
    ctx.strokeStyle = shade(look.skinHex, -0.3)
    ctx.lineWidth = Math.max(0.8, headR * 0.035)
    ctx.beginPath()
    ctx.moveTo(-mw * 0.55, my + lift * 0.55)
    ctx.quadraticCurveTo(0, my + lift * 1.25, mw * 0.55, my + lift * 0.55)
    ctx.stroke()
    ctx.restore()
    return
  }

  const mouth = () => {
    ctx.beginPath()
    ctx.moveTo(-mw, my - lift * 0.45)
    ctx.quadraticCurveTo(0, my + lift * 0.25, mw, my - lift * 0.45)
    ctx.quadraticCurveTo(0, my + drop * 1.5, -mw, my - lift * 0.45)
    ctx.closePath()
  }
  ctx.save()
  mouth()
  ctx.fillStyle = '#6b2f31'
  ctx.fill()
  mouth(); ctx.clip()
  // Teeth along the top, then the tongue behind them.
  ctx.fillStyle = '#fffaf2'
  ctx.beginPath()
  ctx.ellipse(0, my - lift * 0.55, mw * 0.92, drop * 0.5, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#e0737d'
  ctx.beginPath()
  ctx.ellipse(0, my + drop * 1.0, mw * 0.6, drop * 0.7, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
  // Lip line, heavier at the corners.
  ctx.save()
  mouth()
  ctx.strokeStyle = '#7a3a34'
  ctx.lineWidth = Math.max(1, headR * 0.045)
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
}

/**
 * An elder's beard.
 *
 * The old one was a single smooth shield of near-white, starting right under
 * the nose and covering the mouth, the chin and half the chest. It didn't read
 * as hair at all — it read as a surgical mask, which is exactly what Tom saw.
 *
 * What makes a beard read as a beard: it is the SAME HAIR as the head, so it
 * connects to the sideburns and takes its colour from the hair (silvered with
 * age, not bleached to paper); it has a moustache above the mouth and a mass
 * below it, with the mouth visible between them; the bottom edge is waved into
 * lobes rather than smooth; and a few strand lines run down it. All five are
 * here, and the mouth still shows — this is a children's game, and a wizard who
 * can't smile is a wizard with no expression.
 */
function drawBeard(ctx, f, look) {
  const { h, headY, headR } = f
  // Silvered hair, not white paper: a dark-haired elder greys, a fair one goes
  // white, and either way the beard belongs to the head it's attached to.
  const col = mix(look.hairHex, '#eceaf6', 0.68)
  const dark = shade(col, -0.22)

  // Sideburns: the beard has to grow out of the hair, or it looks stuck on.
  ctx.fillStyle = col
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * headR * 0.94, headY - headR * 0.12)
    ctx.quadraticCurveTo(s * headR * 1.0, headY + headR * 0.5, s * headR * 0.66, headY + headR * 0.86)
    ctx.quadraticCurveTo(s * headR * 0.82, headY + headR * 0.36, s * headR * 0.74, headY - headR * 0.1)
    ctx.closePath()
    ctx.fill()
  }

  // The mass below the mouth: jaw, chin, and a waved hem.
  const jawY = headY + headR * 0.78
  const tipY = headY + headR * 2.0
  const beard = () => {
    ctx.beginPath()
    ctx.moveTo(-headR * 0.8, headY + headR * 0.28)
    ctx.quadraticCurveTo(-headR * 0.86, jawY, -headR * 0.6, headY + headR * 1.35)
    // Three lobes along the bottom, so the hem is hair rather than a hem.
    ctx.quadraticCurveTo(-headR * 0.5, tipY * 0.55 + headY * 0.45, -headR * 0.26, headY + headR * 1.78)
    ctx.quadraticCurveTo(-headR * 0.12, tipY, 0, headY + headR * 1.92)
    ctx.quadraticCurveTo(headR * 0.12, tipY, headR * 0.26, headY + headR * 1.78)
    ctx.quadraticCurveTo(headR * 0.5, tipY * 0.55 + headY * 0.45, headR * 0.6, headY + headR * 1.35)
    ctx.quadraticCurveTo(headR * 0.86, jawY, headR * 0.8, headY + headR * 0.28)
    // Upper edge, dipping below the mouth so the smile stays visible.
    ctx.quadraticCurveTo(0, headY + headR * 1.02, -headR * 0.8, headY + headR * 0.28)
    ctx.closePath()
  }
  beard()
  ctx.fillStyle = col
  ctx.fill()
  volume(ctx, beard, { x: -headR, y: headY, w: headR * 2, h: headR * 2.1 }, 0.6)

  // Strands, so it has grain.
  ctx.save()
  beard(); ctx.clip()
  ctx.strokeStyle = dark
  ctx.globalAlpha = 0.45
  ctx.lineWidth = Math.max(0.8, headR * 0.045)
  ctx.lineCap = 'round'
  for (const sx of [-0.44, -0.16, 0.16, 0.44]) {
    ctx.beginPath()
    ctx.moveTo(headR * sx * 1.5, headY + headR * 0.95)
    ctx.quadraticCurveTo(headR * sx * 1.2, headY + headR * 1.45, headR * sx, headY + headR * 1.85)
    ctx.stroke()
  }
  ctx.restore()
  beard()
  outline(ctx, h, col, 0.65)

  // The mouth sits between moustache and beard.
  drawMouth(ctx, f, look)

  // Moustache last, over the top lip: two lobes with a dip in the middle.
  const mY = headY + headR * 0.42
  const tash = () => {
    ctx.beginPath()
    ctx.moveTo(-headR * 0.58, mY - headR * 0.06)
    ctx.quadraticCurveTo(-headR * 0.34, mY - headR * 0.24, -headR * 0.06, mY - headR * 0.02)
    ctx.quadraticCurveTo(0, mY + headR * 0.04, headR * 0.06, mY - headR * 0.02)
    ctx.quadraticCurveTo(headR * 0.34, mY - headR * 0.24, headR * 0.58, mY - headR * 0.06)
    ctx.quadraticCurveTo(headR * 0.42, mY + headR * 0.32, 0, mY + headR * 0.22)
    ctx.quadraticCurveTo(-headR * 0.42, mY + headR * 0.32, -headR * 0.58, mY - headR * 0.06)
    ctx.closePath()
  }
  tash()
  ctx.fillStyle = shade(col, 0.08)
  ctx.fill()
  volume(ctx, tash, { x: -headR * 0.6, y: mY - headR * 0.3, w: headR * 1.2, h: headR * 0.7 }, 0.5)
  tash()
  outline(ctx, h, col, 0.6)
}

// --- Hair ---------------------------------------------------------------------
/**
 * Drawn in two passes. The `back` pass runs before the head so long hair falls
 * behind it and over the shoulders; the `front` pass runs after, for the fringe
 * and the locks that frame the face. Length 0 has no front pass at all — it's
 * tucked under the hat.
 */
function drawHair(ctx, h, headY, headR, look, view, pass) {
  const { hairHex: col, hairStyle: style } = look
  // How far past the jaw the hair falls, by length. Shortened when the head
  // dropped and grew: measured from the head's centre, the old numbers put
  // "Long" somewhere around the ankles.
  const fall = [0, 0.085, 0.24, 0.40][style] * h

  if (pass === 'back') {
    // The mass behind the skull — always present, so the back view is never a
    // void. It gets the same lighting and line as everything else, or from
    // behind the wizard is just a flat egg of colour.
    const mass = () => {
      ctx.beginPath()
      ctx.ellipse(0, headY - headR * 0.04, headR * 1.05, headR * 1.1, 0, 0, TAU)
      ctx.closePath()
    }
    mass()
    ctx.fillStyle = col
    ctx.fill()
    volume(ctx, mass, { x: -headR * 1.1, y: headY - headR * 1.2, w: headR * 2.2, h: headR * 2.3 }, 0.9)
    mass()
    outline(ctx, h, col, 0.8)
    ctx.fillStyle = col
    // The full curtain only makes sense from behind. Drawn in the front view it
    // hangs down the middle of the chest and reads as a long white bib, so from
    // the front the length is carried by the side locks in the front pass.
    if (fall > 0 && view === 'back') {
      // A curtain down the back. It used to taper to a point, which with the
      // bigger head read as a sausage hanging off the skull; hair falls roughly
      // parallel and rounds off at the hem, so that's what it does now.
      const curtain = () => {
        ctx.beginPath()
        ctx.moveTo(-headR * 0.98, headY - headR * 0.1)
        ctx.bezierCurveTo(-headR * 1.06, headY + fall * 0.45, -headR * 0.92, headY + fall * 0.84, -headR * 0.72, headY + fall)
        ctx.quadraticCurveTo(0, headY + fall * 1.14, headR * 0.72, headY + fall)
        ctx.bezierCurveTo(headR * 0.92, headY + fall * 0.84, headR * 1.06, headY + fall * 0.45, headR * 0.98, headY - headR * 0.1)
        ctx.closePath()
      }
      curtain()
      const g = ctx.createLinearGradient(0, headY, 0, headY + fall)
      g.addColorStop(0, col)
      g.addColorStop(1, shade(col, -0.32))
      ctx.fillStyle = g
      ctx.fill()
      // Strands, so it's hair rather than a cape.
      ctx.save()
      curtain(); ctx.clip()
      ctx.strokeStyle = shade(col, -0.3)
      ctx.globalAlpha = 0.4
      ctx.lineWidth = Math.max(0.8, headR * 0.06)
      ctx.lineCap = 'round'
      for (const sx of [-0.62, -0.22, 0.22, 0.62]) {
        ctx.beginPath()
        ctx.moveTo(headR * sx * 0.8, headY + headR * 0.2)
        ctx.quadraticCurveTo(headR * sx * 1.1, headY + fall * 0.6, headR * sx, headY + fall * 0.98)
        ctx.stroke()
      }
      ctx.restore()
      curtain()
      outline(ctx, h, col, 0.7)
    }
    return
  }

  // Front pass
  ctx.fillStyle = col
  if (style === 0 && view === 'front') {
    // Cropped still needs a hairline from the front, or the face reads as bald
    // rather than as hair tucked neatly under the hat.
    {
      ctx.beginPath()
      ctx.moveTo(-headR * 0.95, headY - headR * 0.28)
      ctx.quadraticCurveTo(0, headY - headR * 1.02, headR * 0.95, headY - headR * 0.28)
      ctx.quadraticCurveTo(0, headY - headR * 0.66, -headR * 0.95, headY - headR * 0.28)
      ctx.closePath()
      ctx.fill()
    }
    return
  }
  if (view === 'front' && style === 0) return
  if (view === 'front') {
    // A fringe across the brow.
    ctx.beginPath()
    ctx.moveTo(-headR * 0.98, headY - headR * 0.1)
    ctx.quadraticCurveTo(-headR * 0.5, headY - headR * 0.95, headR * 0.2, headY - headR * 0.72)
    ctx.quadraticCurveTo(headR * 0.85, headY - headR * 0.6, headR * 0.98, headY - headR * 0.05)
    ctx.quadraticCurveTo(headR * 0.4, headY - headR * 0.5, -headR * 0.98, headY - headR * 0.1)
    ctx.closePath()
    ctx.fill()
    // Side locks, length-dependent.
    if (style >= 1) {
      for (const sgn of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(sgn * headR * 0.96, headY - headR * 0.36)
        ctx.quadraticCurveTo(sgn * headR * 1.16, headY + fall * 0.5, sgn * headR * 0.92, headY + fall * 0.95)
        ctx.quadraticCurveTo(sgn * headR * 0.78, headY + fall * 0.42, sgn * headR * 0.74, headY - headR * 0.26)
        ctx.closePath()
        ctx.fill()
      }
    }
  } else {
    // From behind you are looking at the back of someone's head, which is hair
    // — all of it, at every length. This used to be a thin rim around a bare
    // skin-coloured skull, because the head is drawn over the hair mass and
    // nothing put the hair back on top. The cap fixes that.
    const cap = () => {
      ctx.beginPath()
      ctx.ellipse(0, headY - headR * 0.05, headR * 0.99, headR * 1.04, 0, 0, TAU)
      ctx.closePath()
    }
    cap()
    ctx.fillStyle = col
    ctx.fill()
    volume(ctx, cap, { x: -headR, y: headY - headR * 1.1, w: headR * 2, h: headR * 2.1 }, 1.25)
    cap()
    outline(ctx, h, col, 0.7)
    // A parting, so the back of the head has some grain.
    ctx.save()
    cap(); ctx.clip()
    ctx.strokeStyle = shade(col, -0.3)
    ctx.globalAlpha = 0.3
    ctx.lineWidth = Math.max(0.8, headR * 0.055)
    ctx.lineCap = 'round'
    for (const sx of [-0.42, 0, 0.42]) {
      ctx.beginPath()
      ctx.moveTo(headR * sx * 0.5, headY - headR * 0.95)
      ctx.quadraticCurveTo(headR * sx, headY - headR * 0.1, headR * sx * 1.1, headY + headR * 0.9)
      ctx.stroke()
    }
    ctx.restore()
  }
}

// --- Hats ---------------------------------------------------------------------
function drawHat(ctx, h, kind, robe, trim, t, view = 'front') {
  const brimY = -h * 0.718
  const hatCol = shade(robe, 0.1)
  // How far the hat's lower edge bows DOWN at the centre.
  //
  // A hat sits on a round skull, so the edge you see is an arc that dips
  // towards you in the middle — not a straight line. Drawn straight, the hat's
  // two bottom corners hang in the air either side of the head, which is
  // exactly the "floating just above" look. Bowing the edge tucks it onto the
  // head. Small on purpose: the eyebrows are only a little below this.
  const sit = h * 0.024

  /** A shadow on the forehead, so the hat is ON the head rather than near it. */
  const seat = w => {
    ctx.save()
    const g = ctx.createLinearGradient(0, brimY, 0, brimY + h * 0.055)
    g.addColorStop(0, 'rgba(60,30,20,0.4)')
    g.addColorStop(1, 'rgba(60,30,20,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-w / 2, brimY)
    ctx.quadraticCurveTo(0, brimY + sit + h * 0.05, w / 2, brimY)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const cone = (height, width, curve) => {
    ctx.beginPath()
    ctx.moveTo(-width / 2, brimY)
    ctx.quadraticCurveTo(-width * 0.1, brimY - height * 0.78, curve, brimY - height)
    ctx.quadraticCurveTo(width * 0.18, brimY - height * 0.5, width / 2, brimY)
    // The seated lower edge, bowing down over the skull.
    ctx.quadraticCurveTo(0, brimY + sit, -width / 2, brimY)
    ctx.closePath()
    const g = ctx.createLinearGradient(-width / 2, 0, width / 2, 0)
    g.addColorStop(0, shade(hatCol, -0.26)); g.addColorStop(0.45, hatCol); g.addColorStop(1, shade(hatCol, -0.3))
    ctx.fillStyle = g
    ctx.fill()
    outline(ctx, h, robe)
  }
  const brim = (w, thick) => {
    ctx.beginPath()
    ctx.ellipse(0, brimY + sit * 0.4, w / 2, thick, 0, 0, TAU)
    ctx.fillStyle = shade(robe, -0.25)
    ctx.fill()
    outline(ctx, h, robe)
  }
  const band = w => {
    ctx.fillStyle = trim
    ctx.globalAlpha = 0.9
    ctx.fillRect(-w / 2 * 0.86, brimY - h * 0.035, w * 0.86, h * 0.028)
    ctx.globalAlpha = 1
  }
  const star = (sx, sy, size) => {
    ctx.save()
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t / 380)
    ctx.fillStyle = trim
    ctx.font = `900 ${size}px serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('✦', sx, sy)
    ctx.restore()
  }

  if (kind === 'wide') {
    seat(h * 0.62)
    brim(h * 0.62, h * 0.028)
    cone(h * 0.30, h * 0.32, h * 0.02)
    band(h * 0.32)
    star(h * 0.02, brimY - h * 0.31, h * 0.075)
  } else if (kind === 'hood') {
    // A proper draped cowl, not a dome on a stick. It's one path with the face
    // opening punched out of it (evenodd), so the cloth genuinely FRAMES the
    // face — falling past the jaw and onto the shoulders — instead of sitting
    // on top of the head like a bell. The peak flops forward, which is what
    // stops a hood reading as a helmet.
    // Kept snug: no wider than the shoulders and hemmed at the collar, so the
    // robe, the cape and the trim are all still visible underneath. An oversized
    // cowl swallows the whole figure and every hooded form looks the same.
    // Sized from the head, not from the hat line — the face opening has to
    // clear the chin or the hood eats the smile, and the hem has to reach the
    // shoulders or there's a band of bare neck under it.
    const W = h * 0.215                // half-width where the cloth meets the shoulders
    const peakY = -h * 0.885
    const hemY = -h * 0.425
    const faceY = -h * 0.605           // matches headY in drawWizard
    const faceRX = h * 0.114, faceRY = h * 0.142
    const front = view === 'front'

    // The opening.
    //
    // Not a porthole: a real hood is open at the BOTTOM. The cloth arches over
    // the head and runs down each side past the temples, and below the cheekbone
    // there is nothing there — you can see the chin, the jaw and the neck. Cut
    // as a tunnel that runs off the bottom of the cowl rather than as a closed
    // ellipse, which is what made it read as a diving mask.
    const oX = faceRX * 1.02
    const oTop = faceY - faceRY * 1.04
    const oSide = faceY + faceRY * 0.18          // where the cloth stops covering
    const oBot = hemY + h * 0.05                 // past the hem, so the cut is clean

    /** The cloth, opening included. One function so the fill, the clip and the
     *  outline use exactly the same shape — which is what stops the hem being
     *  stroked straight across the open front. */
    const cowl = () => {
      ctx.beginPath()
      // Left shoulder, up the outside of the cowl to the peak.
      ctx.moveTo(-W, hemY)
      ctx.bezierCurveTo(-W * 1.1, brimY + h * 0.02, -h * 0.17, peakY + h * 0.10, -h * 0.026, peakY + h * 0.012)
      // The peak: a real point, tipping forward, so it reads as a hood from
      // behind too rather than as a dome.
      ctx.quadraticCurveTo(h * 0.022, peakY - h * 0.026, h * 0.072, peakY + h * 0.03)
      // Down the right side to the other shoulder.
      ctx.bezierCurveTo(h * 0.15, brimY + h * 0.01, W * 1.08, brimY + h * 0.11, W, hemY)
      // Hem, sagging slightly between the shoulders.
      ctx.quadraticCurveTo(0, hemY + h * 0.035, -W, hemY)
      ctx.closePath()
      if (front) {
        ctx.moveTo(-oX, oBot)
        ctx.lineTo(-oX, oSide)
        ctx.bezierCurveTo(-oX, oTop, oX, oTop, oX, oSide)
        ctx.lineTo(oX, oBot)
        ctx.closePath()
      }
    }

    cowl()
    const g = ctx.createLinearGradient(-W, 0, W, 0)
    g.addColorStop(0, shade(hatCol, -0.34)); g.addColorStop(0.38, hatCol)
    g.addColorStop(0.72, shade(hatCol, -0.14)); g.addColorStop(1, shade(hatCol, -0.38))
    ctx.fillStyle = g
    ctx.fill('evenodd')
    // Outline clipped to the cloth, so the hem isn't drawn across the opening.
    ctx.save()
    cowl(); ctx.clip('evenodd')
    cowl(); outline(ctx, h, robe, 1.4)
    ctx.restore()

    if (front) {
      // Trim piping along the edge of the opening — reads as a lined hood, and
      // it's the only place a hooded form's second colour shows near the face.
      // Piping over the arch only. Running it down the legs as well put a
      // bracket round the face, which is the porthole look again.
      const edge = () => {
        ctx.beginPath()
        ctx.moveTo(-oX, oSide)
        ctx.bezierCurveTo(-oX, oTop, oX, oTop, oX, oSide)
      }
      ctx.save()
      cowl(); ctx.clip('evenodd')
      edge()
      ctx.strokeStyle = trim
      ctx.lineWidth = Math.max(1, h * 0.018)
      ctx.globalAlpha = 0.75
      ctx.stroke()
      ctx.restore()
      ctx.save()
      // Shadow across the brow, so the face sits INSIDE the hood rather than
      // being framed by it.
      edge()
      ctx.closePath()
      ctx.clip()
      ctx.globalAlpha = 1
      const sg = ctx.createLinearGradient(0, oTop, 0, faceY + faceRY * 0.1)
      sg.addColorStop(0, 'rgba(4,2,16,.55)'); sg.addColorStop(1, 'rgba(4,2,16,0)')
      ctx.fillStyle = sg
      ctx.fillRect(-oX, oTop, oX * 2, faceRY * 1.5)
      ctx.restore()
    } else {
      // A centre seam down the back of the hood, so it isn't a flat blob.
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = shade(hatCol, -0.5)
      ctx.lineWidth = Math.max(1, h * 0.007)
      ctx.beginPath()
      ctx.moveTo(h * 0.012, peakY + h * 0.03)
      ctx.quadraticCurveTo(-h * 0.008, brimY - h * 0.02, 0, hemY - h * 0.01)
      ctx.stroke()
      ctx.restore()
    }

    // A fold down each side of the cowl.
    ctx.save()
    ctx.globalAlpha = 0.28
    ctx.strokeStyle = shade(hatCol, -0.55)
    ctx.lineWidth = Math.max(1, h * 0.006)
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sx * h * 0.13, brimY - h * 0.045)
      ctx.quadraticCurveTo(sx * h * 0.175, brimY + h * 0.07, sx * h * 0.158, hemY)
      ctx.stroke()
    }
    ctx.restore()
  } else if (kind === 'horned') {
    seat(h * 0.30)
    cone(h * 0.30, h * 0.30, h * 0.015)
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * h * 0.12, brimY - h * 0.02)
      ctx.quadraticCurveTo(s * h * 0.26, brimY - h * 0.10, s * h * 0.21, brimY - h * 0.20)
      ctx.quadraticCurveTo(s * h * 0.20, brimY - h * 0.08, s * h * 0.10, brimY - h * 0.04)
      ctx.closePath()
      ctx.fillStyle = trim; ctx.fill()
      outline(ctx, h, trim, 0.7)
    }
    band(h * 0.30)
  } else if (kind === 'crown') {
    const w = h * 0.30
    seat(w)
    ctx.beginPath()
    ctx.moveTo(-w / 2, brimY)
    ctx.lineTo(-w / 2, brimY - h * 0.05)
    // Four spikes across the width. This ran to i < 5, which built a fifth
    // spike starting AT the right edge and running off it — the strange angled
    // section that appeared on the staff side.
    for (let i = 0; i < 4; i++) {
      const px = -w / 2 + (w / 4) * i
      ctx.lineTo(px + w / 8, brimY - h * (i % 2 === 0 ? 0.14 : 0.10))
      ctx.lineTo(px + w / 4, brimY - h * 0.05)
    }
    ctx.lineTo(w / 2, brimY)
    ctx.quadraticCurveTo(0, brimY + sit, -w / 2, brimY)
    ctx.closePath()
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, shade(trim, -0.35)); g.addColorStop(0.5, trim); g.addColorStop(1, shade(trim, -0.4))
    ctx.fillStyle = g; ctx.fill()
    outline(ctx, h, trim, 0.8)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(-w * 0.25 + i * w * 0.25, brimY - h * 0.035, h * 0.015, 0, TAU)
      ctx.fillStyle = i === 1 ? '#ff6bff' : robe
      ctx.fill()
    }
  } else {
    seat(h * 0.30)
    cone(h * 0.34, h * 0.30, h * 0.03)
    band(h * 0.30)
    star(h * 0.035, brimY - h * 0.35, h * 0.08)
  }
}

// --- Staves -------------------------------------------------------------------
function drawStaff(ctx, h, kind, trim, t, stride) {
  const sx = h * 0.24 + stride * h * 0.01
  const top = -h * (kind === 'wand' ? 0.52 : 0.86)
  const bottom = kind === 'wand' ? -h * 0.30 : -h * 0.02

  ctx.save()
  ctx.strokeStyle = '#6b4a2f'
  ctx.lineWidth = Math.max(1.2, h * (kind === 'wand' ? 0.014 : 0.021))
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(sx, bottom)
  ctx.lineTo(sx + (kind === 'crook' ? -h * 0.01 : 0), top)
  ctx.stroke()

  const glow = (gx, gy, r) => {
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.35, trim)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t / 300)
    ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill()
    ctx.globalAlpha = 1
  }

  if (kind === 'orb') {
    ctx.beginPath(); ctx.arc(sx, top - h * 0.02, h * 0.045, 0, TAU)
    ctx.fillStyle = trim; ctx.fill()
    glow(sx, top - h * 0.02, h * 0.10)
  } else if (kind === 'crook') {
    ctx.beginPath()
    ctx.arc(sx + h * 0.03, top + h * 0.01, h * 0.042, Math.PI, TAU * 0.78)
    ctx.strokeStyle = '#6b4a2f'
    ctx.stroke()
    glow(sx + h * 0.06, top + h * 0.01, h * 0.06)
  } else if (kind === 'staff') {
    ctx.beginPath(); ctx.arc(sx, top, h * 0.03, 0, TAU)
    ctx.fillStyle = trim; ctx.fill()
    glow(sx, top, h * 0.085)
  } else {
    glow(sx, top, h * 0.07)
  }
  ctx.restore()
}

// --- Auras --------------------------------------------------------------------
function drawAura(ctx, h, kind, t, trim, layer) {
  if (!kind) return
  ctx.save()

  if (kind === 'sparkle' && layer === 'over') {
    for (let i = 0; i < 9; i++) {
      const a = t / 1100 + (i * TAU) / 9
      const rr = h * (0.26 + 0.05 * Math.sin(t / 700 + i))
      ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t / 420 + i))
      ctx.fillStyle = i % 2 ? trim : '#ffffff'
      const px = Math.cos(a) * rr, py = -h * 0.45 + Math.sin(a) * rr * 0.5
      ctx.fillRect(px - h * 0.008, py - h * 0.008, h * 0.016, h * 0.016)
    }
  } else if (kind === 'flame' && layer === 'under') {
    for (let i = 0; i < 7; i++) {
      const fx = (-0.22 + i * 0.073) * h
      const fh = h * (0.07 + 0.05 * Math.abs(Math.sin(t / 160 + i * 1.7)))
      ctx.globalAlpha = 0.5
      const g = ctx.createLinearGradient(0, 0, 0, -fh)
      g.addColorStop(0, 'rgba(255,150,40,0.9)')
      g.addColorStop(1, 'rgba(255,60,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(fx - h * 0.018, 0)
      ctx.quadraticCurveTo(fx, -fh, fx + h * 0.018, 0)
      ctx.closePath(); ctx.fill()
    }
  } else if (kind === 'frost' && layer === 'over') {
    for (let i = 0; i < 8; i++) {
      const py = -((t / 22 + i * 90) % (h * 0.9))
      const px = Math.sin(t / 900 + i * 2) * h * 0.24
      ctx.globalAlpha = 0.55
      ctx.fillStyle = '#dff6ff'
      ctx.fillRect(px, py, h * 0.012, h * 0.012)
    }
  } else if (kind === 'star' && layer === 'over') {
    ctx.globalAlpha = 0.8
    ctx.fillStyle = trim
    ctx.font = `900 ${h * 0.06}px serif`
    ctx.textAlign = 'center'
    for (let i = 0; i < 5; i++) {
      const a = t / 1600 + (i * TAU) / 5
      ctx.globalAlpha = 0.3 + 0.55 * Math.abs(Math.sin(a * 2))
      ctx.fillText('★', Math.cos(a) * h * 0.28, -h * 0.5 + Math.sin(a) * h * 0.14)
    }
  } else if (kind === 'leaf' && layer === 'over') {
    for (let i = 0; i < 6; i++) {
      const a = t / 1400 + i
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#8fe0a0'
      ctx.save()
      ctx.translate(Math.cos(a) * h * 0.26, -h * 0.3 + Math.sin(a * 1.3) * h * 0.2)
      ctx.rotate(a * 2)
      ctx.beginPath(); ctx.ellipse(0, 0, h * 0.022, h * 0.009, 0, 0, TAU); ctx.fill()
      ctx.restore()
    }
  } else if (kind === 'storm' && layer === 'over') {
    if (Math.sin(t / 240) > 0.82) {
      ctx.globalAlpha = 0.85
      ctx.strokeStyle = '#ffe9a0'
      ctx.lineWidth = Math.max(1, h * 0.009)
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(s * h * 0.2, -h * 0.62)
        ctx.lineTo(s * h * 0.26, -h * 0.5)
        ctx.lineTo(s * h * 0.2, -h * 0.45)
        ctx.lineTo(s * h * 0.28, -h * 0.3)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

// --- Colour helper ------------------------------------------------------------
/** Lighten (positive) or darken (negative) a #rrggbb colour. */
export /** Blend two hex colours. `t` 0 = a, 1 = b. */
function mix(a, b, t) {
  const pa = /^#?([0-9a-f]{6})$/i.exec(String(a)), pb = /^#?([0-9a-f]{6})$/i.exec(String(b))
  if (!pa || !pb) return a
  const na = parseInt(pa[1], 16), nb = parseInt(pb[1], 16)
  const ch = i => {
    const va = (na >> (16 - i * 8)) & 255, vb = (nb >> (16 - i * 8)) & 255
    return Math.round(va + (vb - va) * t)
  }
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`
}

function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex))
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)
    return Math.max(0, Math.min(255, Math.round(out)))
  })
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}
