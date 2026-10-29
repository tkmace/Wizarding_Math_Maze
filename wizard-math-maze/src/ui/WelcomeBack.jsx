import { useEffect } from 'react'
import { C, sans, serif, panel } from './theme.js'
import { welcomeWords } from '../game/welcome.js'
import * as sfx from '../engine/sound.js'

/**
 * The castle noticed she was gone.
 *
 * Deliberately an overlay at the top of App rather than a panel inside the Hub.
 * A returning wizard whose gift tips her over a rank threshold goes to the robe
 * choice first and would never reach the Hub to be welcomed — which is exactly
 * what happened the first time this was built, and is the sort of thing only a
 * screenshot tells you.
 */
export default function WelcomeBack({ profile, gift, onSeen }) {
  // A beat after the card, not with it. The tap that logged her in is also the
  // tap that woke the audio clock, and resume() has not finished at the moment
  // this mounts — a sound fired now is thrown away by a context that is still
  // suspended, which is how the first version of this was silent.
  useEffect(() => {
    if (!gift) return
    const t = setTimeout(() => sfx.shimmer(), 420)
    return () => clearTimeout(t)
  }, [gift])

  if (!gift) return null
  return (
    <div
      onClick={onSeen}
      style={{
        position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center',
        background: 'rgba(8,6,24,0.74)', backdropFilter: 'blur(3px)', cursor: 'pointer',
      }}>
      <div style={{
        ...panel, maxWidth: 330, margin: 16, padding: '24px 20px', textAlign: 'center',
        border: `1px solid ${C.gold}66`, boxShadow: `0 0 40px ${C.gold}33`,
      }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>🕯️</div>
        <div style={{ color: '#fff', fontFamily: serif, fontSize: 23, fontWeight: 900, marginTop: 10 }}>
          Welcome back, {profile?.name}!
        </div>
        <div style={{ color: C.dim, fontSize: 13, fontWeight: 700, marginTop: 7, lineHeight: 1.45 }}>
          {welcomeWords(gift)}
        </div>
        <div style={{ marginTop: 15, color: C.gold, fontFamily: sans, fontSize: 19, fontWeight: 900 }}>
          +{gift.points} points
        </div>
        <div style={{ color: C.dim, fontSize: 11, fontWeight: 800, marginTop: 12 }}>
          tap anywhere to carry on
        </div>
      </div>
    </div>
  )
}
