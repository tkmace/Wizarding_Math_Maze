import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { renderFrame } from '../engine/renderer.js'
import { renderMinimap, compassRotation } from '../engine/minimap.js'
import { FACING_ANGLES, guideBearing, DOOR, cellKey } from '../game/maze.js'
import { C, sans, serif } from './theme.js'
import Controls from './Controls.jsx'

const MAX_PIXEL_W = 960     // ray count cap — one ray per pixel column

export default function GameView({
  maze, pos, skin, runPoints, total, stones, doorsLeft, effects,
  showCompass, paused, onAction, onExit,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const miniRef = useRef(null)
  const animRef = useRef({ px: pos.col + 0.5, py: pos.row + 0.5, angle: FACING_ANGLES[pos.facing] })
  const targetRef = useRef({ ...animRef.current })
  const [size, setSize] = useState({ w: 480, h: 270 })

  // Everything the render loop needs, refreshed every render so the loop never
  // closes over stale state.
  const sceneRef = useRef(null)
  sceneRef.current = { maze, pos, skin, effects, paused }

  // ── Responsive canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current
      const availW = Math.min(el?.clientWidth || 480, 900)
      // Portrait screens get a taller, squarer viewport; wide screens stay
      // cinematic. Either way it's capped so the D-pad is always reachable.
      const ratio = window.innerWidth < 620 ? 0.92 : 0.56
      const h = Math.min(availW * ratio, window.innerHeight * 0.54)
      setSize({ w: Math.floor(availW), h: Math.floor(Math.max(190, h)) })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  // ── Follow the discrete grid position smoothly ──────────────────────────────
  useEffect(() => {
    targetRef.current = { px: pos.col + 0.5, py: pos.row + 0.5, angle: FACING_ANGLES[pos.facing] }
  }, [pos.row, pos.col, pos.facing])

  // New maze: snap rather than slide in from wherever we were.
  useEffect(() => {
    animRef.current = { px: pos.col + 0.5, py: pos.row + 0.5, angle: FACING_ANGLES[pos.facing] }
    targetRef.current = { ...animRef.current }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maze?.id])   // `id` changes only for a genuinely new maze, so solving a
                   // door updates the grid without teleporting the camera

  // ── Render loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_W / Math.max(1, size.w), 2)
    const cv = canvasRef.current
    if (cv) { cv.width = Math.floor(size.w * dpr); cv.height = Math.floor(size.h * dpr) }
    const mm = miniRef.current
    if (mm) { const s = Math.min(2, window.devicePixelRatio || 1); mm.width = 152 * s; mm.height = 152 * s }

    let raf, last = performance.now()
    const loop = t => {
      const dt = Math.min(60, t - last); last = t
      const s = sceneRef.current
      const a = animRef.current, tg = targetRef.current
      const k = 1 - Math.exp(-13 * dt / 1000)

      a.px += (tg.px - a.px) * k
      a.py += (tg.py - a.py) * k
      let da = tg.angle - a.angle
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      a.angle += da * k
      const moving = Math.hypot(tg.px - a.px, tg.py - a.py) > 0.02 || Math.abs(da) > 0.03

      if (s.maze) {
        const ctx = canvasRef.current?.getContext('2d')
        if (ctx) renderFrame(ctx, {
          grid: s.maze.grid, dq: s.maze.dq, stones: s.maze.stones,
          px: a.px, py: a.py, angle: a.angle,
          playerRow: s.pos.row, playerCol: s.pos.col, facing: s.pos.facing,
          doorAhead: aheadDoor(s.maze.grid, s.pos),
          time: t, skin: s.skin, moving, effects: s.effects,
        })
        const mctx = miniRef.current?.getContext('2d')
        if (mctx) renderMinimap(mctx, {
          grid: s.maze.grid, dq: s.maze.dq, seen: s.maze.seen, stones: s.maze.stones,
          row: s.pos.row, col: s.pos.col, facing: s.pos.facing, time: t,
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [size.w, size.h])

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paused) return
    const map = { ArrowUp: 'forward', ArrowDown: 'backward', ArrowLeft: 'turnLeft', ArrowRight: 'turnRight',
                  w: 'forward', s: 'backward', a: 'turnLeft', d: 'turnRight' }
    const h = e => {
      const act = map[e.key]
      if (act) { e.preventDefault(); onAction(act) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onAction, paused])

  // ── Swipe / tap on the view ─────────────────────────────────────────────────
  const touch = useRef(null)
  const onTouchStart = useCallback(e => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }, [])
  const onTouchEnd = useCallback(e => {
    if (paused || !touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    const dist = Math.hypot(dx, dy)
    if (dist < 26) { onAction('forward'); return }          // a tap means "go"
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx > 0 ? 'turnRight' : 'turnLeft')
    else onAction(dy > 0 ? 'backward' : 'forward')
    touch.current = null
  }, [onAction, paused])

  // ── Compass ─────────────────────────────────────────────────────────────────
  const guide = useMemo(
    () => maze ? guideBearing(maze.grid, pos.row, pos.col) : null,
    [maze, pos.row, pos.col])
  const rel = guide ? compassRotation(guide.angle, pos.facing) : null

  const doorAhead = maze ? aheadDoor(maze.grid, pos) : null
  const aheadQ = doorAhead ? maze.dq?.[cellKey(doorAhead.row, doorAhead.col)] : null

  return (
    <div style={{ width: '100%', maxWidth: 900, zIndex: 10 }}>
      {/* HUD */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, padding: '0 2px' }}>
        <Chip label="RUN" value={runPoints} color={C.gold} />
        <Chip label="TOTAL" value={total} color={C.dim} />
        <Chip label="🚪" value={doorsLeft} color={C.teal} />
        <Chip label="🔮" value={stones} color={C.teal} />
      </div>

      {/* Viewport */}
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', borderRadius: 18, overflow: 'hidden', border: `2px solid ${C.line}`, background: '#04030f' }}>
        <canvas
          ref={canvasRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ display: 'block', width: '100%', height: size.h, touchAction: 'none' }}
        />

        {/* Back to the castle, as an overlay so the HUD row stays on one line */}
        <button className="bh" onClick={onExit} style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          padding: '7px 10px', borderRadius: 10, border: `1.5px solid ${C.lineHi}`,
          background: 'rgba(10,8,34,.85)', color: C.dim,
          fontSize: 11, fontWeight: 900, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>🏰</button>

        {/* Minimap */}
        <div style={{ position: 'absolute', top: 8, right: 8, borderRadius: 12, overflow: 'hidden', boxShadow: '0 3px 14px #000a' }}>
          <canvas ref={miniRef} style={{ display: 'block', width: 108, height: 108 }} />
        </div>

        {/* Compass — always know which way the next door is */}
        {showCompass !== false && rel != null && (
          <div style={{
            position: 'absolute', top: 124, right: 8, width: 108,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'rgba(8,6,28,.78)', border: `1.5px solid ${guide.target === 'exit' ? C.good : C.gold}66`,
            borderRadius: 10, padding: '5px 0',
          }}>
            <span style={{
              display: 'inline-block', fontSize: 17, lineHeight: 1,
              color: guide.target === 'exit' ? C.good : C.gold,
              transform: `rotate(${rel}rad)`, transition: 'transform .18s ease-out',
            }}>▲</span>
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1, color: C.dim }}>
              {guide.target === 'exit' ? 'EXIT' : 'DOOR'}
            </span>
          </div>
        )}

        {/* Door prompt */}
        {aheadQ && (
          <div className="pulseRing" style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,6,28,.9)', border: `2px solid ${aheadQ.color}`,
            borderRadius: 12, padding: '8px 14px', textAlign: 'center', whiteSpace: 'nowrap',
          }}>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 17, color: '#fff' }}>{aheadQ.disp} = ?</div>
            <div style={{ fontFamily: serif, fontSize: 9, letterSpacing: 1.5, color: aheadQ.color, marginTop: 2 }}>
              PRESS ▲ TO UNLOCK · +{aheadQ.curPts}
            </div>
          </div>
        )}
      </div>

      <Controls onAction={onAction} disabled={paused} />
    </div>
  )
}

function Chip({ label, value, color }) {
  return (
    <div style={{
      background: C.panel, border: `1.5px solid ${C.line}`, borderRadius: 10,
      padding: '4px 8px', display: 'flex', alignItems: 'baseline', gap: 5, flex: 1,
      minWidth: 0, justifyContent: 'center',
    }}>
      <span style={{ fontFamily: serif, fontSize: 8, letterSpacing: 1, color: C.faint }}>{label}</span>
      <span style={{ fontWeight: 900, fontSize: 14, color }}>{value}</span>
    </div>
  )
}

/** The door cell directly in front of the player, if any. */
function aheadDoor(grid, pos) {
  const d = [[0, 1], [1, 0], [0, -1], [-1, 0]][pos.facing]
  const r = pos.row + d[0], c = pos.col + d[1]
  return grid[r]?.[c] === DOOR ? { row: r, col: c } : null
}
