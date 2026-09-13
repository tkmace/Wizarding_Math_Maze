import { useState, useEffect, useRef, useMemo } from 'react'
import { buildHint, opByKey } from '../game/math.js'
import { C, sans, serif, btn } from './theme.js'
import Keypad from './Keypad.jsx'
import ScratchPad from './ScratchPad.jsx'
import Hint from './Hint.jsx'

/**
 * The door puzzle. Three things matter here beyond "is the answer right":
 *  - a quick-recall window that *adds* points but never subtracts, so fluency is
 *    rewarded and slowness is not punished;
 *  - a visual hint rather than the answer, free after two misses;
 *  - no dead end — she can always step back and try another corridor.
 */
export default function MathDoor({ q, stones, swiftMs = 0, bigKeypad, onCorrect, onWrong, onSpendStone, onStepBack }) {
  // Two panels side by side need roughly 840px. That's an iPad in either
  // orientation and any laptop; a phone keeps the single panel it had.
  const [roomy, setRoomy] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 840)
  useEffect(() => {
    const on = () => setRoomy(window.innerWidth >= 840)
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])

  const [ans, setAns] = useState('')
  const [shake, setShake] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(performance.now())
  const openedAt = useRef(performance.now())
  const inputRef = useRef(null)
  // The window travels on the question (Wizard's Sense gives each operation its
  // own), widened by the worn form's Swift perk.
  const fastMs = (q.fastMs || 6000) + swiftMs
  const hint = useMemo(() => buildHint(q), [q])
  const op = opByKey(q.op)

  // Reset for each new door.
  useEffect(() => {
    setAns(''); setShowHint(false); setElapsed(0)
    startRef.current = performance.now()
    openedAt.current = performance.now()
    // Whatever was focused before this opened — the movement pad, the castle
    // button, a keypad key from the last door — must not still be listening.
    // Otherwise a later Space or Enter re-fires it behind this panel.
    try { document.activeElement?.blur?.() } catch { /* nothing focused */ }
  }, [q.key, q.disp])

  // Drive the quick-recall bar. Stops ticking once the window has closed.
  useEffect(() => {
    let raf
    const tick = () => {
      const e = performance.now() - startRef.current
      setElapsed(e)
      if (e < fastMs) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [q.key, q.disp, fastMs])

  const canSubmit = ans.length > 0

  const submit = () => {
    if (!canSubmit) return
    const n = parseInt(ans, 10)
    const ms = performance.now() - startRef.current
    if (!isNaN(n) && n === q.ans) {
      onCorrect(ms, showHint)
    } else {
      setAns('')
      setShake(true)
      setTimeout(() => setShake(false), 430)
      const wrongs = q.wrongs + 1
      if (wrongs >= 2) setShowHint(true)      // two misses: help arrives, free
      onWrong()
    }
  }

  /**
   * Physical keyboard, for whoever is on a laptop.
   *
   * Three guards, all of which existed as real bugs: a key still going down
   * from walking into the door leaked into the answer as a stray leading digit;
   * a held-down key auto-repeated into a row of the same digit; and Space,
   * which activates whatever button still has focus, quietly re-pressed the
   * last keypad key that was clicked. Anything modified (⌘, Ctrl, Alt) is a
   * browser shortcut, not an answer.
   */
  useEffect(() => {
    const h = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.repeat) { e.preventDefault(); return }
      if (performance.now() - openedAt.current < 140) { e.preventDefault(); return }
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); setAns(a => (a + e.key).slice(0, 6)) }
      else if (e.key === 'Backspace') { e.preventDefault(); setAns(a => a.slice(0, -1)) }
      else if (e.key === 'Escape') { e.preventDefault(); setAns('') }
      else if (e.key === 'Enter') { e.preventDefault(); submit() }
      else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const useStone = () => {
    if (showHint) return
    if (q.wrongs >= 2) { setShowHint(true); return }
    if (stones > 0) { onSpendStone(); setShowHint(true) }
  }

  const fastLeft = Math.max(0, 1 - elapsed / fastMs)
  const hintFree = q.wrongs >= 2

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 12, gap: 12,
      background: 'rgba(4,3,18,.82)', backdropFilter: 'blur(5px)',
    }}>
      <div className={`appear scroll ${shake ? 'shake' : ''}`} style={{
        width: '100%', maxWidth: 400, maxHeight: '96vh',
        background: C.panel,
        border: `3px solid ${q.color}`,
        borderRadius: 24,
        boxShadow: `0 0 44px ${q.color}55, inset 0 0 70px #00000066`,
        padding: '16px 16px 18px',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: serif, fontSize: 14, letterSpacing: 2.5, color: q.color, fontWeight: 900 }}>
            {q.review ? '◆ RUNE OF RETURN' : '◆ SEALED DOOR'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>+{q.curPts} pts</span>
        </div>

        {/* Quick-recall bar — a bonus that drains away, never a penalty */}
        <div style={{ height: 6, borderRadius: 6, background: '#0a0a2c', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            height: '100%', width: `${fastLeft * 100}%`,
            background: `linear-gradient(90deg,${C.gold},${C.goldHi})`,
            transition: 'width .1s linear',
          }} />
        </div>

        {/* The problem */}
        <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
          <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 4 }}>{op.icon}</div>
          <div style={{
            fontFamily: sans, fontWeight: 900,
            fontSize: 'clamp(34px,11vw,52px)', color: '#fff',
            textShadow: `0 0 26px ${q.color}88`, letterSpacing: 1,
          }}>{q.disp}</div>
        </div>

        {/* Answer box. Tapping it clears the whole answer — quicker for a child
            than hunting for ⌫ when a digit has gone astray. */}
        <div
          ref={inputRef}
          onClick={() => setAns('')}
          title="Tap to clear"
          style={{
            margin: '12px 0 0', minHeight: 62, borderRadius: 16,
            background: '#0a0a2c', border: `2px solid ${ans ? q.color : C.lineHi}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 900, fontFamily: sans, letterSpacing: 4,
            color: ans ? '#fff' : C.faint, transition: 'border-color .15s',
            cursor: ans ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent', userSelect: 'none',
          }}
        >{ans || '?'}</div>

        {/* One fixed-height slot for whatever status line applies.
            These used to appear and disappear — and the quick-bonus line
            vanishing partway through a question shunted the whole keypad up
            under the player's finger, which is a fine way to press the wrong
            digit. The slot never changes height now. */}
        <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {q.wrongs > 0 ? (
            <span style={{ color: C.bad, fontSize: 11, fontWeight: 800, lineHeight: 1.3 }}>
              Not quite — have another go.{q.wrongs === 1 ? ' One more miss and I’ll show you how.' : ''}
            </span>
          ) : fastLeft > 0 ? (
            <span style={{ color: C.gold, fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>
              ⚡ QUICK BONUS ACTIVE
            </span>
          ) : null}
        </div>

        {bigKeypad !== false && (
          <Keypad
            onDigit={d => setAns(a => (a + d).slice(0, 6))}
            onBack={() => setAns(a => a.slice(0, -1))}
            onSubmit={submit}
            canSubmit={canSubmit}
          />
        )}

        {showHint && <Hint hint={hint} />}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {!showHint && (
            <button className="bh" onClick={useStone} disabled={!hintFree && stones <= 0}
              style={btn('ghost', {
                flex: 1, fontSize: 13, minHeight: 46,
                opacity: (!hintFree && stones <= 0) ? 0.42 : 1,
                cursor: (!hintFree && stones <= 0) ? 'default' : 'pointer',
              })}>
              🔮 {hintFree ? 'Show me' : `Hint (${stones})`}
            </button>
          )}
          <button className="bh" onClick={onStepBack} style={btn('ghost', { flex: 1, fontSize: 13, minHeight: 46 })}>
            ↩ Step back
          </button>
        </div>
      </div>

      {/* Scratch paper, on anything with room beside the keypad. A phone has
          no such room and doesn't get it — squeezing a writing surface into
          150px would be worse than not offering one. */}
      {roomy && (
        <div className="appear" style={{
          width: '100%', maxWidth: 400, maxHeight: '96vh',
          background: C.panel, border: `3px solid ${C.line}`, borderRadius: 24,
          boxShadow: 'inset 0 0 70px #00000066',
          padding: '16px 16px 18px',
        }}>
          <ScratchPad height={Math.min(430, Math.round(window.innerHeight * 0.52))} tint={q.color} />
        </div>
      )}
    </div>
  )
}
