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

  // Proportions. A single tapered cone reads as a traffic cone rather than a
  // person, so the silhouette is built from a waist, shoulders, sleeves and a
  // head large enough to carry a face — roughly a five-heads-tall cartoon
  // figure, which is what makes it read as a small wizard rather than a shape.
  const hem = h * 0.215, waist = h * 0.145, shoulder = h * 0.175
  const yWaist = -h * 0.34, yShoulder = -h * 0.52
  const headY = -h * 0.665, headR = h * 0.105

  // ── Shoes peeking under the hem ──
  ctx.fillStyle = shade(robe, -0.7)
  for (const sgn of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sgn * h * 0.075 + sway * 0.5, -h * 0.012, h * 0.045, h * 0.022, 0, 0, TAU)
    ctx.fill()
  }

  // ── Robe ──
  ctx.beginPath()
  ctx.moveTo(-hem + sway, 0)
  ctx.quadraticCurveTo(-hem * 0.92, yWaist * 0.62, -waist, yWaist)
  ctx.lineTo(-shoulder, yShoulder)
  ctx.quadraticCurveTo(0, yShoulder - h * 0.03, shoulder, yShoulder)
  ctx.lineTo(waist, yWaist)
  ctx.quadraticCurveTo(hem * 0.92, yWaist * 0.62, hem + sway, 0)
  ctx.closePath()
  const rg = ctx.createLinearGradient(-hem, 0, hem, 0)
  rg.addColorStop(0, shade(robe, -0.5))
  rg.addColorStop(0.34, robe)
  rg.addColorStop(0.6, shade(robe, 0.12))
  rg.addColorStop(1, shade(robe, -0.55))
  ctx.fillStyle = rg
  ctx.fill()

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
  // The arms swing OUTSIDE the robe silhouette and carry an outline. Tucked
  // against the body they just read as two beige buttons stuck on a bell.
  const armSwing = stride * h * 0.022
  for (const sgn of [-1, 1]) {
    const handY = -h * 0.185 + sgn * armSwing
    const outer = shoulder + h * 0.085
    ctx.beginPath()
    ctx.moveTo(sgn * shoulder * 0.92, yShoulder + h * 0.005)
    ctx.quadraticCurveTo(sgn * (outer + h * 0.02), yWaist + h * 0.02, sgn * outer, handY)
    ctx.lineTo(sgn * (outer - h * 0.055), handY + h * 0.008)
    ctx.quadraticCurveTo(sgn * (shoulder - h * 0.01), yWaist, sgn * shoulder * 0.5, yShoulder + h * 0.025)
    ctx.closePath()
    ctx.fillStyle = sgn < 0 ? shade(robe, -0.28) : shade(robe, 0.08)
    ctx.fill()
    ctx.strokeStyle = shade(robe, -0.6)
    ctx.lineWidth = Math.max(0.8, h * 0.006)
    ctx.stroke()
    // Cuff, then the hand clear of the sleeve.
    ctx.fillStyle = trim
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.ellipse(sgn * (outer - h * 0.024), handY + h * 0.004, h * 0.028, h * 0.013, sgn * 0.3, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(sgn * (outer - h * 0.012), handY + h * 0.028, h * 0.025, 0, TAU)
    ctx.fillStyle = look.skinHex
    ctx.fill()
  }

  // ── Shoulder cape / collar ──
  ctx.beginPath()
  ctx.moveTo(-shoulder - h * 0.035, yShoulder + h * 0.03)
  ctx.quadraticCurveTo(0, yShoulder - h * 0.075, shoulder + h * 0.035, yShoulder + h * 0.03)
  ctx.quadraticCurveTo(0, yShoulder + h * 0.075, -shoulder - h * 0.035, yShoulder + h * 0.03)
  ctx.closePath()
  ctx.fillStyle = shade(robe, 0.2)
  ctx.fill()
  ctx.strokeStyle = trim
  ctx.lineWidth = Math.max(1, h * 0.008)
  ctx.globalAlpha = 0.75
  ctx.stroke()
  ctx.globalAlpha = 1

  // ── Staff, held off to one side so it never covers the hat ──
  if (form.staff && form.staff !== 'none') drawStaff(ctx, h, form.staff, trim, t, stride)

  // ── Hair behind the head, so long styles fall over the shoulders ──
  drawHair(ctx, h, headY, headR, look, view, 'back')

  // ── Head ──
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, TAU)
  ctx.fillStyle = view === 'front' ? look.skinHex : shade(look.skinHex, -0.12)
  ctx.fill()

  if (view === 'front') {
    // A face with a bit of life in it: wide eyes and a small smile read as
    // friendly at 64px, which is the size most of the UI shows him at.
    ctx.fillStyle = '#2a1c16'
    const eo = headR * 0.36, ey = headY - headR * 0.08
    ctx.beginPath(); ctx.arc(-eo, ey, headR * 0.15, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(eo, ey, headR * 0.15, 0, TAU); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(-eo + headR * 0.06, ey - headR * 0.05, headR * 0.05, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(eo + headR * 0.06, ey - headR * 0.05, headR * 0.05, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#7a4a38'
    ctx.lineWidth = Math.max(1, headR * 0.1)
    ctx.beginPath()
    ctx.arc(0, headY + headR * 0.12, headR * 0.34, 0.25 * Math.PI, 0.75 * Math.PI)
    ctx.stroke()
    if (form.rank >= 5) {                     // elders get a beard
      ctx.beginPath()
      ctx.moveTo(-headR * 0.8, headY + headR * 0.18)
      ctx.quadraticCurveTo(-headR * 0.5, headY + headR * 3.1, 0, headY + headR * 3.3)
      ctx.quadraticCurveTo(headR * 0.5, headY + headR * 3.1, headR * 0.8, headY + headR * 0.18)
      ctx.quadraticCurveTo(0, headY + headR * 1.1, -headR * 0.8, headY + headR * 0.18)
      ctx.closePath()
      ctx.fillStyle = '#f4f4ff'
      ctx.fill()
    }
  }

  // ── Hair in front of the head: fringe and side locks ──
  drawHair(ctx, h, headY, headR, look, view, 'front')

  // ── Hat, drawn last so its brim sits over the head ──
  drawHat(ctx, h, form.hat || 'pointed', robe, trim, t)

  drawAura(ctx, h, form.aura, t, trim, 'over')
  ctx.restore()
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
  // How far past the jaw the hair falls, by length.
  const fall = [0, 0.10, 0.30, 0.58][style] * h

  if (pass === 'back') {
    ctx.fillStyle = col
    // The mass behind the skull — always present, so the back view is never a void.
    ctx.beginPath()
    ctx.arc(0, headY - headR * 0.06, headR * 1.06, 0, TAU)
    ctx.fill()
    // The full curtain only makes sense from behind. Drawn in the front view it
    // hangs down the middle of the chest and reads as a long white bib, so from
    // the front the length is carried by the side locks in the front pass.
    if (fall > 0 && view === 'back') {
      // A curtain down the back, narrowing as it falls.
      ctx.beginPath()
      ctx.moveTo(-headR * 1.02, headY)
      ctx.quadraticCurveTo(-headR * 1.15, headY + fall * 0.7, -headR * 0.62, headY + fall)
      ctx.quadraticCurveTo(0, headY + fall * 1.16, headR * 0.62, headY + fall)
      ctx.quadraticCurveTo(headR * 1.15, headY + fall * 0.7, headR * 1.02, headY)
      ctx.closePath()
      const g = ctx.createLinearGradient(0, headY, 0, headY + fall)
      g.addColorStop(0, col)
      g.addColorStop(1, shade(col, -0.35))
      ctx.fillStyle = g
      ctx.fill()
    }
    return
  }

  // Front pass
  ctx.fillStyle = col
  if (style === 0) {
    // Cropped still needs a hairline from the front, or the face reads as bald
    // rather than as hair tucked neatly under the hat.
    if (view === 'front') {
      ctx.beginPath()
      ctx.moveTo(-headR * 0.95, headY - headR * 0.28)
      ctx.quadraticCurveTo(0, headY - headR * 1.02, headR * 0.95, headY - headR * 0.28)
      ctx.quadraticCurveTo(0, headY - headR * 0.66, -headR * 0.95, headY - headR * 0.28)
      ctx.closePath()
      ctx.fill()
    }
    return
  }
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
        ctx.moveTo(sgn * headR * 0.95, headY - headR * 0.3)
        ctx.quadraticCurveTo(sgn * headR * 1.22, headY + fall * 0.55, sgn * headR * 0.74, headY + fall * 0.92)
        ctx.quadraticCurveTo(sgn * headR * 0.6, headY + fall * 0.4, sgn * headR * 0.62, headY - headR * 0.2)
        ctx.closePath()
        ctx.fill()
      }
    }
  } else {
    // From behind, a soft crown highlight so the mass reads as hair not a cap.
    ctx.globalAlpha = 0.35
    ctx.fillStyle = shade(col, 0.3)
    ctx.beginPath()
    ctx.ellipse(-headR * 0.22, headY - headR * 0.4, headR * 0.42, headR * 0.22, -0.5, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

// --- Hats ---------------------------------------------------------------------
function drawHat(ctx, h, kind, robe, trim, t) {
  const brimY = -h * 0.725
  const hatCol = shade(robe, 0.1)

  const cone = (height, width, curve) => {
    ctx.beginPath()
    ctx.moveTo(-width / 2, brimY)
    ctx.quadraticCurveTo(-width * 0.1, brimY - height * 0.78, curve, brimY - height)
    ctx.quadraticCurveTo(width * 0.18, brimY - height * 0.5, width / 2, brimY)
    ctx.closePath()
    const g = ctx.createLinearGradient(-width / 2, 0, width / 2, 0)
    g.addColorStop(0, shade(hatCol, -0.4)); g.addColorStop(0.45, hatCol); g.addColorStop(1, shade(hatCol, -0.45))
    ctx.fillStyle = g
    ctx.fill()
  }
  const brim = (w, thick) => {
    ctx.beginPath()
    ctx.ellipse(0, brimY, w / 2, thick, 0, 0, TAU)
    ctx.fillStyle = shade(robe, -0.25)
    ctx.fill()
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
    brim(h * 0.62, h * 0.028)
    cone(h * 0.30, h * 0.32, h * 0.02)
    band(h * 0.32)
    star(h * 0.02, brimY - h * 0.31, h * 0.075)
  } else if (kind === 'hood') {
    ctx.beginPath()
    ctx.moveTo(-h * 0.19, brimY + h * 0.10)
    ctx.quadraticCurveTo(-h * 0.20, brimY - h * 0.20, 0, brimY - h * 0.22)
    ctx.quadraticCurveTo(h * 0.20, brimY - h * 0.20, h * 0.19, brimY + h * 0.10)
    ctx.quadraticCurveTo(0, brimY + h * 0.02, -h * 0.19, brimY + h * 0.10)
    ctx.closePath()
    const g = ctx.createLinearGradient(-h * 0.19, 0, h * 0.19, 0)
    g.addColorStop(0, shade(hatCol, -0.45)); g.addColorStop(0.45, hatCol); g.addColorStop(1, shade(hatCol, -0.5))
    ctx.fillStyle = g; ctx.fill()
    ctx.strokeStyle = trim; ctx.lineWidth = Math.max(1, h * 0.007)
    ctx.globalAlpha = 0.65; ctx.stroke(); ctx.globalAlpha = 1
  } else if (kind === 'horned') {
    cone(h * 0.30, h * 0.30, h * 0.015)
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * h * 0.12, brimY - h * 0.02)
      ctx.quadraticCurveTo(s * h * 0.26, brimY - h * 0.10, s * h * 0.21, brimY - h * 0.20)
      ctx.quadraticCurveTo(s * h * 0.20, brimY - h * 0.08, s * h * 0.10, brimY - h * 0.04)
      ctx.closePath()
      ctx.fillStyle = trim; ctx.fill()
    }
    band(h * 0.30)
  } else if (kind === 'crown') {
    const w = h * 0.30
    ctx.beginPath()
    ctx.moveTo(-w / 2, brimY)
    ctx.lineTo(-w / 2, brimY - h * 0.05)
    for (let i = 0; i < 5; i++) {
      const px = -w / 2 + (w / 4) * i
      ctx.lineTo(px + w / 8, brimY - h * (i % 2 === 0 ? 0.14 : 0.10))
      ctx.lineTo(px + w / 4, brimY - h * 0.05)
    }
    ctx.lineTo(w / 2, brimY)
    ctx.closePath()
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, shade(trim, -0.35)); g.addColorStop(0.5, trim); g.addColorStop(1, shade(trim, -0.4))
    ctx.fillStyle = g; ctx.fill()
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(-w * 0.25 + i * w * 0.25, brimY - h * 0.035, h * 0.015, 0, TAU)
      ctx.fillStyle = i === 1 ? '#ff6bff' : robe
      ctx.fill()
    }
  } else {
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
export function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex))
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)
    return Math.max(0, Math.min(255, Math.round(out)))
  })
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}
