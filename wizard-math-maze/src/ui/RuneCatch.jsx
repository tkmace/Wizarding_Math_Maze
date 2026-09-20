import { useEffect, useRef, useState, useCallback } from 'react'
import { encounterQuestion, answerChoices } from '../game/encounters.js'
import { C, sans, serif } from './theme.js'

const ROUNDS = 4
const CHANCES = 3

/**
 * Rune Catch — drifting stones carrying candidate answers; tap the right one.
 *
 * Multiple choice on purpose: it makes the maths easier than a door (you can
 * check four candidates instead of producing an answer cold) and it turns the
 * round into something you do with a fingertip, which is what makes it feel like
 * a different game rather than another keypad.
 */
export default function RuneCatch({ creature, ops, diff, profile, onDone }) {
  const canvasRef = useRef(null)
  const [round, setRound] = useState(0)
  const [q, setQ] = useState(() => encounterQuestion(ops, diff, profile))
  const [phase, setPhase] = useState('play')      // play | won | lost
  const askedAt = useRef(performance.now())

  const s = useRef({
    runes: [], particles: [], chances: CHANCES,
    earned: 0, answers: [], over: false, shake: 0,
  }).current

  const spawn = useCallback(question => {
    const cv = canvasRef.current
    const W = cv ? cv.width : 600, H = cv ? cv.height : 300
    const vals = answerChoices(question)
    s.runes = vals.map((value, i) => ({
      value,
      x: W * (0.2 + 0.2 * i),
      y: H * (0.32 + 0.22 * (i % 2)),
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.012 + Math.random() * 0.016) * W,
      vy: (Math.random() < 0.5 ? -1 : 1) * (0.010 + Math.random() * 0.014) * H,
      r: Math.min(W, H) * 0.115,
      spin: Math.random() * 6,
      pop: 0,
      correct: value === question.ans,
    }))
  }, [s])

  const finish = useCallback(outcome => {
    if (s.over) return
    s.over = true
    // Clear the stones. The question above the canvas is hidden as soon as the
    // phase changes, but the canvas kept drawing whatever was last in
    // `s.runes` — so the round finished showing four answers to nothing, which
    // is the same complaint the duel had.
    s.runes = []
    setPhase(outcome)
    setTimeout(() => onDone({ outcome, earned: s.earned, answers: s.answers }), 1200)
  }, [s, onDone])

  const advance = useCallback(() => {
    const next = round + 1
    if (next >= ROUNDS) { finish('won'); return }
    const nq = encounterQuestion(ops, diff, profile)
    setRound(next)
    setQ(nq)
    askedAt.current = performance.now()
    spawn(nq)
  }, [round, ops, diff, profile, finish, spawn])

  const tap = useCallback(e => {
    if (s.over) return
    const cv = canvasRef.current
    if (!cv) return
    const rect = cv.getBoundingClientRect()
    const pt = e.touches?.[0] || e.changedTouches?.[0] || e
    const x = (pt.clientX - rect.left) * (cv.width / rect.width)
    const y = (pt.clientY - rect.top) * (cv.height / rect.height)

    const hit = s.runes.find(r => r.pop === 0 && Math.hypot(r.x - x, r.y - y) <= r.r * 1.15)
    if (!hit) return

    const ms = performance.now() - askedAt.current
    s.answers.push({ q, correct: hit.correct, ms })

    if (hit.correct) {
      hit.pop = 0.001
      s.earned += q.curPts
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2
        s.particles.push({ x: hit.x, y: hit.y, vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, life: 1 })
      }
      setTimeout(advance, 420)
    } else {
      hit.pop = -1                          // marks it wrong: greys out
      s.chances -= 1
      s.shake = 1
      if (s.chances <= 0) finish('lost')
    }
  }, [s, q, advance, finish])

  // --- Animation loop ---
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
      if (!s.runes.length) spawn(q)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf, last = performance.now()
    const loop = t => {
      const dt = Math.min(60, t - last); last = t
      const W = cv.width, H = cv.height
      const ctx = cv.getContext('2d')

      ctx.clearRect(0, 0, W, H)
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#0f0a26'); g.addColorStop(1, '#05040f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      s.shake = Math.max(0, s.shake - dt / 400)
      const shx = s.shake * Math.sin(t / 30) * W * 0.01
      ctx.save()
      ctx.translate(shx, 0)

      for (const r of s.runes) {
        if (r.pop > 0) { r.pop = Math.min(1, r.pop + dt / 380); continue }
        r.x += r.vx * dt / 1000
        r.y += r.vy * dt / 1000
        r.spin += dt / 2400
        if (r.x < r.r) { r.x = r.r; r.vx *= -1 }
        if (r.x > W - r.r) { r.x = W - r.r; r.vx *= -1 }
        if (r.y < r.r + H * 0.06) { r.y = r.r + H * 0.06; r.vy *= -1 }
        if (r.y > H - r.r) { r.y = H - r.r; r.vy *= -1 }

        const wrong = r.pop === -1
        ctx.save()
        ctx.translate(r.x, r.y)
        ctx.rotate(Math.sin(r.spin) * 0.16)
        ctx.globalAlpha = wrong ? 0.28 : 1

        const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, r.r * 1.5)
        gl.addColorStop(0, `${creature.accent}66`)
        gl.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gl
        ctx.beginPath(); ctx.arc(0, 0, r.r * 1.5, 0, Math.PI * 2); ctx.fill()

        // Faceted stone
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          const px = Math.cos(a) * r.r, py = Math.sin(a) * r.r
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
        }
        ctx.closePath()
        const sg = ctx.createLinearGradient(-r.r, -r.r, r.r, r.r)
        sg.addColorStop(0, '#e6fffb'); sg.addColorStop(0.5, '#5ad9ff'); sg.addColorStop(1, '#1f6fb8')
        ctx.fillStyle = wrong ? '#3a3a55' : sg
        ctx.fill()
        ctx.strokeStyle = wrong ? '#555' : '#dffaff'
        ctx.lineWidth = Math.max(1, r.r * 0.06)
        ctx.stroke()

        ctx.rotate(-Math.sin(r.spin) * 0.16)
        ctx.fillStyle = wrong ? '#888' : '#07203a'
        ctx.font = `900 ${r.r * 0.78}px Nunito, sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(String(r.value), 0, 0)
        ctx.restore()
      }
      ctx.globalAlpha = 1

      for (const p of s.particles) {
        p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.life -= dt / 700
        if (p.life <= 0) continue
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = '#ffeec2'
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      }
      s.particles = s.particles.filter(p => p.life > 0)
      ctx.globalAlpha = 1
      ctx.restore()

      // Chances, drawn as diamonds rather than a glyph so they can't silently
      // fail to render in a font that lacks the character.
      const pr = Math.max(4, H * 0.028)
      for (let i = 0; i < CHANCES; i++) {
        const cx = W * 0.05 + i * pr * 3, cy = H * 0.085
        ctx.beginPath()
        ctx.moveTo(cx, cy - pr); ctx.lineTo(cx + pr * 0.72, cy)
        ctx.lineTo(cx, cy + pr); ctx.lineTo(cx - pr * 0.72, cy)
        ctx.closePath()
        ctx.fillStyle = i < s.chances ? '#ffeec2' : '#2a2a44'
        ctx.fill()
        if (i < s.chances) {
          ctx.strokeStyle = '#f9ca74'
          ctx.lineWidth = Math.max(1, pr * 0.16)
          ctx.stroke()
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 12,
      background: 'rgba(4,3,18,.9)', backdropFilter: 'blur(6px)',
    }}>
      <div className="appear scroll" style={{
        width: '100%', maxWidth: 410, maxHeight: '96vh', overflowY: 'auto',
        background: C.panel,
        border: `3px solid ${phase === 'won' ? C.good : phase === 'lost' ? C.bad : C.teal}`,
        borderRadius: 24, padding: '14px 14px 16px',
        boxShadow: `0 0 44px ${C.teal}33`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontFamily: serif, fontSize: 14, letterSpacing: 2.5, color: C.teal, fontWeight: 900 }}>
            ◆ RUNE CATCH
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>
            {phase === 'play' ? `Rune ${round + 1} of ${ROUNDS}` : creature.name}
          </span>
        </div>

        {phase === 'play' && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{
              fontFamily: sans, fontWeight: 900,
              fontSize: 'clamp(26px,8vw,38px)', color: '#fff',
              textShadow: `0 0 20px ${q.color}88`,
            }}>{q.disp}</div>
            <div style={{ color: C.dim, fontSize: 12.5, marginTop: 3, letterSpacing: 1 }}>
              TAP THE RUNE WITH THE ANSWER
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onClick={tap}
          onTouchEnd={tap}
          style={{
            display: 'block', width: '100%', height: 250,
            borderRadius: 14, border: `1.5px solid ${C.line}`,
            touchAction: 'manipulation', cursor: 'pointer',
          }}
        />

        {phase === 'play' && (
          <div style={{ textAlign: 'center', color: C.faint, fontSize: 10, marginTop: 9, lineHeight: 1.5 }}>
            Three wrong taps and the runes scatter — you keep every point you already have.
          </div>
        )}
        {phase === 'won' && (
          <div style={{ textAlign: 'center', padding: '12px 4px 2px' }}>
            <div style={{ fontSize: 38 }}>🔮</div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 900, color: C.good }}>All runes caught!</div>
            <div style={{ color: C.gold, fontWeight: 900, fontSize: 24, fontFamily: sans, marginTop: 5 }}>
              +{s.earned} <span style={{ fontSize: 11, color: C.faint }}>+ bravery bonus</span>
            </div>
          </div>
        )}
        {phase === 'lost' && (
          <div style={{ textAlign: 'center', padding: '12px 4px 2px' }}>
            <div style={{ fontSize: 34 }}>💨</div>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 900, color: C.dim }}>The runes scatter…</div>
            <div style={{ color: C.faint, fontSize: 12, marginTop: 5 }}>No points lost. Back to the maze.</div>
          </div>
        )}
      </div>
    </div>
  )
}
