import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from './supabaseClient.js'

// ─── Cell types ───────────────────────────────────────────────────────────────
const WALL = 0, PATH = 1, DOOR = 2, START = 3, END = 4

// ─── Facing directions: 0=East 1=South 2=West 3=North ────────────────────────
const FACING_ANGLES = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
const FACING_DELTA  = [[0, 1], [1, 0], [0, -1], [-1, 0]] // [dRow, dCol]

// ─── Skins ────────────────────────────────────────────────────────────────────
const ALL_SKINS = [
  { id: 'apprentice', threshold: 0,     emoji: '🧙‍♂️', title: 'Apprentice',  wand: '🪄', color: '#a0a0cc', desc: 'Your journey begins...' },
  { id: 'mage',       threshold: 300,   emoji: '🧙',   title: 'Mage',        wand: '⚡', color: '#7ee8a2', desc: 'The arcane arts awaken!' },
  { id: 'enchanter',  threshold: 800,   emoji: '🧝',   title: 'Enchanter',   wand: '🔮', color: '#74b9ff', desc: 'Reality bends to your will.' },
  { id: 'sorceress',  threshold: 2000,  emoji: '🧝‍♀️', title: 'Sorceress',  wand: '🌙', color: '#f78fb3', desc: 'The stars know your name.' },
  { id: 'archmage',   threshold: 5000,  emoji: '🧛',   title: 'Archmage',    wand: '🌟', color: '#f9ca74', desc: 'Mastery over all elements!' },
  { id: 'legendary',  threshold: 12000, emoji: '👑',   title: 'Grand Wizard',wand: '☄️', color: '#ff6bff', desc: 'A legend of the ancient ages.' },
]
const getSkin     = p => [...ALL_SKINS].reverse().find(s => p >= s.threshold) || ALL_SKINS[0]
const getUnlocked = p => ALL_SKINS.filter(s => p >= s.threshold)
const getNext     = p => ALL_SKINS.find(s => s.threshold > p) || null

// ─── Difficulties ─────────────────────────────────────────────────────────────
const DIFFS = [
  { key: 'novice',      label: 'Novice',      icon: '🌿', color: '#b8f0c0', mult: 0.7, desc: 'Small numbers',      ranges: { add: [1, 8],   sub: [3, 12],  mul: [1, 4],  div: [1, 4]  } },
  { key: 'apprentice',  label: 'Apprentice',  icon: '🌱', color: '#7ee8a2', mult: 1.0, desc: 'Classic challenge',  ranges: { add: [1, 15],  sub: [5, 20],  mul: [1, 6],  div: [1, 6]  } },
  { key: 'sorcerer',    label: 'Sorcerer',    icon: '🔥', color: '#f9ca74', mult: 1.6, desc: 'Numbers get serious',ranges: { add: [5, 40],  sub: [10, 50], mul: [2, 10], div: [2, 10] } },
  { key: 'archmage',    label: 'Archmage',    icon: '⚡', color: '#f78fb3', mult: 2.5, desc: 'Large numbers',      ranges: { add: [10, 80], sub: [20, 100],mul: [3, 12], div: [3, 12] } },
  { key: 'legendary',   label: 'Legendary',   icon: '💀', color: '#ff6bff', mult: 4.0, desc: 'Only the bravest',   ranges: { add: [50, 500],sub: [100, 999],mul: [6, 20], div: [6, 15] } },
]

// ─── Operations ───────────────────────────────────────────────────────────────
const OPS = [
  { key: 'addition',      label: 'Addition',      icon: '➕', color: '#7ee8a2' },
  { key: 'subtraction',   label: 'Subtraction',   icon: '−',  color: '#f9ca74' },
  { key: 'multiplication',label: 'Multiplication',icon: '×',  color: '#f78fb3' },
  { key: 'division',      label: 'Division',      icon: '÷',  color: '#74b9ff' },
]

// ─── Point calculation ────────────────────────────────────────────────────────
function calcPts(op, a, b, ans, m) {
  let base
  if (op === 'addition')       { const mx = Math.max(a, b); base = mx <= 8 ? 5 : mx <= 15 ? 9 : mx <= 30 ? 14 : mx <= 60 ? 20 : 28 }
  else if (op === 'subtraction') { base = a <= 10 ? 6 : a <= 20 ? 10 : a <= 50 ? 16 : a <= 100 ? 22 : 30; if (a - b < 3) base = Math.round(base * .85) }
  else if (op === 'multiplication') { base = ans <= 20 ? 10 : ans <= 50 ? 16 : ans <= 100 ? 24 : ans <= 200 ? 34 : 45; const mf = Math.min(a, b); if (mf >= 6) base = Math.round(base * 1.15); if (mf >= 8) base = Math.round(base * 1.25) }
  else { const pr = b * ans; base = pr <= 20 ? 10 : pr <= 50 ? 16 : pr <= 100 ? 24 : pr <= 200 ? 34 : 45; if (b >= 6) base = Math.round(base * 1.15); if (b >= 9) base = Math.round(base * 1.2) }
  return Math.max(5, Math.round(Math.round(base * m) / 5) * 5)
}

// ─── Question generator ───────────────────────────────────────────────────────
function genQ(ops, dk) {
  const d = DIFFS.find(x => x.key === dk) || DIFFS[1]
  const opArr = [...ops], op = opArr[Math.floor(Math.random() * opArr.length)]
  const { ranges: r, mult: m } = d, rnd = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo
  let a, b, ans, disp, emoji
  if (op === 'addition')       { a = rnd(r.add[0], r.add[1]); b = rnd(r.add[0], r.add[1]); ans = a + b; disp = `${a} + ${b}`; emoji = '➕' }
  else if (op === 'subtraction') { a = rnd(r.sub[0], r.sub[1]); b = rnd(1, a); ans = a - b; disp = `${a} − ${b}`; emoji = '✨' }
  else if (op === 'multiplication') { a = rnd(r.mul[0], r.mul[1]); b = rnd(r.mul[0], r.mul[1]); ans = a * b; disp = `${a} × ${b}`; emoji = '⭐' }
  else { b = rnd(r.div[0], r.div[1]); ans = rnd(1, r.div[1]); a = b * ans; disp = `${a} ÷ ${b}`; emoji = '🔮' }
  return { disp, ans, emoji, op, curPts: calcPts(op, a, b, ans, m), wrongs: 0 }
}

// ─── Min-door Dijkstra ── guarantees ≥3 doors on every possible path ──────────
function findMinDoorPath(grid) {
  const H = grid.length, W = grid[0].length
  const dist = Array.from({ length: H }, () => Array(W).fill(Infinity))
  const prev = Array.from({ length: H }, () => Array(W).fill(null))
  dist[1][1] = 0
  const pq = [[0, 1, 1]]
  let endR = -1, endC = -1
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (grid[r][c] === END) { endR = r; endC = c }
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0])
    const [d, r, c] = pq.shift()
    if (d > dist[r][c]) continue
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue
      const cell = grid[nr][nc]
      if (cell === WALL) continue
      const cost = cell === DOOR ? 1 : 0
      const nd = d + cost
      if (nd < dist[nr][nc]) { dist[nr][nc] = nd; prev[nr][nc] = [r, c]; pq.push([nd, nr, nc]) }
    }
  }
  const minCount = dist[endR]?.[endC] ?? 0
  const pathCells = []
  let r = endR, c = endC
  while (prev[r][c]) {
    const [pr, pc] = prev[r][c]
    if (grid[r][c] === PATH) pathCells.push([r, c])
    r = pr; c = pc
  }
  return { minCount, pathCells }
}

