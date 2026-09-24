import { castRay, FOV } from './raycaster.js'
import { WALL, DOOR, END, cellKey } from '../game/maze.js'
import { drawWizard } from './wizardSprite.js'
import { drawCreature } from './creatureSprite.js'

// ─── Look & feel ──────────────────────────────────────────────────────────────
const HORIZON = 0.42        // horizon above centre → more floor, reads as looking slightly down
// Vertical scale of a wall one cell tall. Lower than 1 so a wall you're pressed
// against doesn't overflow the frame — the old trick of adding a constant to the
// DISTANCE did the same job but bent every straight edge, which is what made the
// side walls kink where they met the wall ahead.
const WALL_SCALE = 0.62
const RAY_STEP = 1

const PAL = {
  ceilTop: '#040314', ceilHorizon: '#1b1450',
  floorHorizon: '#2a1f56', floorNear: '#080618',
  wallFaceA: '#45378a', wallFaceB: '#332a6e',
  mortar: '#1b1540',
  gold: '#f9ca74', goldHi: '#ffeec2', goldDark: '#8a6420',
  torch: '#ff9a38',
  exit: '#8affd4',
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0

/** Set a clip region covering only the contiguous runs of the given columns. */
function clipColumns(ctx, cols, yTop, yBot) {
  if (!cols.length) return false
  ctx.beginPath()
  let runStart = cols[0], prevCol = cols[0]
  for (let i = 1; i <= cols.length; i++) {
    const c = cols[i]
    if (c !== prevCol + RAY_STEP) {
      ctx.rect(runStart, yTop, prevCol - runStart + RAY_STEP, yBot - yTop)
      runStart = c
    }
    prevCol = c
  }
  ctx.clip()
  return true
}

// ══════════════════════════════════════════════════════════════════════════════
//  Main frame
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} s  scene: { grid, dq, stones, px, py, angle, playerRow,
 *                             playerCol, facing, time, skin, moving, effects }
 */
export function renderFrame(ctx, s) {
  const W = ctx.canvas.width, H = ctx.canvas.height
  const horizonY = H * HORIZON
  const { grid, dq, px, py, angle, time } = s
  const fov = s.fov || FOV

  drawSky(ctx, W, H, horizonY, time)

  // ── Wall pass ───────────────────────────────────────────────────────────────
  const zbuf = new Float32Array(Math.ceil(W / RAY_STEP))
  const doors = new Map()

  // Rectilinear (camera-plane) projection: screen x maps to the TANGENT of the
  // ray angle, not the angle itself.
  //
  // Stepping the angle linearly instead is a cylindrical projection, and under it
  // a straight horizontal edge in the world projects to a curve — so the top of a
  // side wall bowed, and met the top of the wall ahead at a kink instead of
  // running into the corner cleanly. Mapping through tan() is what Wolfenstein and
  // Doom did, and it keeps flat surfaces flat: a wall beside you now draws as a
  // true trapezoid whose edges continue the lines of the wall in front.
  const halfPlane = Math.tan(fov / 2)

  for (let x = 0; x < W; x += RAY_STEP) {
    const cameraX = (2 * x) / W - 1
    const rayAngle = angle + Math.atan(cameraX * halfPlane)
    const hit = castRay(grid, px, py, rayAngle)
    // Perpendicular distance to the camera plane — this is what makes the
    // projection linear, and removes the fish-eye bulge of raw ray length.
    const perp = hit.dist * Math.cos(rayAngle - angle)
    zbuf[x / RAY_STEP] = perp

    const wallH = (H * WALL_SCALE) / perp
    const top = horizonY - wallH * 0.52
    const bot = horizonY + wallH * 0.48

    if (hit.hitCell === DOOR) {
      // Doors are drawn as whole shapes after this pass — text, arches and
      // gradients are impossible to draw one pixel-column at a time. Lay down a
      // dark base here so nothing shows through.
      ctx.fillStyle = '#0a0722'
      ctx.fillRect(x, top, RAY_STEP, bot - top)
      const k = cellKey(hit.mapY, hit.mapX)
      let d = doors.get(k)
      if (!d) {
        d = { mapX: hit.mapX, mapY: hit.mapY, cols: [], minX: x, maxX: x, leftDist: perp, rightDist: perp, near: perp }
        doors.set(k, d)
      }
      d.cols.push(x)
      if (x < d.minX) { d.minX = x; d.leftDist = perp }
      if (x > d.maxX) { d.maxX = x; d.rightDist = perp }
      d.near = Math.min(d.near, perp)
      continue
    }

    drawWallSlice(ctx, x, top, bot, wallH, hit, perp, time, H)
  }

  // ── Doors ───────────────────────────────────────────────────────────────────
  const aheadKey = s.doorAhead ? cellKey(s.doorAhead.row, s.doorAhead.col) : null
  const sorted = [...doors.values()].sort((a, b) => b.near - a.near)   // far → near
  for (const d of sorted) {
    const q = dq?.[cellKey(d.mapY, d.mapX)]
    const dis = s.effects?.find(e => e.kind === 'dissolve' && e.mapX === d.mapX && e.mapY === d.mapY)
    const fade = dis ? clamp(1 - (time - dis.start) / dis.dur, 0, 1) : 1
    drawDoor(ctx, d, W, H, horizonY, time, q, aheadKey === cellKey(d.mapY, d.mapX), fade)
  }

  // ── Sprites, far to near ────────────────────────────────────────────────────
  // Everything here is occlusion-tested against the WALLS, which is why a stone
  // behind a corner is hidden — but nothing was testing the sprites against
  // each other, and the exit was simply painted last. So a Great Rune sitting
  // in the corridor in front of the way out disappeared behind a doorway ten
  // squares further off. Splitting the stones either side of the exit's own
  // depth costs one extra pass and puts them in the right order.
  const exitZ = exitDepth(s, W, H, horizonY, fov)
  drawStones(ctx, s, W, H, horizonY, zbuf, fov, exitZ, Infinity)
  drawExitGlow(ctx, s, W, H, horizonY, zbuf, s.gateMet !== false, fov)
  drawStones(ctx, s, W, H, horizonY, zbuf, fov, 0, exitZ)

  // ── The ambush ──────────────────────────────────────────────────────────────
  // Something leaping into the corridor, a beat before the pop-up takes over.
  const amb = s.effects?.find(e => e.kind === 'ambush')
  if (amb) drawAmbush(ctx, W, H, horizonY, amb, time)

  // ── Foreground ──────────────────────────────────────────────────────────────
  drawVignette(ctx, W, H)
  drawPlayerWizard(ctx, W, H, s.form, s.appearance, s.moving, time, s.lean || 0)
  drawCrosshair(ctx, W, H, horizonY)
}

