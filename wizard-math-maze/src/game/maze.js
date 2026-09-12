import { nextQuestion } from './curriculum.js'
import { gateFraction, roundPts } from './math.js'

export const WALL = 0, PATH = 1, DOOR = 2, START = 3, END = 4

// 0=East 1=South 2=West 3=North
export const FACING_ANGLES = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
export const FACING_DELTA  = [[0, 1], [1, 0], [0, -1], [-1, 0]] // [dRow, dCol]

const DIRS4 = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const key = (r, c) => `${r},${c}`

// ─── Min-door Dijkstra ────────────────────────────────────────────────────────
// Doors cost 1, open floor costs 0, so the shortest path is the one that opens
// the FEWEST doors. If that number is under 3 we add another door, which is how
// we guarantee there is no cheap route to the exit that skips the maths.
export function findMinDoorPath(grid) {
  const H = grid.length, W = grid[0].length
  const dist = Array.from({ length: H }, () => Array(W).fill(Infinity))
  const prev = Array.from({ length: H }, () => Array(W).fill(null))
  dist[1][1] = 0
  const pq = [[0, 1, 1]]
  let endR = -1, endC = -1
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (grid[r][c] === END) { endR = r; endC = c }

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0])
    const [d, r, c] = pq.shift()
    if (d > dist[r][c]) continue
    for (const [dr, dc] of DIRS4) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue
      const cell = grid[nr][nc]
      if (cell === WALL) continue
      const nd = d + (cell === DOOR ? 1 : 0)
      if (nd < dist[nr][nc]) { dist[nr][nc] = nd; prev[nr][nc] = [r, c]; pq.push([nd, nr, nc]) }
    }
  }

  const minCount = dist[endR]?.[endC] ?? 0
  const pathCells = []
  let r = endR, c = endC
  while (prev[r]?.[c]) {
    const [pr, pc] = prev[r][c]
    if (grid[r][c] === PATH) pathCells.push([r, c])
    r = pr; c = pc
  }
  return { minCount, pathCells }
}

// ─── Generator ────────────────────────────────────────────────────────────────
/**
 * Recursive-backtracker maze, then extra openings punched through so it has
 * loops rather than one tree-like corridor, then doors placed and topped up
 * until every route to the exit crosses at least 3 of them.
 *
 * Door questions come from the curriculum engine, so a maze quietly weights
 * itself toward the facts this player keeps missing.
 */
export function genMaze(ops, dk, profile, perks = {}, rooms = 6) {
  const R = rooms, C = rooms, H = R * 2 + 1, W = C * 2 + 1
  const g = Array.from({ length: H }, () => Array(W).fill(WALL))
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) g[r * 2 + 1][c * 2 + 1] = PATH

  const vis = Array.from({ length: R }, () => Array(C).fill(false))
  ;(function carve(r, c) {
    vis[r][c] = true
    for (const [dr, dc] of [...DIRS4].sort(() => Math.random() - 0.5)) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < R && nc >= 0 && nc < C && !vis[nr][nc]) {
        g[r * 2 + 1 + dr][c * 2 + 1 + dc] = PATH
        carve(nr, nc)
      }
    }
  })(0, 0)

  // Punch extra openings so there are alternate routes (and dead ends are rarer).
  let extra = Math.floor(R * C * 0.35), attempt = 0
  while (extra > 0 && attempt < 600) {
    const r = 1 + Math.floor(Math.random() * (H - 2))
    const c = 1 + Math.floor(Math.random() * (W - 2))
    if (g[r][c] === WALL) {
      const horiz = r % 2 === 1 && c % 2 === 0 && g[r][c - 1] === PATH && g[r][c + 1] === PATH
      const vert  = r % 2 === 0 && c % 2 === 1 && g[r - 1][c] === PATH && g[r + 1][c] === PATH
      if (horiz || vert) { g[r][c] = PATH; extra-- }
    }
    attempt++
  }

  g[1][1] = START
  g[H - 2][W - 2] = END

  const nearStart = (r, c) => r <= 2 && c <= 2
  const nearEnd   = (r, c) => r >= H - 3 && c >= W - 3
  const open = []
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
    if (g[r][c] === PATH && !nearStart(r, c) && !nearEnd(r, c)) open.push([r, c])
  open.sort(() => Math.random() - 0.5)

  const dq = {}
  const recent = []
  const addDoor = (r, c) => {
    const q = nextQuestion({ ...profile, settings: { ...(profile?.settings || {}), diff: dk } }, ops, dk, recent)
    recent.push(q.key)
    if (recent.length > 4) recent.shift()
    g[r][c] = DOOR
    dq[key(r, c)] = q
  }

  for (const [r, c] of open.slice(0, 6 + Math.floor(Math.random() * 4))) addDoor(r, c)

  let guard = 0
  while (guard++ < 50) {
    const { minCount, pathCells } = findMinDoorPath(g)
    if (minCount >= 3) break
    const cands = pathCells.filter(([r, c]) => !nearStart(r, c) && !nearEnd(r, c))
    if (!cands.length) break
    const [r, c] = cands[Math.floor(Math.random() * cands.length)]
    addDoor(r, c)
  }

  // Rune stones: scattered pickups, each worth one visual hint at a door.
  const stones = {}
  const stoneCount = 4 + (perks.stones || 0)
  const stoneSpots = open.filter(([r, c]) => g[r][c] === PATH).slice(0, stoneCount)
  for (const [r, c] of stoneSpots) stones[key(r, c)] = true

  // "True sight": a few doors show their numbers legibly from a distance
  // instead of the usual blur. This is the Seer perk made visible.
  const doorKeys = Object.keys(dq)
  for (let i = 0; i < Math.min(perks.seer || 0, doorKeys.length); i++) {
    dq[doorKeys[i]] = { ...dq[doorKeys[i]], clear: true }
  }

  // The exit gate. Requiring a SHARE of what this maze actually contains means
  // it's always reachable by construction, however many doors happened to be
  // placed — a fixed target could strand her in a maze that generated few.
  const pointsAvailable = doorKeys.reduce((s, k) => s + (dq[k].basePts || 0), 0)
  const frac = Math.max(0.2, gateFraction(dk, profile, ops) - (perks.gate || 0))
  const pointsRequired = Math.min(pointsAvailable, roundPts(pointsAvailable * frac))

  const seen = Array.from({ length: H }, () => Array(W).fill(false))
  revealFrom(seen, g, 1, 1)

  return {
    grid: g, dq, stones, seen,
    doorTotal: doorKeys.length,
    pointsAvailable, pointsRequired,
  }
}

