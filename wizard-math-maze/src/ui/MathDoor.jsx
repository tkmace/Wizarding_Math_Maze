import { useState, useEffect, useRef, useMemo } from 'react'
import { buildHint, diffByKey, opByKey } from '../game/math.js'
import { C, sans, serif, btn } from './theme.js'
import Keypad from './Keypad.jsx'
import Hint from './Hint.jsx'

/**
 * The door puzzle. Three things matter here beyond "is the answer right":
 *  - a quick-recall window that *adds* points but never subtracts, so fluency is
 *    rewarded and slowness is not punished;
 *  - a visual hint rather than the answer, free after two misses;
 *  - no dead end — she can always step back and try another corridor.
 */
export default function MathDoor({ q, diff, stones, bigKeypad, onCorrect, onWrong, onSpendStone, onStepBack }) {
  const [ans, setAns] = useState('')
  const [shake, setShake] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(performance.now())
  const inputRef = useRef(null)
  const fastMs = diffByKey(diff).fastMs
  const hint = useMemo(() => buildHint(q), [q])
  const op = opByKey(q.op)

  // Reset for each new door.
  useEffect(() => {
    setAns(''); setShowHint(false); setElapsed(0)
    startRef.current = performance.now()
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

  // Physical keyboard, for whoever is on a laptop.
  useEffect(() => {
    const h = e => {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); setAns(a => (a + e.key).slice(0, 6)) }
      else if (e.key === 'Backspace') { e.preventDefault(); setAns(a => a.slice(0, -1)) }
      else if (e.key === 'Enter') { e.preventDefault(); submit() }
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
      alignItems: 'center', justifyContent: 'center', padding: 12,
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
          <span style={{ fontFamily: serif, fontSize: 10, letterSpacing: 2, color: q.color, fontWeight: 900 }}>
            {q.review ? '◆ RUNE OF RETURN' : '◆ SEALED DOOR'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 900, color: C.gold }}>+{q.curPts} pts</span>
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

        {/* Answer box */}
        <div ref={inputRef} style={{
          margin: '12px 0 0', minHeight: 62, borderRadius: 16,
          background: '#0a0a2c', border: `2px solid ${ans ? q.color : C.lineHi}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, fontWeight: 900, fontFamily: sans, letterSpacing: 4,
          color: ans ? '#fff' : C.faint, transition: 'border-color .15s',
        }}>{ans || '?'}</div>

        {fastLeft > 0 && q.wrongs === 0 && (
          <div style={{ textAlign: 'center', color: C.gold, fontSize: 10, fontWeight: 900, marginTop: 6, letterSpacing: 1 }}>
            ⚡ QUICK BONUS ACTIVE
          </div>
        )}
        {q.wrongs > 0 && (
          <div style={{ textAlign: 'center', color: C.bad, fontSize: 11, fontWeight: 800, marginTop: 6 }}>
            Not quite — have another go. {q.wrongs === 1 ? 'One more miss and I’ll show you how.' : ''}
          </div>
        )}

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
    </div>
  )
}