// ─── Maze generator ───────────────────────────────────────────────────────────
function genMaze(ops, dk) {
  const R = 6, C = 6, H = R * 2 + 1, W = C * 2 + 1
  const g = Array.from({ length: H }, () => Array(W).fill(WALL))
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) g[r * 2 + 1][c * 2 + 1] = PATH
  const vis = Array.from({ length: R }, () => Array(C).fill(false))
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  function carve(r, c) {
    vis[r][c] = true
    for (const [dr, dc] of [...dirs].sort(() => Math.random() - .5)) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < R && nc >= 0 && nc < C && !vis[nr][nc]) { g[r * 2 + 1 + dr][c * 2 + 1 + dc] = PATH; carve(nr, nc) }
    }
  }
  carve(0, 0)
  let ex = Math.floor(R * C * .35), at = 0
  while (ex > 0 && at < 600) {
    const r = 1 + Math.floor(Math.random() * (H - 2)), c = 1 + Math.floor(Math.random() * (W - 2))
    if (g[r][c] === WALL) {
      const h = r % 2 === 1 && c % 2 === 0 && g[r][c - 1] === PATH && g[r][c + 1] === PATH
      const v = r % 2 === 0 && c % 2 === 1 && g[r - 1][c] === PATH && g[r + 1][c] === PATH
      if (h || v) { g[r][c] = PATH; ex-- }
    }
    at++
  }
  g[1][1] = START; g[H - 2][W - 2] = END
  const pc = []
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
    if (g[r][c] === PATH && !(r <= 2 && c <= 2) && !(r >= H - 3 && c >= W - 3)) pc.push([r, c])
  pc.sort(() => Math.random() - .5)
  const dq = {}
  for (const [r, c] of pc.slice(0, 6 + Math.floor(Math.random() * 4))) { g[r][c] = DOOR; dq[`${r},${c}`] = genQ(ops, dk) }
  let attempts = 0
  while (attempts < 50) {
    const { minCount, pathCells } = findMinDoorPath(g)
    if (minCount >= 3) break
    const candidates = pathCells.filter(([r, c]) => !(r <= 2 && c <= 2) && !(r >= H - 3 && c >= W - 3))
    if (candidates.length === 0) break
    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)]
    g[r][c] = DOOR; dq[`${r},${c}`] = genQ(ops, dk)
    attempts++
  }
  return { grid: g, dq }
}

// ─── DDA Raycasting (returns wallX texture coord) ─────────────────────────────
const FOV = Math.PI / 3  // 60°

function castRay(grid, px, py, angle) {
  const H = grid.length, W = grid[0].length
  const dx = Math.cos(angle), dy = Math.sin(angle)
  let mapX = Math.floor(px), mapY = Math.floor(py)
  const deltaDistX = dx === 0 ? 1e30 : Math.abs(1 / dx)
  const deltaDistY = dy === 0 ? 1e30 : Math.abs(1 / dy)
  let stepX, stepY, sideDistX, sideDistY
  if (dx < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX } else { stepX = 1; sideDistX = (mapX + 1 - px) * deltaDistX }
  if (dy < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY } else { stepY = 1; sideDistY = (mapY + 1 - py) * deltaDistY }
  let side = 0, hitCell = WALL, steps = 0
  while (steps++ < 80) {
    if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0 }
    else                        { sideDistY += deltaDistY; mapY += stepY; side = 1 }
    if (mapY < 0 || mapY >= H || mapX < 0 || mapX >= W) { hitCell = WALL; break }
    hitCell = grid[mapY][mapX]
    if (hitCell === WALL || hitCell === DOOR || hitCell === END) break
  }
  const perpDist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY)
  // Texture coord: where on the wall face the ray hit (0–1)
  const wallHit = side === 0 ? py + perpDist * dy : px + perpDist * dx
  const wallX = wallHit - Math.floor(wallHit)
  return { dist: Math.max(0.05, perpDist), side, hitCell, mapX, mapY, wallX }
}