// ─── Ceiling & floor ──────────────────────────────────────────────────────────
function drawSky(ctx, W, H, horizonY, time) {
  const ceil = ctx.createLinearGradient(0, 0, 0, horizonY)
  ceil.addColorStop(0, PAL.ceilTop)
  ceil.addColorStop(1, PAL.ceilHorizon)
  ctx.fillStyle = ceil
  ctx.fillRect(0, 0, W, horizonY)

  // A handful of twinkling ceiling stars, seeded so they hold still.
  ctx.save()
  for (let i = 0; i < 26; i++) {
    const sx = ((i * 2654435761) % 1000) / 1000 * W
    const sy = ((i * 40503) % 1000) / 1000 * horizonY * 0.85
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(time / 900 + i))
    ctx.globalAlpha = tw * 0.7
    ctx.fillStyle = i % 5 === 0 ? PAL.gold : '#cfd6ff'
    ctx.fillRect(sx, sy, 1.6, 1.6)
  }
  ctx.restore()

  const floor = ctx.createLinearGradient(0, horizonY, 0, H)
  floor.addColorStop(0, PAL.floorHorizon)
  floor.addColorStop(1, PAL.floorNear)
  ctx.fillStyle = floor
  ctx.fillRect(0, horizonY, W, H - horizonY)

  // Receding floor bands give the ground a sense of scale to walk over.
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  for (let i = 1; i < 9; i++) {
    const t = i / 9
    const y = horizonY + (H - horizonY) * t * t
    ctx.globalAlpha = 0.05 * t
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  ctx.restore()
}

