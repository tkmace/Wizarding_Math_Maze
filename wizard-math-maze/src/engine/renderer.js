import { castRay, FOV } from './raycaster.js'
import { WALL, DOOR, END, cellKey } from '../game/maze.js'
import { drawWizard } from './wizardSprite.js'

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

  // ── Sprites ─────────────────────────────────────────────────────────────────
  drawStones(ctx, s, W, H, horizonY, zbuf, fov)
  drawExitGlow(ctx, s, W, H, horizonY, zbuf, s.gateMet !== false, fov)

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

  const distAt = x => {
    const t = span <= RAY_STEP ? 0 : (x - x0) / span
    return d.leftDist + (d.rightDist - d.leftDist) * t
  }
  const hAt   = x => (H * WALL_SCALE) / distAt(x)
  const topAt = x => horizonY - hAt(x) * 0.52
  const botAt = x => horizonY + hAt(x) * 0.48

  const yTop = Math.min(topAt(x0), topAt(x1)) - 4
  const yBot = Math.max(botAt(x0), botAt(x1)) + 4
  const col = q?.color || PAL.gold
  const pulse = 0.62 + 0.38 * Math.sin(time / 380 + (d.mapX + d.mapY))

  ctx.save()
  if (!clipColumns(ctx, d.cols, yTop, yBot)) { ctx.restore(); return }
  ctx.globalAlpha = fade

  const wallHmid = hAt((x0 + x1) / 2)
  const frameW = clamp(span * 0.11, 2, 26)
  const inL = x0 + frameW, inR = x1 - frameW
  const cx = (x0 + x1) / 2
  const archBase = topAt(cx) + wallHmid * 0.40   // where the arch springs from
  const archApex = topAt(cx) + wallHmid * 0.09
  const sill = botAt(cx)
  const openH = sill - archBase
  // Control point for the arch. Clamped to the wall top so a door you're
  // standing against reads as a doorway rather than one enormous bow.
  const archCtl = Math.max(topAt(cx) + wallHmid * 0.02, archApex - wallHmid * 0.10)

  // ── Stone surround ──
  const sg = ctx.createLinearGradient(x0, 0, x1, 0)
  sg.addColorStop(0, '#2a2158'); sg.addColorStop(0.5, '#3b3078'); sg.addColorStop(1, '#2a2158')
  ctx.fillStyle = sg
  ctx.fillRect(x0, yTop, span, yBot - yTop)

  // ── The opening (arched) ──
  const opening = new Path2D()
  opening.moveTo(inL, sill)
  opening.lineTo(inL, archBase)
  opening.quadraticCurveTo(cx, archCtl, inR, archBase)
  opening.lineTo(inR, sill)
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
  ctx.fillRect(x0, yTop, span, yBot - yTop)

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
  const gg = ctx.createLinearGradient(x0, 0, x0 + frameW, 0)
  gg.addColorStop(0, PAL.goldDark); gg.addColorStop(0.45, PAL.gold); gg.addColorStop(1, PAL.goldHi)
  ctx.fillStyle = gg
  ctx.fillRect(x0, archBase - wallHmid * 0.02, frameW, sill - archBase + wallHmid * 0.02)
  const gg2 = ctx.createLinearGradient(inR, 0, x1, 0)
  gg2.addColorStop(0, PAL.goldHi); gg2.addColorStop(0.55, PAL.gold); gg2.addColorStop(1, PAL.goldDark)
  ctx.fillStyle = gg2
  ctx.fillRect(inR, archBase - wallHmid * 0.02, frameW, sill - archBase + wallHmid * 0.02)

  ctx.strokeStyle = PAL.gold
  ctx.lineWidth = Math.max(1.5, frameW * 0.5)
  ctx.shadowColor = col
  ctx.shadowBlur = isAhead ? 22 * pulse : 8
  ctx.beginPath()
  ctx.moveTo(inL, archBase)
  ctx.quadraticCurveTo(cx, archCtl, inR, archBase)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Keystone
  const ks = Math.max(2, wallHmid * 0.05)
  ctx.fillStyle = PAL.goldHi
  ctx.fillRect(cx - ks / 2, archApex - ks * 0.6, ks, ks * 1.5)

  // Lintel + threshold
  ctx.fillStyle = PAL.goldDark
  ctx.fillRect(x0, sill - Math.max(1.5, wallHmid * 0.02), span, Math.max(1.5, wallHmid * 0.02))

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
    ctx.save()
    ctx.globalAlpha = fade * 0.5 * pulse
    ctx.strokeStyle = col
    ctx.lineWidth = 4
    ctx.shadowColor = col
    ctx.shadowBlur = 26
    ctx.strokeRect(x0 - 2, yTop, span + 4, yBot - yTop)
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

