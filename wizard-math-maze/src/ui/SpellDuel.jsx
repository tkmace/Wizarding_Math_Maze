import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { drawCreature, drawBolt } from '../engine/creatureSprite.js'
import { drawWizard } from '../engine/wizardSprite.js'
import { encounterQuestion, duelPlan, answerChoices } from '../game/encounters.js'
import { C, sans, serif, btn } from './theme.js'

/**
 * A spell duel.
 *
 * The creature charges a spell on a timer you can see growing around it. Every
 * correct answer fires a bolt and knocks that charge back; every wrong answer
 * feeds it. Let it complete three casts and it wins — but winning costs you only
 * the reward, never points you already have.
 *
 * Answers are multiple choice rather than typed. An encounter should feel like a
 * different game from a door, and four big targets under a thumb keep the pace
 * up — typing digits against a ticking spell turns a fast round into a fumble.
 *
 * Everything animated is drawn on the canvas and driven from a ref, so the React
 * tree only re-renders when the QUESTION changes. A 60fps charge bar in React
 * state would re-render the answer buttons sixty times a second.
 */
export default function SpellDuel({ creature, ops, diff, profile, form, appearance, onDone }) {
  const plan = useRef(duelPlan(diff, profile, ops)).current
  const canvasRef = useRef(null)
  const [q, setQ] = useState(() => encounterQuestion(ops, diff, profile))
  const [phase, setPhase] = useState('fight')     // fight | won | lost
  const [shake, setShake] = useState(false)
  const [dud, setDud] = useState(null)            // an option already ruled out
  // The answer just tapped correctly. The bolt takes a moment to cross the
  // screen and the creature might die when it lands, so the next question can't
  // be dealt until we know — otherwise a fresh question flashes up for a
  // quarter of a second after the final blow and is snatched away unanswered,
  // which is exactly what Tom saw as "answers with no question".
  const [good, setGood] = useState(null)
  const askedAt = useRef(performance.now())
  const choices = useMemo(() => answerChoices(q), [q])

  // All the fast-moving state lives here, out of React's way.
  const d = useRef({
    hp: plan.hp, wards: plan.wards, charge: 0,
    bolt: null, hit: 0, dying: 0, over: false,
    earned: 0, answers: [], flash: 0,
  }).current

  const finish = useCallback(outcome => {
    if (d.over) return
    d.over = true
    setPhase(outcome)
    // Let the death or cast animation land before handing back.
    setTimeout(() => onDone({
      outcome,
      earned: d.earned,
      answers: d.answers,
    }), outcome === 'won' ? 1400 : 1100)
  }, [d, onDone])

  const nextQuestion = useCallback(() => {
    setQ(encounterQuestion(ops, diff, profile))
    setDud(null)
    setGood(null)
    askedAt.current = performance.now()
  }, [ops, diff, profile])

  const pick = useCallback(value => {
    if (d.over || good != null || value === dud) return
    const ms = performance.now() - askedAt.current
    const correct = value === q.ans
    d.answers.push({ q, correct, ms })

    if (correct) {
      d.earned += q.curPts
      d.bolt = { p: 0 }
      d.charge = Math.max(0, d.charge - plan.hitRelief)
      setGood(value)              // hold this question up, ticked, until the bolt lands
    } else {
      d.charge = Math.min(1, d.charge + plan.missCost)
      setDud(value)                 // grey it out rather than just rejecting the tap
      setShake(true)
      setTimeout(() => setShake(false), 420)
    }
  }, [q, d, dud, good, plan])

  // Keys 1-4 pick the options, for whoever is on a laptop.
  useEffect(() => {
    const h = e => {
      const i = ['1', '2', '3', '4'].indexOf(e.key)
      if (i >= 0 && choices[i] != null) { e.preventDefault(); pick(choices[i]) }
      if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  // --- Animation + timing loop ---
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)

    let raf, last = performance.now()
    const loop = t => {
      const dt = Math.min(60, t - last); last = t
      const W = cv.width, H = cv.height
      const ctx = cv.getContext('2d')

      // ── advance ──
      if (!d.over) {
        // chargeMs is Infinity for a beginner, so this adds nothing and the bar
        // only ever moves on a wrong answer.
        d.charge += dt / plan.chargeMs
        if (d.charge >= 1) {
          d.charge = 0
          d.wards -= 1
          d.flash = 1
          if (d.wards <= 0) finish('lost')
        }
      }
      if (d.bolt) {
        d.bolt.p += dt / 260
        if (d.bolt.p >= 1) {
          d.bolt = null
          d.hit = 1
          d.hp -= 1
          if (d.hp <= 0) finish('won')
          else nextQuestion()      // only now, once we know there IS a next one
        }
      }
      d.hit = Math.max(0, d.hit - dt / 320)
      d.flash = Math.max(0, d.flash - dt / 400)
      if (phase === 'won' || d.hp <= 0) d.dying = Math.min(1, d.dying + dt / 900)

      // ── draw ──
      ctx.clearRect(0, 0, W, H)
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#120a2c'); g.addColorStop(1, '#05040f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < 22; i++) {
        const sx = ((i * 2654435761) % 1000) / 1000 * W
        const sy = ((i * 40503) % 1000) / 1000 * H * 0.7
        ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(t / 800 + i))
        ctx.fillStyle = '#cfd6ff'
        ctx.fillRect(sx, sy, 2, 2)
      }
      ctx.globalAlpha = 1

      const creatureX = W * 0.5, creatureY = H * 0.62, ch = H * 0.5
      drawCreature(ctx, { x: creatureX, y: creatureY, h: ch, creature, t, charge: d.charge, hit: d.hit, dying: d.dying })

      drawWizard(ctx, {
        x: W * 0.13, yBase: H * 0.97, h: H * 0.42,
        form, appearance, t, moving: false, view: 'front',
      })

      if (d.bolt) drawBolt(ctx, W * 0.19, H * 0.66, creatureX, creatureY - ch * 0.4, d.bolt.p, q.color)

      // Creature health, as pips over its head
      const pipR = Math.max(3, H * 0.018)
      for (let i = 0; i < plan.hp; i++) {
        const px = creatureX - (plan.hp - 1) * pipR * 2.6 / 2 + i * pipR * 2.6
        ctx.beginPath(); ctx.arc(px, creatureY - ch * 1.12, pipR, 0, Math.PI * 2)
        ctx.fillStyle = i < d.hp ? '#ff6b6b' : '#33203a'
        ctx.fill()
      }

      // Charge bar
      // Narrow enough that its left end clears the wizard's wand.
      const bw = W * 0.48, bx = (W - bw) / 2, by = creatureY + H * 0.12
      ctx.fillStyle = '#1b1030'
      ctx.fillRect(bx, by, bw, Math.max(4, H * 0.024))
      ctx.fillStyle = d.charge > 0.7 ? '#ff5f6d' : '#f9ca74'
      ctx.fillRect(bx, by, bw * d.charge, Math.max(4, H * 0.024))
      ctx.font = `900 ${Math.max(8, H * 0.038)}px Nunito, sans-serif`
      ctx.fillStyle = plan.timed ? '#8f8fc0' : '#7ee8a2'
      ctx.textAlign = 'center'
      ctx.fillText(plan.timed ? 'SPELL CHARGING' : 'NO TIMER — TAKE YOUR TIME', creatureX, by - H * 0.018)

      // Wards
      ctx.font = `${Math.max(10, H * 0.06)}px serif`
      ctx.textAlign = 'left'
      for (let i = 0; i < plan.wards; i++) {
        ctx.globalAlpha = i < d.wards ? 1 : 0.2
        ctx.fillText('🛡️', W * 0.03 + i * H * 0.075, H * 0.12)
      }
      ctx.globalAlpha = 1

      if (d.flash > 0) {
        ctx.fillStyle = `rgba(255,60,60,${d.flash * 0.45})`
        ctx.fillRect(0, 0, W, H)
      }
      ctx.textAlign = 'left'
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
      <div className={`appear scroll ${shake ? 'shake' : ''}`} style={{
        width: '100%', maxWidth: 410, maxHeight: '96vh', overflowY: 'auto',
        background: C.panel, border: `3px solid ${phase === 'won' ? C.good : phase === 'lost' ? C.bad : creature.accent}`,
        borderRadius: 24, padding: '14px 14px 16px',
        boxShadow: `0 0 44px ${creature.accent}44`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontFamily: serif, fontSize: 14, letterSpacing: 2.5, color: creature.accent, fontWeight: 900 }}>
            ◆ SPELL DUEL
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>{creature.name}</span>
        </div>

        <canvas ref={canvasRef} style={{
          display: 'block', width: '100%', height: 200,
          borderRadius: 14, border: `1.5px solid ${C.line}`,
        }} />

        {phase === 'fight' && (
          <>
            <div style={{ textAlign: 'center', padding: '10px 0 2px' }}>
              <div style={{
                fontFamily: sans, fontWeight: 900,
                fontSize: 'clamp(28px,9vw,42px)', color: '#fff',
                textShadow: `0 0 22px ${q.color}88`,
              }}>{q.disp}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 12 }}>
              {choices.map(v => {
                const out = v === dud
                const hit = v === good
                const held = good != null && !hit         // the others, while it lands
                return (
                  <button key={v} className="bh" onClick={() => pick(v)}
                    disabled={out || good != null} style={{
                    minHeight: 66, borderRadius: 16,
                    cursor: out || good != null ? 'default' : 'pointer',
                    border: `2px solid ${hit ? C.good : out ? C.line : q.color}`,
                    background: hit ? `${C.good}33` : out ? '#0d0d22' : `${q.color}1f`,
                    color: hit ? C.good : out ? C.faint : '#fff',
                    fontSize: 28, fontWeight: 900, fontFamily: sans,
                    opacity: out ? 0.4 : held ? 0.35 : 1,
                    textDecoration: out ? 'line-through' : 'none',
                    transition: 'opacity .12s ease, background .12s ease',
                    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  }}>{hit ? `✓ ${v}` : v}</button>
                )
              })}
            </div>
            <div style={{ textAlign: 'center', color: C.faint, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
              {plan.timed
                ? 'Tap the answer to break its spell.'
                : "Tap the answer to break its spell. It won't cast while you think — only a wrong answer feeds it."}
              {' '}Lose and it just runs off — you keep every point you already have.
            </div>
          </>
        )}

        {phase === 'won' && (
          <div style={{ textAlign: 'center', padding: '14px 4px 4px' }}>
            <div style={{ fontSize: 40 }}>✨</div>
            <div style={{ fontFamily: serif, fontSize: 23, fontWeight: 900, color: C.good, letterSpacing: 1 }}>
              Vanquished!
            </div>
            <div style={{ color: C.gold, fontWeight: 900, fontSize: 26, fontFamily: sans, marginTop: 6 }}>
              +{d.earned} <span style={{ fontSize: 11, color: C.faint }}>+ bravery bonus</span>
            </div>
          </div>
        )}

        {phase === 'lost' && (
          <div style={{ textAlign: 'center', padding: '14px 4px 4px' }}>
            <div style={{ fontSize: 36 }}>💨</div>
            <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 900, color: C.dim, letterSpacing: 1 }}>
              It slips away…
            </div>
            <div style={{ color: C.faint, fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
              No points lost. Back to the maze.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
