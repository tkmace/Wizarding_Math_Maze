import { useRef, useCallback } from 'react'
import { C, serif } from './theme.js'

/**
 * Thumb-sized movement pad. Holding a key repeats it, which matters a lot in a
 * long corridor — otherwise walking six squares is six deliberate taps.
 */
export default function Controls({ onAction, disabled }) {
  const timer = useRef(null)

  const stop = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); clearInterval(timer.current); timer.current = null }
  }, [])

  const start = useCallback((action) => {
    if (disabled) return
    onAction(action)
    stop()
    timer.current = setTimeout(() => {
      timer.current = setInterval(() => onAction(action), 180)
    }, 260)
  }, [onAction, disabled, stop])

  const pad = (glyph, action, hint) => (
    <button
      aria-label={hint}
      onPointerDown={e => { e.preventDefault(); start(action) }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      style={{
        width: '100%', height: 62, borderRadius: 16,
        border: `2px solid ${C.lineHi}`,
        background: 'linear-gradient(180deg,#1b1b52,#12123a)',
        color: disabled ? C.faint : C.goldHi,
        fontSize: 26, fontWeight: 900, fontFamily: serif,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: '0 3px 0 #0a0a24',
        WebkitTapHighlightColor: 'transparent', touchAction: 'none', userSelect: 'none',
      }}
    >{glyph}</button>
  )

  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '10px auto 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {pad('↺', 'turnLeft', 'Turn left')}
        {pad('▲', 'forward', 'Walk forward')}
        {pad('↻', 'turnRight', 'Turn right')}
        <div />
        {pad('▼', 'backward', 'Step back')}
        <div />
      </div>
      <div style={{ textAlign: 'center', color: C.faint, fontSize: 10, marginTop: 8, letterSpacing: 1 }}>
        swipe the view, or use arrow keys
      </div>
    </div>
  )
}