// ─── Frame renderer ───────────────────────────────────────────────────────────
// px/py/angle are the *animated* (smoothly interpolated) camera values
function renderFrame(canvas, minimap, grid, dq, playerRow, playerCol, facing, px, py, angle, skinEmoji) {
  if (!canvas || !grid) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  const now = performance.now()

  // ── Starfield ceiling ──
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, H / 2)
  ceilGrad.addColorStop(0, '#01011a')
  ceilGrad.addColorStop(1, '#0d0d3a')
  ctx.fillStyle = ceilGrad
  ctx.fillRect(0, 0, W, H / 2)

  // ── Dark stone floor ──
  const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H)
  floorGrad.addColorStop(0, '#080814')
  floorGrad.addColorStop(1, '#030308')
  ctx.fillStyle = floorGrad
  ctx.fillRect(0, H / 2, W, H)

  // ── Cast rays & draw walls ──
  let doorHandleData = null  // tracked during loop, drawn after
  for (let x = 0; x < W; x++) {
    const rayAngle = angle - FOV / 2 + (x / W) * FOV
    const { dist, side, hitCell, mapX, mapY, wallX } = castRay(grid, px, py, rayAngle)
    const wallH  = Math.min(H * 5, H / dist)
    let wallTop    = Math.max(0, (H - wallH) / 2)
    let wallBottom = Math.min(H, (H + wallH) / 2)

    // Brightness: noticeably brighter than v2, with distance falloff
    const baseBr = Math.min(1, Math.max(0.08, 1.55 - dist / 10.5)) * (side === 1 ? 0.68 : 1.0)

    let r, g, b

    if (hitCell === DOOR) {
      // ── Magical door: arched top + frame posts + animated portal + handle ──
      // Arch: raised center with a wider, taller semicircle shape
      const archFactor = Math.max(0, 1 - Math.pow(Math.abs(wallX - 0.5) * 2.1, 1.6))
      wallTop = Math.max(0, wallTop - wallH * 0.42 * archFactor)

      // Track the door-handle candidate column (wallX ≈ 0.74, right-of-center)
      const handleProx = Math.max(0, 1 - Math.abs(wallX - 0.74) * 24)
      if (handleProx > 0.4 && (!doorHandleData || handleProx > doorHandleData.prox)) {
        doorHandleData = {
          x, prox: handleProx,
          y: wallTop + (wallBottom - wallTop) * 0.56,
          r: Math.max(2.5, wallH * 0.052),
        }
      }

      const isFrame    = wallX < 0.10 || wallX > 0.90
      const isArchRim  = archFactor > 0.04 && archFactor < 0.20  // gold border along arch curve
      const isKeystone = archFactor > 0.86                        // gold cap at very top

      if (isFrame || isKeystone) {
        // Gold stone frame pillars + arch keystone
        const br = Math.min(1.3, Math.max(0.3, 1.7 - dist / 8)) * (side === 1 ? 0.75 : 1.0)
        r = Math.round(Math.min(255, 255 * br))
        g = Math.round(Math.min(255, 195 * br))
        b = Math.round(Math.min(255,  42 * br))
      } else if (isArchRim) {
        // Warm amber arch border
        const br = Math.min(1.1, Math.max(0.25, 1.5 - dist / 9)) * (side === 1 ? 0.75 : 1.0)
        r = Math.round(Math.min(255, 220 * br))
        g = Math.round(Math.min(255, 145 * br))
        b = Math.round(Math.min(255,  18 * br))
      } else {
        // Animated portal: swirling purple/teal
        const t = now / 900
        const s1 = Math.sin(wallX * 11 + t) * 0.45
        const s2 = Math.cos(wallX * 6.5 - t * 0.85) * 0.35
        const swirl = (s1 + s2 + 0.9) / 1.8  // 0–1
        const br = Math.min(1, Math.max(0.28, 1.6 - dist / 9)) * (side === 1 ? 0.75 : 1.0)
        // Tiny star flecks inside portal
        const starSeed = ((Math.floor(wallX * 28) * 4127 + Math.floor(t * 2.5)) ^ 0xB3C5) & 0xFF
        if (starSeed < 12) {
          // Bright star pixel
          r = g = b = Math.round(210 * br)
        } else {
          r = Math.round(Math.min(255, (70 + swirl * 120) * br))
          g = Math.round(Math.min(255, (20 + swirl * 80)  * br))
          b = Math.round(Math.min(255, (215 + swirl * 40) * br))
        }
      }
    } else if (hitCell === END) {
      // ── Exit portal: pulsing purple ──
      const t = now / 620
      const pulse = Math.sin(wallX * 7.5 + t) * 0.12 + 0.88
      const br = Math.min(1, Math.max(0.2, 1.6 - dist / 9)) * (side === 1 ? 0.75 : 1.0) * pulse
      r = Math.round(185 * br); g = Math.round(88 * br); b = Math.round(255 * br)
    } else {
      // ── Castle stone: brighter + stone texture variation + torch glow ──
      const stoneVar = Math.sin(wallX * 17.3) * 0.055 + Math.sin(wallX * 6.1) * 0.030
      const adjBr = baseBr * (1.0 + stoneVar)

      // Torches: ~25% of wall cells have a torch glow near their center
      const cellHash = ((mapX * 7919 + mapY * 6271) ^ (mapX * 3301)) & 0xFFFF
      const hasTorch = cellHash % 4 === 0
      const torchProx = hasTorch ? Math.max(0, 1 - Math.abs(wallX - 0.5) * 5.5) : 0
      const torchGlow = torchProx * torchProx * Math.min(1.3, 1.5 / Math.max(0.5, dist))

      r = Math.round(Math.min(255, 72  * adjBr + torchGlow * 195))
      g = Math.round(Math.min(255, 50  * adjBr + torchGlow *  88))
      b = Math.round(Math.min(255, 160 * adjBr + torchGlow *   8))
    }

    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(x, wallTop, 1, wallBottom - wallTop)

    // Stone mortar lines at top/bottom of close walls
    if (hitCell === WALL && dist < 6) {
      const mortarAlpha = baseBr * 0.28
      ctx.fillStyle = `rgba(135,112,210,${mortarAlpha})`
      ctx.fillRect(x, wallTop,     1, 1)
      ctx.fillRect(x, wallBottom - 1, 1, 1)
    }
  }

  // ── Door handle overlay (gold knob drawn after ray loop) ──
  if (doorHandleData) {
    const { x: hx, y: hy, r: hr } = doorHandleData
    ctx.save()
    ctx.shadowColor = 'rgba(255,210,0,0.8)'
    ctx.shadowBlur = 5
    ctx.fillStyle = 'rgba(255,218,60,0.92)'
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(140,90,0,0.75)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  // ── Door glow + prompt when door is directly ahead ──
  const fwdR = playerRow + FACING_DELTA[facing][0]
  const fwdC = playerCol + FACING_DELTA[facing][1]
  if (grid[fwdR]?.[fwdC] === DOOR) {
    const doorData = dq[`${fwdR},${fwdC}`]
    const grd  = ctx.createLinearGradient(0, 0, W / 5, 0)
    grd.addColorStop(0, 'rgba(249,202,116,0.20)'); grd.addColorStop(1, 'rgba(249,202,116,0)')
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W / 5, H)
    const grd2 = ctx.createLinearGradient(W, 0, W * 4 / 5, 0)
    grd2.addColorStop(0, 'rgba(249,202,116,0.20)'); grd2.addColorStop(1, 'rgba(249,202,116,0)')
    ctx.fillStyle = grd2; ctx.fillRect(W * 4 / 5, 0, W / 5, H)
    ctx.textAlign = 'center'
    ctx.font = `bold ${Math.round(W * 0.038)}px 'Cinzel', serif`
    ctx.fillStyle = 'rgba(249,202,116,0.92)'
    ctx.fillText('🔐  Press ▲ to unlock', W / 2, H - 22)
    if (doorData) {
      ctx.font = `bold ${Math.round(W * 0.030)}px 'Nunito', sans-serif`
      ctx.fillStyle = 'rgba(249,202,116,0.65)'
      ctx.fillText(`+${doorData.curPts} ⭐`, W / 2, H - 8)
    }
  }

  // ── Exit portal text ──
  if (grid[fwdR]?.[fwdC] === END) {
    ctx.textAlign = 'center'
    ctx.font = `bold ${Math.round(W * 0.04)}px 'Cinzel', serif`
    ctx.fillStyle = 'rgba(200,164,255,0.9)'
    ctx.fillText('🏆  The exit lies ahead!', W / 2, H - 18)
  }

  // ── Movement hint overlays (subtle, always visible) ──
  const hSz = Math.max(11, Math.round(W * 0.065))
  const drawHint = (symbol, hx, hy) => {
    const pad = hSz * 0.62
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.fillStyle = '#02022a'
    ctx.fillRect(hx - pad, hy - pad, pad * 2, pad * 2)
    ctx.globalAlpha = 0.42
    ctx.fillStyle = '#b8b8f0'
    ctx.font = `bold ${hSz}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(symbol, hx, hy)
    ctx.restore()
  }
  drawHint('▲', W / 2,              Math.round(H * 0.08))  // forward
  drawHint('▼', W / 2,              Math.round(H * 0.82))  // backward
  drawHint('↺', Math.round(W * 0.055), H / 2)              // turn left
  drawHint('↻', Math.round(W * 0.945), H / 2)              // turn right

  // ── Crosshair ──
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1.2
  const cx = W / 2, cy = H / 2
  ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke()

  // ── Wizard sprite (bottom center, bobs when moving) ──
  const isMoving = Math.hypot(px - (playerCol + 0.5), py - (playerRow + 0.5)) > 0.025
  const bobY = isMoving ? Math.sin(now / 95) * 4 : 0
  const wzSz = Math.max(16, Math.round(W * 0.105))
  ctx.save()
  ctx.shadowColor = 'rgba(180,140,255,0.65)'
  ctx.shadowBlur = 16
  ctx.globalAlpha = 0.90
  ctx.font = `${wzSz}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(skinEmoji, W / 2, H - 1 + bobY)
  ctx.restore()

  // ── Minimap ──
  if (minimap) {
    const mCtx = minimap.getContext('2d')
    const rows = grid.length, cols = grid[0].length
    const cs = Math.floor(minimap.width / cols)
    mCtx.clearRect(0, 0, minimap.width, minimap.height)
    mCtx.fillStyle = 'rgba(4,4,18,0.84)'
    mCtx.fillRect(0, 0, minimap.width, minimap.height)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c], key = `${r},${c}`
        if      (cell === WALL)  mCtx.fillStyle = '#0d0d2a'
        else if (cell === DOOR)  mCtx.fillStyle = dq[key]?.wrongs > 0 ? '#ff6633' : '#f9ca74'
        else if (cell === END)   mCtx.fillStyle = '#c8a4ff'
        else if (cell === START) mCtx.fillStyle = '#7ee8a244'
        else                     mCtx.fillStyle = '#1e1e4a'
        mCtx.fillRect(c * cs + 1, r * cs + 1, cs - 1, cs - 1)
      }
    }
    // Player dot
    const mmx = (playerCol + 0.5) * cs, mmy = (playerRow + 0.5) * cs
    mCtx.fillStyle = '#ffffff'
    mCtx.beginPath(); mCtx.arc(mmx, mmy, cs * 0.8, 0, Math.PI * 2); mCtx.fill()
    // Facing arrow
    const ang = FACING_ANGLES[facing]
    mCtx.strokeStyle = '#f9ca74'
    mCtx.lineWidth = 1.5
    mCtx.beginPath()
    mCtx.moveTo(mmx, mmy)
    mCtx.lineTo(mmx + Math.cos(ang) * cs * 2.2, mmy + Math.sin(ang) * cs * 2.2)
    mCtx.stroke()
    mCtx.strokeStyle = 'rgba(100,80,200,0.5)'
    mCtx.lineWidth = 1
    mCtx.strokeRect(0, 0, minimap.width, minimap.height)
  }
}

