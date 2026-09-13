import { useRef, useCallback, useEffect } from 'react'
import { C, serif } from './theme.js'

/**
 * Thumb-sized movement pad. Holding a key repeats it, which matters a lot in a
 * long corridor — otherwise walking six squares is six deliberate taps.
 *
 * The repeat is the dangerous part. A pointer-up on the button is NOT a
 * guarantee: stepping onto the exit while still holding ▲ tears this component
 * down mid-press, the release lands on the win screen instead, and a bare
 * setInterval would go on firing moves into whatever screen came next — which
 * is exactly how a fresh maze ends up walking itself. So the repeat is stopped
 * from three directions: the button's own pointer events, a window-level
 * listener that catches a release anywhere at all, and an unmount cleanup that
 * catches the case where there is no release to catch.
 */
/**
 * A turn arrow: up the shaft, then a right angle off to one side.
 *
 * It used to be ↺ and ↻, which are rotation symbols — they say "spin on the
 * spot", and a child reading them expects the whole view to whirl. A shaft with
 * a right angle in it says what actually happens: you carry on, but from here
 * you are facing that way.
 */
function Turn({ dir, color }) {
  const flip = dir === 'right' ? -1 : 1
  return (
    <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true"
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      <g transform={`scale(${flip},1) translate(${flip < 0 ? -40 : 0},0)`}
        fill="none" stroke={color} strokeWidth="4.2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 34 L28 16 L14 16" />
        <path d="M20 9 L11 16 L20 23" />
      </g>
    </svg>
  )
}

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

  // A release anywhere on the page ends the hold, not just a release on the pad.
  useEffect(() => {
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('blur', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('blur', stop)
      stop()                    // unmounted mid-hold: there is no release coming
    }
  }, [stop])

  // A door opening, an encounter, the end of the maze — anything that disables
  // the pad also ends any hold in progress.
  useEffect(() => { if (disabled) stop() }, [disabled, stop])

  const pad = (glyph, action, hint) => (
    <button
      aria-label={hint}
      onPointerDown={e => { e.preventDefault(); start(action) }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={e => e.preventDefault()}
      style={{
        width: '100%', height: 62, borderRadius: 16,
        border: `2px solid ${C.lineHi}`,
        background: 'linear-gradient(180deg,#1b1b52,#12123a)',
        color: disabled ? C.faint : C.goldHi,
        fontSize: 26, fontWeight: 900, fontFamily: serif,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: '0 3px 0 #0a0a24',
        WebkitTapHighlightColor: 'transparent', touchAction: 'none',
        // iPadOS pops a selection callout over a long-pressed button, which is
        // exactly what walking down a corridor looks like to it.
        userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
      }}
    >{glyph}</button>
  )

  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '10px auto 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {pad(<Turn dir="left" color={disabled ? C.faint : C.goldHi} />, 'turnLeft', 'Turn left')}
        {pad('▲', 'forward', 'Walk forward')}
        {pad(<Turn dir="right" color={disabled ? C.faint : C.goldHi} />, 'turnRight', 'Turn right')}
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