// ─── One wall column ──────────────────────────────────────────────────────────
function drawWallSlice(ctx, x, top, bot, wallH, hit, perp, time, H) {
  const h = hash(hit.mapX, hit.mapY)
  const br = clamp(1.55 - perp / 10.5, 0.14, 1.55) * (hit.side ? 0.78 : 1)
  // Stone grain across the face, so flat walls aren't flat colour.
  const grain = 0.92 + 0.08 * Math.sin(hit.wallX * 17.3 + (h % 100))
  const base = hit.side ? 0x332a6e : 0x453b8a
  const r = clamp(((base >> 16) & 255) * br * grain, 0, 255)
  const g = clamp(((base >> 8) & 255) * br * grain, 0, 255)
  const b = clamp((base & 255) * br * grain, 0, 255)
  ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
  ctx.fillRect(x, top, RAY_STEP, bot - top)

  // Masonry. The course COUNT scales with how tall the wall appears, which
  // matters a lot: a fixed four joints stretched across a wall you're standing
  // against turned it into three wide stripes on a flat field. Scaling keeps the
  // bricks roughly constant in world size, so a near wall shows many courses and
  // a far one shows few.
  const courses = Math.round(clamp(wallH / (H * 0.085), 3, 16))
  const brickH = wallH / courses
  const bricksAcross = 4
  ctx.fillStyle = PAL.mortar
  ctx.globalAlpha = clamp(0.6 - perp / 16, 0.05, 0.6)
  for (let i = 1; i < courses; i++) {
    const jitter = ((h >> (i % 8 * 3)) % 5) * 0.0015 * wallH
    ctx.fillRect(x, top + i * brickH + jitter, RAY_STEP, Math.max(1, brickH * 0.1))
  }
  // Vertical joints, offset half a brick on alternating courses so the blocks
  // interlock rather than forming a grid.
  for (let i = 0; i < courses; i++) {
    const off = (i % 2) * 0.5 + ((h >> (i % 6)) % 3) * 0.04
    const u = (hit.wallX * bricksAcross + off) % 1
    // A narrow threshold: 5% of a brick's width is ~10px on a wall you're
    // standing against, which reads as a dark block rather than a mortar line.
    if (u < 0.018 || u > 0.982) {
      ctx.fillRect(x, top + i * brickH + brickH * 0.08, RAY_STEP, Math.max(1, brickH * 0.84))
    }
  }
  ctx.globalAlpha = 1

  // Torch on roughly a quarter of cells, flickering.
  if (h % 4 === 0) {
    const flick = 0.72 + 0.28 * Math.sin(time / 110 + h % 50) * Math.sin(time / 47 + h % 13)
    const d = Math.abs(hit.wallX - 0.5)
    const fall = Math.max(0, 1 - d * 2.6)
    if (fall > 0) {
      ctx.globalAlpha = clamp(fall * fall * 0.55 * flick * (1.3 - perp / 9), 0, 0.7)
      ctx.fillStyle = PAL.torch
      ctx.fillRect(x, top + wallH * 0.10, RAY_STEP, wallH * 0.62)
      ctx.globalAlpha = 1
    }
  }

  // Per-cell coloured cap so you can tell adjacent wall sections apart.
  const hue = ((hit.mapX * 47 + hit.mapY * 83) * 137) % 360
  ctx.fillStyle = `hsla(${hue},58%,${clamp(62 - perp * 3, 22, 62)}%,0.85)`
  ctx.fillRect(x, top, RAY_STEP, Math.max(2, wallH * 0.022))
}