function drawStones(ctx, s, W, H, horizonY, zbuf, fov) {
  if (!s.stones) return
  const items = Object.keys(s.stones).map(k => {
    const [r, c] = k.split(',').map(Number)
    return { r, c, k }
  })
  for (const it of items) {
    const p = project(s, W, H, horizonY, it.c + 0.5, it.r + 0.5, fov)
    if (!p) continue
    const sz = p.size * 0.17
    const bob = Math.sin(s.time / 520 + it.r + it.c) * p.size * 0.03
    const cxp = p.x, cyp = horizonY + p.size * 0.26 + bob
    const half = sz * 0.9

    // Occlusion: only keep the columns where the stone is nearer than the wall.
    const cols = []
    for (let x = Math.max(0, Math.floor(cxp - half)); x <= Math.min(W - 1, Math.ceil(cxp + half)); x += RAY_STEP)
      if (p.perp < (zbuf[Math.floor(x / RAY_STEP)] ?? Infinity)) cols.push(x)
    if (!cols.length) continue

    ctx.save()
    clipColumns(ctx, cols, cyp - sz * 2, cyp + sz * 2)
    const gl = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, sz * 1.9)
    gl.addColorStop(0, 'rgba(140,255,230,0.85)')
    gl.addColorStop(0.4, 'rgba(90,200,255,0.35)')
    gl.addColorStop(1, 'rgba(90,200,255,0)')
    ctx.fillStyle = gl
    ctx.fillRect(cxp - sz * 2, cyp - sz * 2, sz * 4, sz * 4)

    // Faceted gem
    ctx.beginPath()
    ctx.moveTo(cxp, cyp - sz)
    ctx.lineTo(cxp + sz * 0.62, cyp)
    ctx.lineTo(cxp, cyp + sz)
    ctx.lineTo(cxp - sz * 0.62, cyp)
    ctx.closePath()
    const gg = ctx.createLinearGradient(cxp - sz, cyp - sz, cxp + sz, cyp + sz)
    gg.addColorStop(0, '#e6fffb'); gg.addColorStop(0.5, '#5ad9ff'); gg.addColorStop(1, '#1f6fb8')
    ctx.fillStyle = gg
    ctx.fill()
    ctx.strokeStyle = '#dffaff'
    ctx.lineWidth = Math.max(0.8, sz * 0.08)
    ctx.stroke()
    ctx.restore()
  }
}

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

  // Sealed exits glow amber and wear a padlock; open ones are green with a star.
  const tint = gateMet ? '138,255,212' : '249,202,116'
  ctx.save()
  clipColumns(ctx, cols, horizonY - p.size, horizonY + p.size)
  const g = ctx.createRadialGradient(p.x, horizonY + p.size * 0.1, 0, p.x, horizonY + p.size * 0.1, p.size * 0.5)
  g.addColorStop(0, `rgba(${tint},0.75)`)
  g.addColorStop(0.5, `rgba(${tint},0.22)`)
  g.addColorStop(1, `rgba(${tint},0)`)
  ctx.fillStyle = g
  ctx.fillRect(p.x - p.size * 0.5, horizonY - p.size * 0.4, p.size, p.size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${clamp(p.size * 0.22, 10, 46)}px Nunito, sans-serif`
  ctx.fillStyle = gateMet ? PAL.exit : PAL.gold
  ctx.globalAlpha = 0.95
  ctx.fillText(gateMet ? '★' : '🔒', p.x, horizonY + p.size * 0.1)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}

// ─── Foreground furniture ─────────────────────────────────────────────────────
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
    yBase: H * 0.94,
    h: H * 0.26,
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
