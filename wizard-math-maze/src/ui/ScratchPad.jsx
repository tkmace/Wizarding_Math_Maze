import { useEffect, useRef, useState, useCallback } from 'react'
import { C, sans, serif } from './theme.js'

/**
 * Scratch paper.
 *
 * A door in this game asks for a single number, and the answer box is the only
 * place to put anything — which is fine for 6 + 7 and useless for 24 × 13, where
 * the working is the whole point. On a tablet there's room beside the keypad for
 * the paper a child would reach for at a desk, so here it is: draw on it with a
 * finger, undo a stroke, wipe it clean.
 *
 * Strokes are kept as point lists rather than as pixels so undo is exact and
 * costs nothing, and so a resize can redraw rather than wipe. Nothing here is
 * saved or scored — it is deliberately just paper.
 */
export default function ScratchPad({ height = 420, tint = C.teal }) {
  const canvasRef = useRef(null)
  const strokes = useRef([])          // [[{x,y}, …], …] in CSS pixels
  const live = useRef(null)
  const [count, setCount] = useState(0)

  const redraw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const w = cv.width / dpr, h = cv.height / dpr

    // Paper: a dark slate with faint squares, so there's something to write on
    // rather than a void.
    ctx.fillStyle = '#0b0b26'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(120,120,200,.13)'
    ctx.lineWidth = 1
    const step = 28
    ctx.beginPath()
    for (let x = step; x < w; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h) }
    for (let y = step; y < h; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5) }
    ctx.stroke()

    ctx.strokeStyle = tint
    ctx.lineWidth = 3.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = tint
    ctx.shadowBlur = 6
    for (const st of [...strokes.current, live.current].filter(Boolean)) {
      if (st.length < 2) {
        if (st.length === 1) {
          ctx.beginPath()
          ctx.arc(st[0].x, st[0].y, 1.8, 0, Math.PI * 2)
          ctx.fillStyle = tint
          ctx.fill()
        }
        continue
      }
      ctx.beginPath()
      ctx.moveTo(st[0].x, st[0].y)
      for (let i = 1; i < st.length; i++) ctx.lineTo(st[i].x, st[i].y)
      ctx.stroke()
    }
    ctx.shadowBlur = 0
  }, [tint])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(cv.clientWidth * dpr)
      cv.height = Math.round(cv.clientHeight * dpr)
      redraw()
    }
    size()
    window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [redraw])

  const at = e => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const down = e => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    live.current = [at(e)]
    redraw()
  }
  const move = e => {
    if (!live.current) return
    e.preventDefault()
    live.current.push(at(e))
    redraw()
  }
  const up = e => {
    if (!live.current) return
    e.preventDefault()
    strokes.current.push(live.current)
    live.current = null
    setCount(strokes.current.length)
    redraw()
  }

  const undo = () => { strokes.current.pop(); setCount(strokes.current.length); redraw() }
  const clear = () => { strokes.current = []; live.current = null; setCount(0); redraw() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
      }}>
        <span style={{ fontFamily: serif, fontSize: 14, letterSpacing: 2.5, color: tint, fontWeight: 900 }}>
          ✎ SCRATCH PAPER
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <PadBtn onClick={undo} disabled={!count}>↶ Undo</PadBtn>
          <PadBtn onClick={clear} disabled={!count}>Wipe</PadBtn>
        </span>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        onContextMenu={e => e.preventDefault()}
        style={{
          display: 'block', width: '100%', height, borderRadius: 16,
          border: `2px solid ${C.lineHi}`, cursor: 'crosshair',
          touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none',
          WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent',
        }}
      />
      <div style={{ color: C.faint, fontSize: 10.5, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
        Work it out here with your finger. Nothing you draw is marked.
      </div>
    </div>
  )
}

function PadBtn({ onClick, disabled, children }) {
  return (
    <button className="bh" onClick={onClick} disabled={disabled} style={{
      padding: '5px 10px', borderRadius: 9, minHeight: 30,
      border: `1.5px solid ${C.lineHi}`, background: C.panelHi,
      color: disabled ? C.faint : C.ink, fontFamily: sans,
      fontSize: 11, fontWeight: 900, opacity: disabled ? 0.45 : 1,
      cursor: disabled ? 'default' : 'pointer',
      WebkitTapHighlightColor: 'transparent',
    }}>{children}</button>
  )
}
