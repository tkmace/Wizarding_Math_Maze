import { useEffect, useRef, useState } from 'react'
import { drawCreature } from '../engine/creatureSprite.js'
import { C, sans, serif, btn } from './theme.js'
import SpellDuel from './SpellDuel.jsx'
import RuneCatch from './RuneCatch.jsx'

/**
 * Frames a wandering encounter: who has turned up, then the game itself.
 *
 * "Sneak past" is deliberate. An encounter interrupts without being asked for,
 * so there has to be a way out that isn't a loss — a child who doesn't fancy it
 * right now should be able to decline rather than be made to play.
 */
export default function Encounter({ kind, creature, ops, diff, profile, form, appearance, onDone }) {
  const [phase, setPhase] = useState('intro')

  if (phase === 'intro') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 80, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 14,
        background: 'rgba(4,3,18,.9)', backdropFilter: 'blur(6px)',
      }}>
        <div className="appear" style={{
          width: '100%', maxWidth: 380, textAlign: 'center',
          background: C.panel, border: `3px solid ${creature.accent}`,
          borderRadius: 24, padding: '20px 18px',
          boxShadow: `0 0 44px ${creature.accent}44`,
        }}>
          <div style={{ fontFamily: serif, fontSize: 14, letterSpacing: 2, color: creature.accent, fontWeight: 900 }}>
            SOMETHING BLOCKS THE WAY
          </div>
          <CreaturePreview creature={creature} size={150} />
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 25, fontFamily: sans }}>{creature.name}</div>
          {/* No "easier than the doors" here. The questions ARE gentler, but
              saying so out loud turns a fight into a consolation prize. */}
          <p style={{ color: C.dim, fontSize: 13.5, lineHeight: 1.6, margin: '6px 0 16px' }}>
            {creature.taunt}
            <br />
            <span style={{ color: C.faint, fontSize: 12 }}>
              {kind === 'duel'
                ? 'Break its spell with quick answers.'
                : 'Catch the runes before they scatter.'}
            </span>
          </p>
          <button className="bh" onClick={() => setPhase('game')}
            style={btn('gold', { width: '100%', fontSize: 17, minHeight: 54 })}>
            {kind === 'duel' ? 'Raise your wand! ⚡' : 'Catch the runes! 🔮'}
          </button>
          <button className="bh" onClick={() => onDone({ outcome: 'fled', earned: 0, answers: [] })}
            style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 13 })}>
            Sneak past
          </button>
        </div>
      </div>
    )
  }

  const Game = kind === 'duel' ? SpellDuel : RuneCatch
  return <Game creature={creature} ops={ops} diff={diff} profile={profile} form={form} appearance={appearance} onDone={onDone} />
}

function CreaturePreview({ creature, size }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = size * dpr; cv.height = size * dpr
    let raf
    const frame = t => {
      const ctx = cv.getContext('2d')
      ctx.clearRect(0, 0, cv.width, cv.height)
      drawCreature(ctx, { x: cv.width / 2, y: cv.height * 0.92, h: cv.height * 0.8, creature, t })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [creature, size])
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block', margin: '4px auto 0' }} />
}