/**
 * What lies immediately ahead, to the left, to the right and behind — in the
 * player's own frame of reference.
 *
 * A first-person view with any sane field of view simply cannot show a corridor
 * opening at 90 degrees to your left: the wall face is edge-on, so it's
 * invisible from the square you're standing on. Rather than distort the whole
 * projection to fake it, the UI reads this and draws explicit signposts at the
 * screen edges, so the available turns are always legible.
 */
export function openings(grid, row, col, facing) {
  const rel = [0, 1, 2, 3].map(turn => {
    const f = (facing + turn) % 4
    const [dr, dc] = FACING_DELTA[f]
    const cell = grid[row + dr]?.[col + dc]
    return cell === undefined ? WALL : cell
  })
  // rel[0] ahead, rel[1] right, rel[2] behind, rel[3] left
  return { ahead: rel[0], right: rel[1], behind: rel[2], left: rel[3] }
}

export const isOpen = cell => cell === PATH || cell === DOOR || cell === END || cell === START

// ─── Fog of war ───────────────────────────────────────────────────────────────
/**
 * Reveal the corridor the player is standing in, out to `depth` steps through
 * open cells, plus the walls touching anything revealed (so the map reads as
 * solid rooms rather than a scatter of dots). Mutates `seen` in place and
 * returns the number of newly revealed cells.
 */
export function revealFrom(seen, grid, row, col, depth = 4) {
  const H = grid.length, W = grid[0].length
  let added = 0
  const mark = (r, c) => {
    if (r < 0 || r >= H || c < 0 || c >= W) return
    if (!seen[r][c]) { seen[r][c] = true; added++ }
  }
  const q = [[row, col, 0]]
  const done = new Set([key(row, col)])
  mark(row, col)
  while (q.length) {
    const [r, c, d] = q.shift()
    for (const [dr, dc] of DIRS4) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue
      mark(nr, nc)                                // walls get revealed as edges
      if (grid[nr][nc] === WALL || d + 1 > depth) continue
      const k = key(nr, nc)
      if (done.has(k)) continue
      done.add(k)
      q.push([nr, nc, d + 1])
    }
  }
  return added
}

// ─── Guidance ─────────────────────────────────────────────────────────────────
/**
 * Bearing (world radians) of the first step toward the nearest unsolved door,
 * or toward the exit once every door on the way is open. Returns null if there
 * is nothing to point at.
 */
export function guideBearing(grid, row, col) {
  const H = grid.length, W = grid[0].length
  let anyDoor = false
  for (let r = 0; r < H && !anyDoor; r++) for (let c = 0; c < W; c++) if (grid[r][c] === DOOR) { anyDoor = true; break }
  const target = anyDoor ? DOOR : END

  const prev = new Map()
  const q = [[row, col]]
  prev.set(key(row, col), null)
  let found = null
  while (q.length && !found) {
    const [r, c] = q.shift()
    for (const [dr, dc] of DIRS4) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue
      const k = key(nr, nc)
      if (prev.has(k)) continue
      const cell = grid[nr][nc]
      if (cell === WALL) continue
      prev.set(k, [r, c])
      if (cell === target) { found = [nr, nc]; break }
      if (cell !== DOOR) q.push([nr, nc])   // unsolved doors block the route
    }
  }
  if (!found) return null

  // Walk back to the step immediately after the player.
  let cur = found, back = prev.get(key(...found))
  while (back && !(back[0] === row && back[1] === col)) { cur = back; back = prev.get(key(...back)) }
  const dr = cur[0] - row, dc = cur[1] - col
  return { angle: Math.atan2(dr, dc), target: anyDoor ? 'door' : 'exit', cell: found }
}

export const cellKey = key