// ══════════════════════════════════════════════════════════════════════════════
//  Doors — the headline feature. A door must be obviously a door from the far
//  end of a corridor, and its problem must be readable before you reach it.
// ══════════════════════════════════════════════════════════════════════════════
function drawDoor(ctx, d, W, H, horizonY, time, q, isAhead, fade) {
  const x0 = d.minX, x1 = d.maxX + RAY_STEP
  const span = x1 - x0
  if (span < 2) return

  // Perspective-correct interpolation across the door's face.
  //
  // A door is a flat panel in the world, so on screen it is a TRAPEZOID: the
  // near edge is tall, the far edge is short, and the top and bottom edges are
  // straight lines running to the same vanishing point as the wall it sits in.
  // Interpolating DISTANCE linearly across the span (which is what this used to
  // do) gets that wrong — and drawing the surround, pillars and sill with
  // fillRect got it wronger still, which is why a door down a side wall read as
  // a flat rectangle pasted onto the corridor instead of part of it.
  //
  // The fix is the standard one: interpolate 1/distance, not distance. Wall
  // height is (k / distance), so height then varies LINEARLY across the span,
  // every horizontal feature becomes a straight sloping edge, and the door lies
  // down into the wall the way the masonry beside it does.
  const invL = 1 / d.leftDist, invR = 1 / d.rightDist
  const K = H * WALL_SCALE
  const at = x => span <= RAY_STEP ? 0 : clamp((x - x0) / span, 0, 1)
  const hAt   = x => K * (invL + (invR - invL) * at(x))
  const topAt = x => horizonY - hAt(x) * 0.52
  const botAt = x => horizonY + hAt(x) * 0.48
  // Where the arch springs from, and its highest point — both follow the slope.
  const springAt = x => topAt(x) + hAt(x) * 0.40
  const apexAt   = x => topAt(x) + hAt(x) * 0.09

  const yTop = Math.min(topAt(x0), topAt(x1)) - 4
  const yBot = Math.max(botAt(x0), botAt(x1)) + 4
  const col = q?.color || PAL.gold
  const pulse = 0.62 + 0.38 * Math.sin(time / 380 + (d.mapX + d.mapY))

  ctx.save()
  if (!clipColumns(ctx, d.cols, yTop, yBot)) { ctx.restore(); return }
  ctx.globalAlpha = fade

  const cx = (x0 + x1) / 2
  const wallHmid = hAt(cx)
  const frameW = clamp(span * 0.11, 2, 26)
  const inL = x0 + frameW, inR = x1 - frameW
  const archBase = springAt(cx)
  const archApex = apexAt(cx)
  const sill = botAt(cx)
  const openH = sill - archBase
  // Control point for the arch. Clamped to the wall top so a door you're
  // standing against reads as a doorway rather than one enormous bow.
  const archCtl = Math.max(topAt(cx) + wallHmid * 0.02, archApex - wallHmid * 0.10)

  /** A four-corner band between two y-functions, drawn as the trapezoid it is. */
  const band = (ax, bx, yA0, yA1, yB0, yB1) => {
    ctx.beginPath()
    ctx.moveTo(ax, yA0)
    ctx.lineTo(bx, yB0)
    ctx.lineTo(bx, yB1)
    ctx.lineTo(ax, yA1)
    ctx.closePath()
    ctx.fill()
  }

  // ── Stone surround ── the whole panel, sloping with the wall
  const sg = ctx.createLinearGradient(x0, 0, x1, 0)
  sg.addColorStop(0, '#2a2158'); sg.addColorStop(0.5, '#3b3078'); sg.addColorStop(1, '#2a2158')
  ctx.fillStyle = sg
  band(x0, x1, topAt(x0), botAt(x0), topAt(x1), botAt(x1))

  // ── The opening (arched) ──
  const opening = new Path2D()
  opening.moveTo(inL, botAt(inL))
  opening.lineTo(inL, springAt(inL))
  opening.quadraticCurveTo(cx, archCtl, inR, springAt(inR))
  opening.lineTo(inR, botAt(inR))
  opening.closePath()

  ctx.save()
  ctx.clip(opening)
  // Portal: a deep well of colour that leans on the operation's hue.
  const pg = ctx.createRadialGradient(cx, (archBase + sill) / 2, wallHmid * 0.04,
                                      cx, (archBase + sill) / 2, wallHmid * 0.55)
  pg.addColorStop(0, col)
  pg.addColorStop(0.35, '#5b3fa8')
  pg.addColorStop(0.75, '#241a52')
  pg.addColorStop(1, '#0d0926')
  ctx.fillStyle = pg
  ctx.fillRect(x0, yTop, span, yBot - yTop)   // clipped to the opening above

  // Swirling arcs
  ctx.strokeStyle = col
  ctx.lineWidth = Math.max(1, wallHmid * 0.012)
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = fade * (0.16 + 0.1 * i) * pulse
    ctx.beginPath()
    ctx.ellipse(cx, (archBase + sill) / 2, wallHmid * (0.10 + i * 0.09), wallHmid * (0.16 + i * 0.11),
                time / (1400 + i * 500) + i, 0, Math.PI * 2)
    ctx.stroke()
  }
  // Star flecks drifting in the portal
  ctx.globalAlpha = fade
  for (let i = 0; i < 7; i++) {
    const a = time / 1600 + i * 1.9
    const rr = wallHmid * (0.06 + (i % 3) * 0.06)
    ctx.fillStyle = i % 2 ? PAL.goldHi : '#ffffff'
    ctx.globalAlpha = fade * (0.3 + 0.5 * Math.abs(Math.sin(a * 1.7)))
    ctx.fillRect(cx + Math.cos(a) * rr - 1, (archBase + sill) / 2 + Math.sin(a * 1.3) * rr - 1, 2, 2)
  }
  ctx.globalAlpha = fade
  ctx.restore()

  // ── Gold frame: pillars, arch rim, keystone ──
  // The pillars are vertical in the world, so they stay vertical on screen —
  // but their tops and feet ride the same slope as the wall.
  const pillarTop = x => springAt(x) - hAt(x) * 0.02
  const gg = ctx.createLinearGradient(x0, 0, x0 + frameW, 0)
  gg.addColorStop(0, PAL.goldDark); gg.addColorStop(0.45, PAL.gold); gg.addColorStop(1, PAL.goldHi)
  ctx.fillStyle = gg
  band(x0, inL, pillarTop(x0), botAt(x0), pillarTop(inL), botAt(inL))
  const gg2 = ctx.createLinearGradient(inR, 0, x1, 0)
  gg2.addColorStop(0, PAL.goldHi); gg2.addColorStop(0.55, PAL.gold); gg2.addColorStop(1, PAL.goldDark)
  ctx.fillStyle = gg2
  band(inR, x1, pillarTop(inR), botAt(inR), pillarTop(x1), botAt(x1))

  ctx.strokeStyle = PAL.gold
  ctx.lineWidth = Math.max(1.5, frameW * 0.5)
  ctx.shadowColor = col
  ctx.shadowBlur = isAhead ? 22 * pulse : 8
  ctx.beginPath()
  ctx.moveTo(inL, springAt(inL))
  ctx.quadraticCurveTo(cx, archCtl, inR, springAt(inR))
  ctx.stroke()
  ctx.shadowBlur = 0

  // Keystone
  const ks = Math.max(2, wallHmid * 0.05)
  ctx.fillStyle = PAL.goldHi
  ctx.fillRect(cx - ks / 2, archApex - ks * 0.6, ks, ks * 1.5)

  // Threshold, lying along the foot of the wall rather than across the screen.
  const thick = x => Math.max(1.5, hAt(x) * 0.02)
  ctx.fillStyle = PAL.goldDark
  band(x0, x1, botAt(x0) - thick(x0), botAt(x0), botAt(x1) - thick(x1), botAt(x1))

  // ── Rune + problem text ──
  if (q && span > 22 && wallHmid > 46) {
    const runeSize = clamp(wallHmid * 0.13, 10, 46)
    const probSize = clamp(wallHmid * 0.125, 9, 44)
    const runeY = archBase - (archBase - archApex) * 0.30
    const probY = archBase + openH * 0.30
    const qmY   = archBase + openH * 0.58

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Operation rune, floating above the problem
    ctx.font = `900 ${runeSize}px Cinzel, Georgia, serif`
    ctx.shadowColor = col
    ctx.shadowBlur = 14 * pulse
    ctx.fillStyle = PAL.goldHi
    ctx.fillText(q.rune, cx, runeY)
    ctx.shadowBlur = 0

    // The numbers, deliberately unreadable.
    //
    // Showing the sum on the door let her solve it from down the corridor and
    // walk through already knowing the answer, which skips the whole point. The
    // operation rune above stays sharp, so she can still see whether it's a
    // times door or a plus door and choose her route — only the digits are
    // withheld until she's standing at the door and the puzzle opens.
    //
    // The True Sight perk sets `clear` on a few doors, which is where this
    // becomes a reward rather than a restriction.
    ctx.font = `900 ${probSize}px Nunito, system-ui, sans-serif`
    ctx.lineWidth = Math.max(2, probSize * 0.16)
    ctx.strokeStyle = '#0b0824'

    if (q.clear) {
      ctx.strokeText(q.disp, cx, probY)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(q.disp, cx, probY)
      ctx.globalAlpha = fade * 0.9
      ctx.font = `900 ${probSize * 0.4}px Cinzel, Georgia, serif`
      ctx.fillStyle = PAL.goldHi
      ctx.fillText('TRUE SIGHT', cx, probY - openH * 0.16)
      ctx.globalAlpha = fade
    } else if (typeof ctx.filter === 'string') {
      ctx.filter = `blur(${Math.max(3, probSize * 0.28)}px)`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(q.disp, cx, probY)
      ctx.filter = 'none'
    } else {
      // No filter support: smear several offset copies instead.
      const r = Math.max(2, probSize * 0.16)
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.globalAlpha = fade * 0.16
        ctx.fillText(q.disp, cx + Math.cos(a) * r, probY + Math.sin(a) * r)
      }
      ctx.globalAlpha = fade
    }

    if (wallHmid > 120) {
      ctx.font = `800 ${probSize * 0.58}px Nunito, system-ui, sans-serif`
      ctx.lineWidth = Math.max(1.5, probSize * 0.1)
      ctx.strokeText('= ?', cx, qmY)
      ctx.fillStyle = PAL.gold
      ctx.fillText('= ?', cx, qmY)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  } else if (q && span > 8) {
    // Too far to read the sum — still show the coloured rune so she knows the
    // door's flavour and that it needs answering.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `900 ${clamp(wallHmid * 0.2, 7, 22)}px Cinzel, Georgia, serif`
    ctx.fillStyle = PAL.goldHi
    ctx.shadowColor = col; ctx.shadowBlur = 10
    ctx.fillText(q.rune, cx, (archBase + sill) / 2)
    ctx.shadowBlur = 0
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  }

  // ── Lock, and the outer bloom when you're standing in front of it ──
  if (wallHmid > 90) {
    const lw = Math.min(wallHmid * 0.05, openH * 0.14), ly = sill - openH * 0.16
    ctx.strokeStyle = PAL.goldHi
    ctx.lineWidth = Math.max(1.2, lw * 0.2)
    ctx.beginPath(); ctx.arc(cx + span * 0.28, ly, lw * 0.5, Math.PI, 0); ctx.stroke()
    ctx.fillStyle = PAL.gold
    ctx.fillRect(cx + span * 0.28 - lw * 0.62, ly, lw * 1.24, lw * 0.95)
  }
  ctx.restore()

  if (isAhead) {
    // Outline the door's actual trapezoid, not a box around it.
    ctx.save()
    ctx.globalAlpha = fade * 0.5 * pulse
    ctx.strokeStyle = col
    ctx.lineWidth = 4
    ctx.shadowColor = col
    ctx.shadowBlur = 26
    ctx.beginPath()
    ctx.moveTo(x0 - 2, topAt(x0) - 2)
    ctx.lineTo(x1 + 2, topAt(x1) - 2)
    ctx.lineTo(x1 + 2, botAt(x1) + 2)
    ctx.lineTo(x0 - 2, botAt(x0) + 2)
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  Billboarded sprites
// ══════════════════════════════════════════════════════════════════════════════
/** Screen placement for a world point, matching the wall pass's angular projection. */
function project(s, W, H, horizonY, wx, wy, fov = FOV) {
  let delta = Math.atan2(wy - s.py, wx - s.px) - s.angle
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  if (Math.abs(delta) > fov / 2 + 0.3) return null
  const raw = Math.hypot(wx - s.px, wy - s.py)
  const perp = raw * Math.cos(delta)
  if (perp < 0.12) return null
  // Same tangent mapping as the wall pass, so sprites sit where the walls say.
  const cameraX = Math.tan(delta) / Math.tan(fov / 2)
  return {
    x: (W * (cameraX + 1)) / 2,
    perp,
    size: (H * WALL_SCALE) / perp,
  }
}

/** How far off the way out is, so the stones can be sorted around it. */
function exitDepth(s, W, H, horizonY, fov) {
  const grid = s.grid
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] !== END) continue
      const p = project(s, W, H, horizonY, c + 0.5, r + 0.5, fov)
      return p ? p.perp : Infinity
    }
  }
  return Infinity
}