// ─── Sparkle ──────────────────────────────────────────────────────────────────
const SHAPES = ['✨', '⭐', '🌟', '💫']
function Sparkle({ onDone }) {
  const pts = useRef(Array.from({ length: 24 }, (_, i) => ({ id: i, angle: (i / 24) * 360 + Math.random() * 13, dist: 50 + Math.random() * 75, size: 11 + Math.random() * 11, delay: Math.random() * .15, shape: SHAPES[i % 4] }))).current
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, overflow: 'visible' }}>
      <style>{`@keyframes sf{0%{opacity:1;transform:translate(-50%,-50%) scale(1.3);}100%{opacity:0;transform:translate(-50%,-50%) translate(var(--dx),var(--dy)) scale(0.1);}}`}</style>
      {pts.map(p => { const rad = p.angle * Math.PI / 180; return (<div key={p.id} style={{ position: 'absolute', left: '50%', top: '50%', fontSize: p.size, lineHeight: 1, '--dx': `${Math.cos(rad) * p.dist}px`, '--dy': `${Math.sin(rad) * p.dist}px`, animation: `sf .85s ${p.delay}s ease-out both` }}>{p.shape}</div>) })}
    </div>
  )
}

// ─── Background stars ─────────────────────────────────────────────────────────
const STARS = Array.from({ length: 55 }, (_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, sz: Math.random() * 2.5 + .5, dl: Math.random() * 4, dr: Math.random() * 2 + 2 }))

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Nunito:wght@700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}body{background:#080820;}
@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}
@keyframes appear{from{opacity:0;transform:scale(.7) translateY(18px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes victory{0%{opacity:0;transform:scale(.5)}60%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
@keyframes sup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fout{0%{opacity:1}70%{opacity:1}100%{opacity:0}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px #f9ca74,0 0 18px #f9ca74aa}50%{box-shadow:0 0 20px #f9ca74,0 0 45px #f9ca74aa}}
.star{position:absolute;border-radius:50%;background:#fff;animation:twinkle var(--dr) var(--dl) infinite ease-in-out;}
.wf{animation:float 3s ease-in-out infinite;display:inline-block;}
.shake{animation:shake .5s ease-in-out;}
.appear{animation:appear .4s ease-out;}
.victory{animation:victory .6s ease-out;}
.bh:hover{transform:translateY(-2px);filter:brightness(1.18);transition:all .14s;}
.bh:active{transform:translateY(1px);}
.spinner{animation:spin 1s linear infinite;display:inline-block;}
input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
input[type=number]{-moz-appearance:textfield;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0d0d30;}::-webkit-scrollbar-thumb{background:#3a3a70;border-radius:4px;}
canvas{display:block;image-rendering:pixelated;}
`

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WizardMaze() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [screen, setScreen]               = useState('login')
  const [nameInput, setNameInput]         = useState('')
  const [passcodeInput, setPasscodeInput] = useState('')
  const [playerName, setPlayerName]       = useState('')
  const [playerId, setPlayerId]           = useState(null)
  const [loginLoading, setLoginLoading]   = useState(false)
  const [loginError, setLoginError]       = useState('')
  const [isReturning, setIsReturning]     = useState(false)
  const [loginShake, setLoginShake]       = useState(false)

  // ── Game flow ─────────────────────────────────────────────────────────────
  const [gameScreen, setGameScreen] = useState('start')
  const [ops, setOps]               = useState(new Set(['addition']))
  const [diff, setDiff]             = useState('apprentice')
  const [maze, setMaze]             = useState(null)

  // ── Player position & facing ──────────────────────────────────────────────
  const [pos, setPos]   = useState({ row: 1, col: 1, facing: 0 })

  // ── Math puzzle ───────────────────────────────────────────────────────────
  const [showMath, setShowMath] = useState(false)
  const [q, setQ]               = useState(null)
  const [pending, setPending]   = useState(null)
  const [ans, setAns]           = useState('')
  const [wrong, setWrong]       = useState(false)

  // ── Scores / skins ────────────────────────────────────────────────────────
  const [run, setRun]               = useState(0)
  const [total, setTotal]           = useState(0)
  const [skinId, setSkinId]         = useState('apprentice')
  const [shop, setShop]             = useState(false)
  const [shopNew, setShopNew]       = useState(false)
  const [pendingSkin, setPendingSkin] = useState(null)
  const [sparkle, setSparkle]       = useState(false)
  const [popup, setPopup]           = useState(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef   = useRef(null)
  const minimapRef  = useRef(null)
  const iref        = useRef(null)
  const nameRef     = useRef(null)
  const passcodeRef = useRef(null)

  // ── Smooth animation refs (avoid re-renders) ──────────────────────────────
  const animRef   = useRef({ px: 1.5, py: 1.5, angle: FACING_ANGLES[0] })
  const targetRef = useRef({ px: 1.5, py: 1.5, angle: FACING_ANGLES[0] })
  const mazeRef   = useRef(null)
  const posRef    = useRef({ row: 1, col: 1, facing: 0 })
  const skRef     = useRef(ALL_SKINS[0])

  // ── Canvas dimensions ─────────────────────────────────────────────────────
  const [canvasW, setCanvasW] = useState(480)
  const [canvasH, setCanvasH] = useState(270)
  useEffect(() => {
    const upd = () => {
      const w = Math.min(window.innerWidth - 24, 560)
      setCanvasW(w); setCanvasH(Math.round(w * 9 / 16))
    }
    upd(); window.addEventListener('resize', upd); return () => window.removeEventListener('resize', upd)
  }, [])

  // ── Minimap size: 1.5× bigger than v2 ────────────────────────────────────
  const mmCols   = maze?.grid?.[0]?.length || 13
  const mmRows   = maze?.grid?.length || 13
  const mmCS     = Math.max(6, Math.floor(120 / Math.max(mmCols, mmRows)))
  const mmWidth  = mmCols * mmCS
  const mmHeight = mmRows * mmCS

  // ── Derived ───────────────────────────────────────────────────────────────
  const sk    = ALL_SKINS.find(s => s.id === skinId) || ALL_SKINS[0]
  const nextSk = getNext(total)
  const pct   = useMemo(() => {
    const c = getSkin(total), n = getNext(total)
    if (!n) return 100
    return Math.min(100, Math.round((total - c.threshold) / (n.threshold - c.threshold) * 100))
  }, [total])
  const di = DIFFS.find(d => d.key === diff) || DIFFS[1]

  // ── Sync refs on every render ─────────────────────────────────────────────
  useEffect(() => { mazeRef.current = maze }, [maze])
  useEffect(() => { skRef.current = sk }, [sk])

  // ── Sync pos → refs & animation target ───────────────────────────────────
  useEffect(() => {
    posRef.current = pos
    targetRef.current = {
      px:    pos.col + 0.5,
      py:    pos.row + 0.5,
      angle: FACING_ANGLES[pos.facing],
    }
  }, [pos])

  // ── Continuous RAF animation loop ─────────────────────────────────────────
  useEffect(() => {
    if (gameScreen !== 'game' || !maze) return
    let lastTime = null
    let frameId  = null

    const tick = (t) => {
      if (!lastTime) lastTime = t
      const dt = Math.min(t - lastTime, 50)   // cap at 50 ms (tab unfocus, etc.)
      lastTime = t

      const a   = animRef.current
      const tgt = targetRef.current

      // Exponential lerp — feel snappy but still smooth (~200 ms to settle)
      const k = 1 - Math.exp(-13 * dt / 1000)
      a.px += (tgt.px - a.px) * k
      a.py += (tgt.py - a.py) * k

      // Angle: take shortest arc
      let da = tgt.angle - a.angle
      if (da >  Math.PI) da -= 2 * Math.PI
      if (da < -Math.PI) da += 2 * Math.PI
      a.angle += da * k
      if (Math.abs(da) < 0.0008) a.angle = tgt.angle   // snap when settled

      const m = mazeRef.current
      const p = posRef.current
      const s = skRef.current
      if (m && canvasRef.current && s) {
        renderFrame(
          canvasRef.current, minimapRef.current,
          m.grid, m.dq,
          p.row, p.col, p.facing,
          a.px, a.py, a.angle,
          s.emoji
        )
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => { if (frameId) cancelAnimationFrame(frameId) }
  }, [maze, gameScreen, canvasW, canvasH])   // stable loop; pos changes via refs

  // ── Login focus ───────────────────────────────────────────────────────────
  useEffect(() => { if (screen === 'login' && nameRef.current) setTimeout(() => nameRef.current?.focus(), 200) }, [screen])

  const triggerShake = () => { setLoginShake(true); setTimeout(() => setLoginShake(false), 600) }

  // ── Login handler ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const name = nameInput.trim(), pc = passcodeInput.trim()
    if (!name || name.length < 2) { setLoginError('Enter at least 2 characters for your name!'); triggerShake(); return }
    if (!/^\d{4,6}$/.test(pc))   { setLoginError('Passcode must be 4–6 numbers!'); triggerShake(); return }
    setLoginLoading(true); setLoginError('')
    try {
      const { data: existing, error: fetchErr } = await supabase.from('players').select('*').eq('name', name).maybeSingle()
      if (fetchErr) throw fetchErr
      if (existing) {
        if (existing.passcode !== pc) { setLoginError('Wrong passcode! Try again. 🔒'); triggerShake(); setLoginLoading(false); return }
        setPlayerId(existing.id); setPlayerName(existing.name)
        setTotal(existing.total_points || 0); setSkinId(existing.equipped_skin || 'apprentice')
        setIsReturning(true)
      } else {
        const { data: newP, error: insertErr } = await supabase.from('players').insert({ name, total_points: 0, equipped_skin: 'apprentice', passcode: pc }).select().single()
        if (insertErr) throw insertErr
        setPlayerId(newP.id); setPlayerName(newP.name)
        setTotal(0); setSkinId('apprentice'); setIsReturning(false)
      }
      setScreen('game')
    } catch (e) { console.error(e); setLoginError('Something went wrong — try again!'); triggerShake() }
    finally { setLoginLoading(false) }
  }

  // ── Save progress ─────────────────────────────────────────────────────────
  const saveProgress = useCallback(async (newTotal, newSkinId) => {
    if (!playerId) return
    await supabase.from('players').update({ total_points: newTotal, equipped_skin: newSkinId }).eq('id', playerId)
  }, [playerId])

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = () => {
    const m = genMaze(ops, diff)
    setMaze(m)
    const sp = { row: 1, col: 1, facing: 0 }
    setPos(sp)
    // Teleport animation to start position immediately (no slide-in)
    animRef.current  = { px: 1.5, py: 1.5, angle: FACING_ANGLES[0] }
    targetRef.current = { px: 1.5, py: 1.5, angle: FACING_ANGLES[0] }
    setRun(0); setPendingSkin(null); setShowMath(false)
    setGameScreen('game')
  }
  const toggleOp = k => setOps(prev => { const n = new Set(prev); n.has(k) ? n.size > 1 && n.delete(k) : n.add(k); return n })

  // ── Move ──────────────────────────────────────────────────────────────────
  const move = useCallback((action) => {
    if (showMath || !maze) return
    const { grid, dq } = maze

    setPos(prev => {
      let { row, col, facing } = prev

      if (action === 'turnLeft')  return { row, col, facing: (facing + 3) % 4 }
      if (action === 'turnRight') return { row, col, facing: (facing + 1) % 4 }

      const [dr, dc] = action === 'forward'
        ? FACING_DELTA[facing]
        : FACING_DELTA[(facing + 2) % 4]

      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) return prev

      const cv = grid[nr][nc]
      if (cv === WALL) return prev

      if (cv === DOOR) {
        const qq = dq[`${nr},${nc}`] || genQ(ops, diff)
        setTimeout(() => { setQ(qq); setPending({ row: nr, col: nc }); setAns(''); setWrong(false); setShowMath(true) }, 0)
        return prev
      }

      if (cv === END) { setTimeout(() => setGameScreen('win'), 300) }
      return { row: nr, col: nc, facing }
    })
  }, [showMath, maze, ops, diff])

  // ── Keyboard handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (gameScreen !== 'game' || screen !== 'game') return
    const h = e => {
      const map = { ArrowUp: 'forward', ArrowDown: 'backward', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight' }
      const action = map[e.key]
      if (action) { e.preventDefault(); move(action) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [gameScreen, screen, move])

  // ── Focus math input ──────────────────────────────────────────────────────
  useEffect(() => { if (showMath && iref.current) setTimeout(() => iref.current?.focus(), 130) }, [showMath])

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submit = () => {
    const n = parseInt(ans, 10)
    if (!isNaN(n) && n === q.ans) {
      const ng = maze.grid.map(r => [...r]); ng[pending.row][pending.col] = PATH
      const ndq = { ...maze.dq }; delete ndq[`${pending.row},${pending.col}`]
      const newMaze = { grid: ng, dq: ndq }
      setMaze(newMaze)
      const earned = q.curPts
      setRun(s => s + earned)
      const nt = total + earned; setTotal(nt)
      const ju = getUnlocked(nt).find(s => !getUnlocked(total).map(x => x.id).includes(s.id))
      if (ju) setPendingSkin(ju.id)
      saveProgress(nt, skinId)
      setShowMath(false); setSparkle(true)
      setPopup({ v: earned, k: Date.now() }); setTimeout(() => setPopup(null), 1500)
      setPos(prev => ({ ...prev, row: pending.row, col: pending.col }))
      if (ng[pending.row][pending.col] === END) setTimeout(() => setGameScreen('win'), 1100)
    } else {
      setWrong(true); setAns('')
      setQ(prev => {
        const nw = prev.wrongs + 1, red = Math.max(5, Math.round(prev.curPts * .5 / 5) * 5)
        setMaze(md => {
          if (!md) return md
          const k = `${pending.row},${pending.col}`
          return { ...md, dq: { ...md.dq, [k]: { ...md.dq[k], curPts: red, wrongs: nw } } }
        })
        return { ...prev, curPts: red, wrongs: nw }
      })
      setTimeout(() => setWrong(false), 700)
    }
  }

  const equipSkin = useCallback((id) => { setSkinId(id); saveProgress(total, id) }, [total, saveProgress])

  // ─────────────────────────────────────────────────────────────────────────────
  // ── JSX ──────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#080820', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito',sans-serif", position: 'relative', overflow: 'hidden', padding: 10 }}>
      <style>{CSS}</style>
      {STARS.map(s => <div key={s.id} className="star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.sz, height: s.sz, '--dr': `${s.dr}s`, '--dl': `${s.dl}s` }} />)}

      {/* ════════════════════ LOGIN ════════════════════ */}
      {screen === 'login' && (
        <div className="appear" style={{ textAlign: 'center', zIndex: 10, maxWidth: 420, width: '100%', padding: '0 16px' }}>
          <div style={{ fontSize: 72, marginBottom: 8 }} className="wf">🧙‍♂️</div>
          <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(22px,5vw,34px)', fontWeight: 900, color: '#f9ca74', letterSpacing: 2, textShadow: '0 0 20px #f9ca74aa', marginBottom: 6 }}>Wizard Math Maze</h1>
          <p style={{ color: '#c8a4ff', fontSize: 14, marginBottom: 24, fontFamily: "'Cinzel',serif", letterSpacing: 1 }}>Who dares enter the realm?</p>
          <div className={loginShake ? 'shake' : ''} style={{ background: '#0e0e35', border: `2px solid ${loginError ? '#ff5555' : '#252558'}`, borderRadius: 20, padding: '28px 24px', transition: 'border-color .2s' }}>
            <label style={{ display: 'block', color: '#c8a4ff', fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: 2, marginBottom: 7, textAlign: 'left' }}>WIZARD NAME</label>
            <input ref={nameRef} type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Tab' && (e.preventDefault(), passcodeRef.current?.focus())} maxLength={20} placeholder="e.g. Lily, Max, Zara..." style={{ width: '100%', padding: '11px 15px', fontSize: 17, fontWeight: 800, background: '#0a0a2c', border: '2px solid #35358a', borderRadius: 11, color: '#fff', marginBottom: 14, outline: 'none', fontFamily: "'Nunito',sans-serif" }} />
            <label style={{ display: 'block', color: '#c8a4ff', fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: 2, marginBottom: 7, textAlign: 'left' }}>SECRET PASSCODE <span style={{ color: '#404070', fontSize: 9 }}>(4–6 numbers)</span></label>
            <input ref={passcodeRef} type="password" inputMode="numeric" pattern="[0-9]*" value={passcodeInput} onChange={e => setPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={e => e.key === 'Enter' && !loginLoading && handleLogin()} maxLength={6} placeholder="••••" style={{ width: '100%', padding: '11px 15px', fontSize: 22, fontWeight: 800, background: '#0a0a2c', border: '2px solid #35358a', borderRadius: 11, color: '#fff', textAlign: 'center', marginBottom: 14, outline: 'none', fontFamily: "'Nunito',sans-serif", letterSpacing: 6 }} />
            {loginError && <div style={{ color: '#ff5555', fontSize: 12, marginBottom: 12, fontWeight: 700 }}>{loginError}</div>}
            <button className="bh" onClick={handleLogin} disabled={loginLoading} style={{ width: '100%', padding: '13px', borderRadius: 13, border: 'none', background: loginLoading ? '#252548' : 'linear-gradient(135deg,#f9ca74,#f0932b)', color: '#180a00', fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 16, cursor: loginLoading ? 'not-allowed' : 'pointer', boxShadow: loginLoading ? 'none' : '0 0 24px #f9ca7468', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loginLoading ? <><span className="spinner">✨</span>Entering realm...</> : 'Enter the Realm! 🗺️'}
            </button>
            <p style={{ color: '#2a2a50', fontSize: 10, marginTop: 14, lineHeight: 1.7, textAlign: 'center' }}>New wizard? Choose a name + passcode to create your account.<br />Returning wizard? Use your same name + passcode to load your progress.</p>
          </div>
        </div>
      )}

      {/* ════════════════════ START / SETTINGS ════════════════════ */}
      {screen === 'game' && gameScreen === 'start' && (
        <div className="appear" style={{ textAlign: 'center', zIndex: 10, maxWidth: 600, width: '100%' }}>
          <div style={{ marginBottom: 10 }}>
            {isReturning
              ? <div style={{ background: 'linear-gradient(90deg,#c8a4ff18,#f9ca7418)', border: '1px solid #c8a4ff44', borderRadius: 14, padding: '9px 20px', display: 'inline-block' }}><span style={{ color: '#c8a4ff', fontFamily: "'Cinzel',serif", fontSize: 13 }}>Welcome back, </span><span style={{ color: '#f9ca74', fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 900 }}>{playerName}</span><span style={{ color: '#c8a4ff', fontFamily: "'Cinzel',serif", fontSize: 13 }}> ✨</span></div>
              : <div style={{ background: 'linear-gradient(90deg,#7ee8a218,#c8a4ff18)', border: '1px solid #7ee8a244', borderRadius: 14, padding: '9px 20px', display: 'inline-block' }}><span style={{ color: '#7ee8a2', fontFamily: "'Cinzel',serif", fontSize: 13 }}>Welcome, new wizard </span><span style={{ color: '#f9ca74', fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 900 }}>{playerName}</span><span style={{ color: '#7ee8a2', fontFamily: "'Cinzel',serif", fontSize: 13 }}> 🌟</span></div>
            }
          </div>
          <div style={{ fontSize: 64, marginBottom: 4 }} className="wf">{sk.emoji}</div>
          <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(20px,5vw,34px)', fontWeight: 900, color: '#f9ca74', letterSpacing: 2, textShadow: '0 0 20px #f9ca74aa', marginBottom: 4 }}>Wizard Math Maze</h1>
          {/* Progress bar */}
          <div style={{ background: '#0e0e35', border: '1px solid #252558', borderRadius: 14, padding: '10px 15px', margin: '8px auto 11px', display: 'inline-flex', alignItems: 'center', gap: 11, maxWidth: 400, width: '100%' }}>
            <span style={{ fontSize: 22 }}>{sk.wand}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontFamily: "'Cinzel',serif", color: sk.color, fontWeight: 700, fontSize: 12 }}>{sk.title}</span><span style={{ fontFamily: "'Cinzel',serif", color: '#f9ca74', fontWeight: 900, fontSize: 12 }}>⭐ {total.toLocaleString()}</span></div>
              <div style={{ height: 5, background: '#1a1a42', borderRadius: 4, marginTop: 5 }}><div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg,${sk.color},${nextSk?.color || '#f9ca74'})`, width: `${pct}%`, transition: 'width .6s ease' }} /></div>
              <div style={{ fontSize: 9, color: '#404080', marginTop: 2 }}>{nextSk ? `${(nextSk.threshold - total).toLocaleString()} pts to ${nextSk.emoji} ${nextSk.title}` : '🌟 Max rank!'}</div>
            </div>
            <button className="bh" onClick={() => { setShopNew(false); setShop(true) }} style={{ background: '#1a1a50', border: '1px solid #4040a0', borderRadius: 9, padding: '5px 8px', color: '#c8a4ff', cursor: 'pointer', fontSize: 10, fontFamily: "'Cinzel',serif", fontWeight: 700, whiteSpace: 'nowrap' }}>👗 Wardrobe</button>
          </div>
          {/* Operation toggles */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#c8a4ff', fontFamily: "'Cinzel',serif", fontSize: 10, marginBottom: 6, letterSpacing: 2 }}>CHOOSE YOUR SPELLS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {OPS.map(({ key, label, icon, color }) => { const on = ops.has(key); return (<button key={key} className="bh" onClick={() => toggleOp(key)} style={{ padding: '7px 11px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${on ? color : '#1e1e50'}`, background: on ? `${color}18` : '#0c0c2e', color: on ? color : '#3a3a70', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${on ? color : '#30306a'}`, background: on ? color : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#0c0c2e', fontWeight: 900, flexShrink: 0 }}>{on ? '✓' : ''}</span><span>{icon}</span>{label}</button>) })}
            </div>
          </div>
          {/* Difficulty */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: '#c8a4ff', fontFamily: "'Cinzel',serif", fontSize: 10, marginBottom: 6, letterSpacing: 2 }}>DIFFICULTY</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {DIFFS.map(({ key, label, icon, color, desc }) => (<button key={key} className="bh" onClick={() => setDiff(key)} style={{ padding: '6px 9px', borderRadius: 10, border: `2px solid ${diff === key ? color : '#1e1e50'}`, background: diff === key ? `${color}18` : '#0c0c2e', color: diff === key ? color : '#3a3a70', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 11, transition: 'all .2s', textAlign: 'center', minWidth: 68 }}><div style={{ fontSize: 13 }}>{icon}</div><div>{label}</div><div style={{ fontSize: 8, opacity: .6, marginTop: 1 }}>{desc}</div></button>))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="bh" onClick={startGame} style={{ padding: '12px 36px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#f9ca74,#f0932b)', color: '#180a00', fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 16, cursor: 'pointer', letterSpacing: 1, boxShadow: '0 0 30px #f9ca7478' }}>Begin the Quest! 🗺️</button>
            <button className="bh" onClick={() => { setScreen('login'); setNameInput(''); setPasscodeInput('') }} style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid #252550', background: '#0c0c2a', color: '#404080', fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Switch Wizard</button>
          </div>
        </div>
      )}

      {/* ════════════════════ GAME — First-Person View ════════════════════ */}
      {screen === 'game' && gameScreen === 'game' && maze && (
        <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', maxWidth: canvasW + 16 }}>

          {/* HUD */}
          <div style={{ background: '#0d0d30', border: '1px solid #20204a', borderRadius: 11, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div style={{ fontSize: 18 }} className="wf">{sk.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontFamily: "'Cinzel',serif", color: sk.color, fontWeight: 700, fontSize: 10 }}>{sk.wand} {playerName}</span><span style={{ fontFamily: "'Cinzel',serif", color: '#f9ca74', fontWeight: 900, fontSize: 12 }}>⭐ {total.toLocaleString()}</span></div>
              <div style={{ height: 3, background: '#16163a', borderRadius: 3, marginTop: 3 }}><div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg,${sk.color},${nextSk?.color || '#f9ca74'})`, width: `${pct}%`, transition: 'width .5s ease' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <div style={{ background: '#0e0e32', border: '1px solid #252560', borderRadius: 8, padding: '3px 9px', color: '#7ee8a2', fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 10 }}>+{run}</div>
              <div style={{ background: '#0e0e32', border: '1px solid #252560', borderRadius: 8, padding: '3px 8px', color: di.color, fontSize: 9, fontWeight: 700 }}>{di.icon} {di.label}</div>
              <button className="bh" onClick={() => setGameScreen('start')} style={{ background: '#0c0c2a', border: '1px solid #1e1e50', borderRadius: 7, padding: '3px 8px', color: '#404080', cursor: 'pointer', fontSize: 10 }}>← Menu</button>
            </div>
          </div>

          {/* 3D Canvas + minimap overlay */}
          <div style={{ position: 'relative', width: canvasW, borderRadius: 12, overflow: 'hidden', border: '2px solid #1a1a45', boxShadow: '0 0 50px #08082870', flexShrink: 0 }}>
            <canvas ref={canvasRef} width={canvasW} height={canvasH} style={{ display: 'block', width: canvasW, height: canvasH }} />

            {/* Minimap — top-right corner */}
            <div style={{ position: 'absolute', top: 8, right: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(100,80,200,0.5)' }}>
              <canvas ref={minimapRef} width={mmWidth} height={mmHeight} style={{ display: 'block' }} />
            </div>

            {/* Sparkle overlay */}
            {sparkle && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <Sparkle onDone={() => setSparkle(false)} />
              </div>
            )}

            {/* Point popup */}
            {popup && (
              <div key={popup.k} style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', color: '#f9ca74', fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 24, zIndex: 60, pointerEvents: 'none', whiteSpace: 'nowrap', animation: 'sup .3s ease-out, fout 1.5s .2s forwards', textShadow: '0 0 16px #f9ca74' }}>
                +{popup.v} ⭐
              </div>
            )}
          </div>

          {/* D-pad controls */}
          {(() => {
            const bsz = 52
            const bs = { width: bsz, height: bsz, fontSize: 22, background: '#0e0e30', border: '2px solid #20205a', borderRadius: 10, cursor: 'pointer', touchAction: 'manipulation', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }
            return (
              <div style={{ display: 'grid', gridTemplateColumns: `${bsz}px ${bsz}px ${bsz}px`, gridTemplateRows: `${bsz}px ${bsz}px`, gap: 7 }}>
                <button className="bh" onClick={() => move('forward')}   style={{ ...bs, gridColumn: 2, gridRow: 1 }}>⬆️</button>
                <button className="bh" onClick={() => move('turnLeft')}  style={{ ...bs, gridColumn: 1, gridRow: 2 }}>↩️</button>
                <button className="bh" onClick={() => move('backward')}  style={{ ...bs, gridColumn: 2, gridRow: 2 }}>⬇️</button>
                <button className="bh" onClick={() => move('turnRight')} style={{ ...bs, gridColumn: 3, gridRow: 2 }}>↪️</button>
              </div>
            )
          })()}
          <p style={{ color: '#252548', fontSize: 9 }}>Arrow keys • ⬆️⬇️ move forward/back • ↩️↪️ turn • Walk into golden doors 🔐 to cast spells</p>
        </div>
      )}

      {/* ════════════════════ MATH PUZZLE POPUP ════════════════════ */}
      {showMath && q && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000092', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(5px)' }}>
          <div className={`appear${wrong ? ' shake' : ''}`} style={{ background: 'linear-gradient(160deg,#0f1048,#171858)', border: `2px solid ${q.wrongs > 0 ? '#ff8855' : '#f9ca74'}`, borderRadius: 22, padding: 'clamp(16px,4vw,32px) clamp(16px,5vw,40px)', textAlign: 'center', boxShadow: '0 0 70px #f9ca7438', minWidth: 270, maxWidth: '90vw', width: 'min(370px,90vw)' }}>
            <div style={{ fontSize: 34, marginBottom: 5 }}>{q.emoji}</div>
            <h2 style={{ fontFamily: "'Cinzel',serif", color: '#c8a4ff', fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>🔐 Unlock the Door!</h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: q.wrongs > 0 ? '#2a1000' : '#171740', border: `1px solid ${q.wrongs > 0 ? '#ff885550' : '#f9ca7438'}`, borderRadius: 8, padding: '4px 11px', marginBottom: 9, color: q.wrongs > 0 ? '#ff8855' : '#f9ca74', fontSize: 12, fontWeight: 800 }}>
              {q.wrongs > 0 && <span>⚠️</span>}<span>Solve it →</span><span style={{ fontSize: 16 }}>+{q.curPts}</span><span>⭐</span>{q.wrongs > 0 && <span style={{ fontSize: 9, opacity: .8 }}>({q.wrongs} wrong)</span>}
            </div>
            {q.wrongs > 0 && q.curPts > 5 && <div style={{ fontSize: 9, color: '#ff885588', marginBottom: 6 }}>Wrong again → +{Math.max(5, Math.round(q.curPts * .5 / 5) * 5)} ⭐</div>}
            <div style={{ fontSize: 'clamp(26px,7vw,46px)', fontWeight: 900, color: q.wrongs > 0 ? '#ffaa77' : '#ffe580', fontFamily: "'Cinzel',serif", marginBottom: 12, textShadow: `0 0 24px ${q.wrongs > 0 ? '#ff8855' : '#f9ca74'}` }}>{q.disp} = ?</div>
            <input ref={iref} type="number" inputMode="numeric" pattern="[0-9]*" value={ans} onChange={e => setAns(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setShowMath(false) }} style={{ width: '100%', padding: '12px 13px', fontSize: 28, fontWeight: 900, background: '#0a0a2c', border: `2px solid ${wrong ? '#ff5555' : '#4a4ab0'}`, borderRadius: 11, color: wrong ? '#ff6655' : '#ffffff', textAlign: 'center', marginBottom: 10, outline: 'none', fontFamily: "'Nunito',sans-serif" }} placeholder="?" />
            {wrong && <div style={{ color: '#ff6655', fontWeight: 700, marginBottom: 8, fontSize: 12 }}>🚫 Try again! Points halved!</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="bh" onClick={submit} style={{ padding: '10px 20px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#f9ca74,#f0932b)', color: '#180a00', fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 20px #f9ca7458' }}>Cast Spell! ✨</button>
              <button className="bh" onClick={() => setShowMath(false)} style={{ padding: '10px 12px', borderRadius: 11, border: '1px solid #35358a', background: '#0a0a2c', color: '#8080c0', fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ WARDROBE ════════════════════ */}
      {shop && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000b8', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(8px)', padding: 14 }}>
          <div style={{ background: 'linear-gradient(160deg,#100d3a,#1a1260)', border: '2px solid #c8a4ff', borderRadius: 22, padding: '22px 18px', maxWidth: 480, width: '100%', boxShadow: '0 0 80px #c8a4ff44', maxHeight: '90vh', overflowY: 'auto' }}>
            {shopNew && <div style={{ background: 'linear-gradient(90deg,#c8a4ff22,#f9ca7422)', border: '1px solid #f9ca74', borderRadius: 9, padding: '7px 14px', marginBottom: 12, textAlign: 'center', color: '#f9ca74', fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700 }}>✨ New wizard unlocked!</div>}
            <h2 style={{ fontFamily: "'Cinzel',serif", color: '#c8a4ff', fontSize: 18, fontWeight: 900, textAlign: 'center', marginBottom: 13, letterSpacing: 1 }}>🧙 Wizard Wardrobe</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {ALL_SKINS.map(sk2 => { const owned = total >= sk2.threshold, active = sk2.id === skinId; return (<button key={sk2.id} onClick={() => { if (owned) { equipSkin(sk2.id); setShop(false); setShopNew(false) } }} style={{ padding: '11px 8px', borderRadius: 11, textAlign: 'center', border: `2px solid ${active ? sk2.color : owned ? sk2.color + '66' : '#1e1e48'}`, background: active ? `${sk2.color}22` : owned ? '#141440' : '#0d0d2a', cursor: owned ? 'pointer' : 'default', opacity: owned ? 1 : .45, transition: 'all .2s', position: 'relative' }}>{active && <div style={{ position: 'absolute', top: -6, right: -6, background: '#f9ca74', color: '#180a00', borderRadius: 999, padding: '1px 6px', fontSize: 8, fontWeight: 900, fontFamily: "'Cinzel',serif" }}>ON</div>}{!owned && <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', background: '#1e1e50', border: '1px solid #3a3a70', color: '#5050a0', borderRadius: 999, padding: '1px 7px', fontSize: 8, fontWeight: 700 }}>🔒{sk2.threshold.toLocaleString()}</div>}<div style={{ fontSize: 30, marginBottom: 3 }}>{sk2.emoji}</div><div style={{ fontFamily: "'Cinzel',serif", color: owned ? sk2.color : '#3a3a70', fontWeight: 700, fontSize: 11, marginBottom: 2 }}>{sk2.title}</div><div style={{ fontSize: 17, marginBottom: 2 }}>{sk2.wand}</div><div style={{ color: owned ? '#6060a0' : '#2a2a50', fontSize: 9 }}>{sk2.desc}</div></button>) })}
            </div>
            {getNext(total) && <div style={{ marginTop: 12, padding: '7px 12px', background: '#0d0d28', border: '1px solid #2a2a50', borderRadius: 9, color: '#4040a0', fontSize: 10, textAlign: 'center' }}>Next: {getNext(total).emoji} <strong style={{ color: getNext(total).color }}>{getNext(total).title}</strong> — {(getNext(total).threshold - total).toLocaleString()} pts away</div>}
            <button onClick={() => { setShop(false); setShopNew(false) }} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#c8a4ff,#9b59b6)', color: '#100d3a', fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>{shopNew ? 'Equip & Continue! ✨' : 'Close Wardrobe ✕'}</button>
          </div>
        </div>
      )}

      {/* ════════════════════ WIN ════════════════════ */}
      {screen === 'game' && gameScreen === 'win' && (
        <div className="victory" style={{ textAlign: 'center', zIndex: 10, maxWidth: 480, padding: '0 14px' }}>
          <div style={{ fontSize: 64, marginBottom: 7 }}>🏆</div>
          <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 'clamp(20px,6vw,34px)', fontWeight: 900, color: '#f9ca74', textShadow: '0 0 30px #f9ca74aa', marginBottom: 5 }}>Quest Complete!</h1>
          {pendingSkin && (() => { const ns = ALL_SKINS.find(s => s.id === pendingSkin); return ns ? (<div style={{ background: `${ns.color}18`, border: `2px solid ${ns.color}`, borderRadius: 13, padding: '9px 18px', margin: '0 auto 11px', display: 'inline-block' }}><div style={{ fontFamily: "'Cinzel',serif", color: '#f9ca74', fontSize: 10, letterSpacing: 2 }}>✨ NEW WIZARD UNLOCKED!</div><div style={{ fontSize: 36, margin: '3px 0' }}>{ns.emoji}</div><div style={{ fontFamily: "'Cinzel',serif", color: ns.color, fontWeight: 900, fontSize: 16 }}>{ns.title} {ns.wand}</div></div>) : null })()}
          <p style={{ color: '#c8a4ff', fontSize: 14, marginBottom: 11 }}>{playerName} conquers the magical maze! {sk.emoji}</p>
          <div style={{ background: '#0e0e35', border: '2px solid #f9ca74', borderRadius: 14, padding: '12px 24px', margin: '0 auto 13px', display: 'inline-block' }}>
            <div style={{ color: '#7ee8a2', fontFamily: "'Cinzel',serif", fontSize: 17, fontWeight: 900 }}>+{run} this run</div>
            <div style={{ color: '#f9ca74', fontFamily: "'Cinzel',serif", fontSize: 22, fontWeight: 900, marginTop: 3 }}>⭐ {total.toLocaleString()} total</div>
            <div style={{ color: sk.color, fontSize: 10, marginTop: 3 }}>{sk.wand} {sk.title}{nextSk ? ` · ${(nextSk.threshold - total).toLocaleString()} to ${nextSk.emoji}` : ' · Max rank!'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="bh" onClick={startGame} style={{ padding: '10px 18px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg,#f9ca74,#f0932b)', color: '#180a00', fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 20px #f9ca7458' }}>Play Again! 🗺️</button>
            <button className="bh" onClick={() => setGameScreen('start')} style={{ padding: '10px 18px', borderRadius: 13, border: '2px solid #c8a4ff', background: '#0e0e35', color: '#c8a4ff', fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🏰 Return to Castle</button>
            <button className="bh" onClick={() => { setShopNew(!!pendingSkin); setShop(true) }} style={{ padding: '10px 18px', borderRadius: 13, border: `2px solid ${pendingSkin ? '#f9ca74' : '#7ee8a2'}`, background: '#0e0e35', color: pendingSkin ? '#f9ca74' : '#7ee8a2', fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: pendingSkin ? '0 0 16px #f9ca7444' : 'none' }}>{pendingSkin ? '✨ New Wizard!' : '👗 Wardrobe'}</button>
            <button className="bh" onClick={() => { setScreen('login'); setNameInput(''); setPasscodeInput('') }} style={{ padding: '10px 18px', borderRadius: 13, border: '1px solid #252550', background: '#0c0c2a', color: '#404080', fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Switch Wizard</button>
          </div>
        </div>
      )}
    </div>
  )
}
