import { WALL, DOOR } from '../game/maze.js'

// 110°. Wide enough that a door or corridor immediately to your side is visible
// from the square you're standing on, which an 84° view cannot show at all.
//
// A classic engine couldn't afford this. Wolfenstein 3D and Doom projected onto
// a flat camera plane, where the edges of a wide view stretch badly, so they sat
// near 60-90° and solved the problem elsewhere: Doom's levels were open polygons
// rather than one-cell grid corridors, and it shipped an automap. Grid-based
// dungeon crawlers (Dungeon Master, Eye of the Beholder, Legend of Grimrock) hit
// exactly our case and drew the side walls of the current cell as explicit
// angled panels instead.
//
// This renderer steps the ray angle linearly across the screen, which is a
// cylindrical projection — straight walls bow very slightly, but nothing
// stretches at the edges, so a wide view stays comfortable.
export const FOV = 95 * Math.PI / 180
export const MAX_STEPS = 64

/**
 * Digital Differential Analyser ray march.
 *
 * Coordinate convention: `px` is the column axis (x), `py` is the row axis (y),
 * so a cell is grid[mapY][mapX]. Angle 0 faces east (increasing column).
 *
 * Returns the perpendicular distance, which wall face was struck, the cell that
 * stopped the ray, and `wallX` — the 0..1 texture coordinate across that face.
 * `wallX` is what makes arches, torch placement and door detail possible.
 */
export function castRay(grid, px, py, angle) {
  const dirX = Math.cos(angle), dirY = Math.sin(angle)
  let mapX = Math.floor(px), mapY = Math.floor(py)

  const deltaX = Math.abs(1 / dirX), deltaY = Math.abs(1 / dirY)
  const stepX = dirX < 0 ? -1 : 1, stepY = dirY < 0 ? -1 : 1
  let sideX = dirX < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX
  let sideY = dirY < 0 ? (py - mapY) * deltaY : (mapY + 1 - py) * deltaY

  let side = 0, hitCell = WALL
  for (let i = 0; i < MAX_STEPS; i++) {
    if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0 }
    else               { sideY += deltaY; mapY += stepY; side = 1 }
    const cell = grid[mapY]?.[mapX]
    if (cell === undefined || cell === WALL || cell === DOOR) { hitCell = cell ?? WALL; break }
  }

  const dist = side === 0
    ? (mapX - px + (1 - stepX) / 2) / dirX
    : (mapY - py + (1 - stepY) / 2) / dirY
  const hitCoord = side === 0 ? py + dist * dirY : px + dist * dirX

  return {
    dist: Math.max(0.0001, Math.abs(dist)),
    side, hitCell, mapX, mapY,
    wallX: hitCoord - Math.floor(hitCoord),
  }
}

export { WALL, DOOR }