/** `minZ`/`maxZ` restrict the pass to stones in a slice of depth. */
function drawStones(ctx, s, W, H, horizonY, zbuf, fov, minZ = 0, maxZ = Infinity) {
  if (!s.stones) return
  const items = Object.keys(s.stones).map(k => {
    const [r, c] = k.split(',').map(Number)
    const v = s.stones[k]
    return { r, c, k, great: v !== true && v > 1 }
  })
  for (const it of items) {
    const p = project(s, W, H, horizonY, it.c + 0.5, it.r + 0.5, fov)
    if (!p) continue
    if (p.perp < minZ || p.perp >= maxZ) continue
    const sz = p.size * (it.great ? 0.27 : 0.17)
    const bob = Math.sin(s.time / 520 + it.r + it.c) * p.size * 0.03
    const cxp = p.x, cyp = horizonY + p.size * 0.26 + bob
    const half = sz * 0.9

    // Occlusion: only keep the columns where the stone is nearer than the wall.
    const cols = []
    for (let x = Math.max(0, Math.floor(cxp - half)); x <= Math.min(W - 1, Math.ceil(cxp + half)); x += RAY_STEP)
      if (p.perp < (zbuf[Math.floor(x / RAY_STEP)] ?? Infinity)) cols.push(x)
    if (!cols.length) continue

    ctx.save()
    clipColumns(ctx, cols, cyp - sz * 2.4, cyp + sz * 2.4)

    // The Great Rune wears its worth: bigger, gold instead of blue, turning on
    // the spot, and throwing a halo you can see from two corridors away. A
    // detour has to be visible from where the decision to take it is made.
    const halo = it.great ? sz * 2.6 : sz * 1.9
    const gl = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, halo)
    if (it.great) {
      const pulse = 0.65 + 0.35 * Math.abs(Math.sin(s.time / 460))
      gl.addColorStop(0, `rgba(255,236,170,${0.95 * pulse})`)
      gl.addColorStop(0.35, `rgba(255,186,64,${0.45 * pulse})`)
      gl.addColorStop(1, 'rgba(255,170,40,0)')
    } else {
      gl.addColorStop(0, 'rgba(140,255,230,0.85)')
      gl.addColorStop(0.4, 'rgba(90,200,255,0.35)')
      gl.addColorStop(1, 'rgba(90,200,255,0)')
    }
    ctx.fillStyle = gl
    ctx.fillRect(cxp - halo, cyp - halo, halo * 2, halo * 2)

    // Faceted gem. The great one narrows and widens as it turns.
    const wob = it.great ? 0.30 + 0.34 * Math.abs(Math.cos(s.time / 900)) : 0.62
    ctx.beginPath()
    ctx.moveTo(cxp, cyp - sz)
    ctx.lineTo(cxp + sz * wob, cyp)
    ctx.lineTo(cxp, cyp + sz)
    ctx.lineTo(cxp - sz * wob, cyp)
    ctx.closePath()
    const gg = ctx.createLinearGradient(cxp - sz, cyp - sz, cxp + sz, cyp + sz)
    if (it.great) {
      gg.addColorStop(0, '#fffbe8'); gg.addColorStop(0.5, '#ffcb45'); gg.addColorStop(1, '#b06a10')
    } else {
      gg.addColorStop(0, '#e6fffb'); gg.addColorStop(0.5, '#5ad9ff'); gg.addColorStop(1, '#1f6fb8')
    }
    ctx.fillStyle = gg
    ctx.fill()
    ctx.strokeStyle = it.great ? '#fff3cc' : '#dffaff'
    ctx.lineWidth = Math.max(0.8, sz * 0.08)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * The way out.
 *
 * This used to be a coloured glow with a ★ floating in it, which reads as
 * "something nice here" rather than "this is the door out" — and the sealed
 * version was the same glow with a padlock, which reads as another maths door.
 * It's an actual doorway now: a tall stone arch with a keystone, either barred
 * and chained or standing open with daylight coming through it. A child should
 * be able to point at it and say that's the exit, without being told.
 */
function drawExitGlow(ctx, s, W, H, horizonY, zbuf, gateMet, fov) {
  const grid = s.grid
  let er = -1, ec = -1
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) if (grid[r][c] === END) { er = r; ec = c }
  if (er < 0) return
  const p = project(s, W, H, horizonY, ec + 0.5, er + 0.5, fov)
  if (!p) return
  const cols = []
  for (let x = Math.max(0, Math.floor(p.x - p.size * 0.5)); x <= Math.min(W - 1, Math.ceil(p.x + p.size * 0.5)); x += RAY_STEP)
    if (p.perp < (zbuf[Math.floor(x / RAY_STEP)] ?? Infinity)) cols.push(x)
  if (!cols.length) return

  const tint = gateMet ? '138,255,212' : '249,202,116'
  const floorY = horizonY + p.size * 0.48          // where the wall meets the floor
  const dh = p.size * 0.88                         // door height
  const dw = p.size * 0.46                         // door width
  const cx = p.x
  const springY = floorY - dh * 0.60               // where the arch starts to curve

  ctx.save()
  clipColumns(ctx, cols, horizonY - p.size, horizonY + p.size)

  // Halo, so it's visible from the far end of a corridor.
  const g = ctx.createRadialGradient(cx, floorY - dh * 0.45, 0, cx, floorY - dh * 0.45, p.size * 0.62)
  g.addColorStop(0, `rgba(${tint},0.55)`)
  g.addColorStop(0.55, `rgba(${tint},0.18)`)
  g.addColorStop(1, `rgba(${tint},0)`)
  ctx.fillStyle = g
  ctx.fillRect(cx - p.size * 0.7, horizonY - p.size * 0.8, p.size * 1.4, p.size * 1.5)

  /** The archway opening, as a path. `inset` shrinks it for the inner leaf. */
  const arch = (inset = 0) => {
    const w = dw - inset * 2, y0 = floorY - inset
    ctx.beginPath()
    ctx.moveTo(cx - w, y0)
    ctx.lineTo(cx - w, springY + inset * 0.6)
    ctx.quadraticCurveTo(cx - w, floorY - dh + inset, cx, floorY - dh + inset)
    ctx.quadraticCurveTo(cx + w, floorY - dh + inset, cx + w, springY + inset * 0.6)
    ctx.lineTo(cx + w, y0)
    ctx.closePath()
  }

  // Stone surround.
  arch()
  const stone = ctx.createLinearGradient(cx - dw, 0, cx + dw, 0)
  stone.addColorStop(0, '#6b5fa8')
  stone.addColorStop(0.5, '#8a7cc8')
  stone.addColorStop(1, '#5a4f92')
  ctx.fillStyle = stone
  ctx.fill()
  ctx.strokeStyle = gateMet ? PAL.exit : PAL.gold
  ctx.lineWidth = Math.max(1, p.size * 0.022)
  ctx.stroke()

  // The opening itself.
  const jamb = p.size * 0.055
  arch(jamb)
  if (gateMet) {
    // Open: light pouring in from somewhere else entirely.
    const lit = ctx.createLinearGradient(0, floorY - dh, 0, floorY)
    lit.addColorStop(0, '#ffffff')
    lit.addColorStop(0.45, '#d8fff0')
    lit.addColorStop(1, `rgba(${tint},0.65)`)
    ctx.fillStyle = lit
    ctx.fill()
  } else {
    ctx.fillStyle = '#120d2c'
    ctx.fill()
    // Barred, with a crossed chain and a lock on it.
    ctx.save()
    arch(jamb); ctx.clip()
    ctx.strokeStyle = '#4a4270'
    ctx.lineWidth = Math.max(1, p.size * 0.02)
    for (let i = 1; i <= 3; i++) {
      const bx = cx - dw + (dw * 2) * (i / 4)
      ctx.beginPath(); ctx.moveTo(bx, floorY); ctx.lineTo(bx, floorY - dh * 0.92); ctx.stroke()
    }
    ctx.strokeStyle = PAL.goldDark
    ctx.lineWidth = Math.max(1.5, p.size * 0.035)
    ctx.beginPath()
    ctx.moveTo(cx - dw, floorY - dh * 0.46)
    ctx.lineTo(cx + dw, floorY - dh * 0.34)
    ctx.moveTo(cx - dw, floorY - dh * 0.34)
    ctx.lineTo(cx + dw, floorY - dh * 0.46)
    ctx.stroke()
    ctx.restore()
  }

  // Keystone at the crown — the one detail that says "arch" at any distance.
  ctx.beginPath()
  ctx.moveTo(cx - dw * 0.22, floorY - dh + p.size * 0.015)
  ctx.lineTo(cx + dw * 0.22, floorY - dh + p.size * 0.015)
  ctx.lineTo(cx + dw * 0.15, floorY - dh - p.size * 0.075)
  ctx.lineTo(cx - dw * 0.15, floorY - dh - p.size * 0.075)
  ctx.closePath()
  ctx.fillStyle = gateMet ? PAL.exit : PAL.gold
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.globalAlpha = 1

  // Close enough to read? Then say it in words as well as in stone. The label
  // goes INSIDE the arch, under the keystone — above it would need headroom the
  // corridor doesn't always have, and it would be the first thing clipped.
  if (p.size > H * 0.26) {
    const ty = floorY - dh * 0.76
    const label = gateMet ? 'WAY OUT' : 'SEALED'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `900 ${clamp(p.size * 0.095, 8, 24)}px Nunito, sans-serif`
    const tw = ctx.measureText(label).width
    ctx.fillStyle = gateMet ? 'rgba(6,30,24,.55)' : 'rgba(0,0,0,.45)'
    ctx.fillRect(cx - tw * 0.62, ty - p.size * 0.075, tw * 1.24, p.size * 0.15)
    ctx.fillStyle = gateMet ? '#eafff7' : PAL.goldHi
    ctx.fillText(label, cx, ty)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
}

// ─── Foreground furniture ─────────────────────────────────────────────────────
/**
 * The moment before an encounter.
 *
 * A pop-up that simply appears mid-corridor reads as a glitch: nothing in the
 * maze caused it, so there is nothing to connect it to. So the creature is
 * shown doing the interrupting — it drops into the hallway ahead, lands with a
 * ring of dust and a flash of its own colour, and only then does the pop-up
 * open. Half a second, but it turns "why is this here" into "it jumped out".
 */
function drawAmbush(ctx, W, H, horizonY, amb, time) {
  const p = clamp((time - amb.start) / amb.dur, 0, 1)
  const groundY = horizonY + H * 0.30

  // Drop in from above the top of the frame, with a squash on landing.
  const land = clamp(p / 0.55, 0, 1)
  const ease = 1 - Math.pow(1 - land, 3)
  const y = groundY - (1 - ease) * H * 0.85
  const bounce = land >= 1 ? Math.sin((p - 0.55) / 0.45 * Math.PI) : 0
  const h = H * (0.30 + 0.20 * ease)

  // Shadow on the floor, tightening as it comes down.
  ctx.save()
  ctx.globalAlpha = 0.22 + 0.38 * ease
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(W / 2, groundY, h * 0.34 * (1.7 - 0.7 * ease), h * 0.09, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // The landing shock: an expanding ring in the creature's own colour.
  if (land >= 1) {
    const r = (p - 0.55) / 0.45
    ctx.save()
    ctx.globalAlpha = (1 - r) * 0.6
    ctx.strokeStyle = amb.creature?.accent || PAL.gold
    ctx.lineWidth = Math.max(1.5, H * 0.008 * (1 - r))
    ctx.beginPath()
    ctx.ellipse(W / 2, groundY, h * (0.3 + r * 1.5), h * (0.08 + r * 0.4), 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.translate(W / 2, y)
  ctx.scale(1 + bounce * 0.10, 1 - bounce * 0.10)     // squash as it hits
  ctx.translate(-W / 2, -y)
  drawCreature(ctx, { x: W / 2, y, h, creature: amb.creature, t: time, charge: 0.25 + p * 0.5 })
  ctx.restore()

  // A short flash of the creature's colour over the whole frame as it lands.
  if (p > 0.5 && p < 0.78) {
    const f = 1 - Math.abs(p - 0.62) / 0.16
    ctx.save()
    ctx.globalAlpha = Math.max(0, f) * 0.3
    ctx.fillStyle = amb.creature?.accent || PAL.gold
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/**
 * The player's wizard, walking ahead of the camera.
 *
 * Sized and placed so the head sits just below the horizon: the wizard is
 * unmistakably there and being guided, while the corridor and doors ahead stay
 * unobstructed. Any larger and she'd be steering a wizard she couldn't see past.
 */
function drawPlayerWizard(ctx, W, H, form, appearance, moving, time, lean) {
  if (!form) return
  drawWizard(ctx, {
    x: W / 2,
    yBase: H * 0.95,
    h: H * 0.235,
    form, appearance, t: time, moving, lean,
    view: 'back',
  })
}

function drawCrosshair(ctx, W, H, horizonY) {
  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  const y = horizonY, s = 5
  ctx.beginPath()
  ctx.moveTo(W / 2 - s, y); ctx.lineTo(W / 2 - 2, y)
  ctx.moveTo(W / 2 + 2, y); ctx.lineTo(W / 2 + s, y)
  ctx.moveTo(W / 2, y - s); ctx.lineTo(W / 2, y - 2)
  ctx.moveTo(W / 2, y + 2); ctx.lineTo(W / 2, y + s)
  ctx.stroke()
  ctx.restore()
}
