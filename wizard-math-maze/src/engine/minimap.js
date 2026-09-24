import { WALL, DOOR, END, START, cellKey } from '../game/maze.js'

/**
 * Fog-of-war minimap. Only cells she has actually walked past are drawn, so the
 * map is a record of exploration rather than a solution key — but it means she
 * can always work out where she has and hasn't been, which is the single
 * biggest cause of a kid giving up on a first-person maze.
 */
export function renderMinimap(ctx, { grid, dq, seen, stones, row, col, facing, time }) {
  const W = ctx.canvas.width, H = ctx.canvas.height
  const rows = grid.length, cols = grid[0].length
  const cs = Math.floor(Math.min(W / cols, H / rows))
  const ox = Math.floor((W - cs * cols) / 2)
  const oy = Math.floor((H - cs * rows) / 2)

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(6,5,22,0.95)'
  ctx.fillRect(0, 0, W, H)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cs, y = oy + r * cs
      if (!seen?.[r]?.[c]) { continue }              // unexplored: leave it dark
      const cell = grid[r][c]
      if (cell === WALL) {
        ctx.fillStyle = '#2b2358'
      } else if (cell === DOOR) {
        const q = dq?.[cellKey(r, c)]
        ctx.fillStyle = q?.color || '#f9ca74'
      } else if (cell === END) {
        ctx.fillStyle = '#8affd4'
      } else if (cell === START) {
        ctx.fillStyle = '#4a4380'
      } else {
        ctx.fillStyle = '#141033'
      }
      ctx.fillRect(x, y, cs, cs)

      // Doors get a rune so the colour isn't the only cue.
      if (cell === DOOR && cs >= 8) {
        const q = dq?.[cellKey(r, c)]
        ctx.fillStyle = '#120a22'
        ctx.font = `900 ${Math.floor(cs * 0.8)}px Nunito, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(q?.rune || '?', x + cs / 2, y + cs / 2 + 0.5)
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      }
      if (cell === END && cs >= 8) {
        ctx.fillStyle = '#053a2a'
        ctx.font = `900 ${Math.floor(cs * 0.8)}px Nunito, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('★', x + cs / 2, y + cs / 2 + 0.5)
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      }
      const stone = stones?.[cellKey(r, c)]
      if (stone && cs >= 6) {
        // The great one is gold and twice the size, so a glance at the map
        // says where the detour is worth taking.
        const great = stone !== true && stone > 1
        ctx.fillStyle = great ? '#ffcb45' : '#5ad9ff'
        ctx.beginPath()
        ctx.arc(x + cs / 2, y + cs / 2, Math.max(1.2, cs * (great ? 0.3 : 0.18)), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Player: a dot with a facing wedge.
  const pxc = ox + col * cs + cs / 2, pyc = oy + row * cs + cs / 2
  const ang = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2][facing]
  ctx.save()
  ctx.translate(pxc, pyc)
  ctx.rotate(ang)
  ctx.fillStyle = '#fff6d8'
  ctx.shadowColor = '#f9ca74'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.moveTo(cs * 0.85, 0)
  ctx.lineTo(-cs * 0.30, -cs * 0.46)
  ctx.lineTo(-cs * 0.06, 0)
  ctx.lineTo(-cs * 0.30, cs * 0.46)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(249,202,116,0.55)'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
}

/**
 * Screen-relative arrow angle for the compass: the world bearing of the next
 * step, rotated into the player's own frame so "up" always means "straight on".
 */
export function compassRotation(bearing, facing) {
  if (bearing == null) return null
  const facingAngle = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2][facing]
  let rel = bearing - facingAngle
  while (rel > Math.PI) rel -= Math.PI * 2
  while (rel < -Math.PI) rel += Math.PI * 2
  return rel   // 0 = dead ahead, +ve = to the right
}
