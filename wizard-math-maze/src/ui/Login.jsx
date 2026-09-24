import { useState, useEffect, useRef } from 'react'
import { listProfiles, loadProfile, createProfile, getLastPlayer, profileExists, saveProfile } from '../store/storage.js'
import { syncEnabled, pull as cloudPull, mergeProfiles } from '../store/sync.js'
import { formById, rankFor } from '../game/skins.js'
import WizardPreview from './WizardPreview.jsx'
import NestCrest from './NestCrest.jsx'
import Keypad from './Keypad.jsx'
import { C, sans, serif, btn, panel, label } from './theme.js'

/**
 * Login is a face-picker first and a form second. A seven-year-old should be
 * able to get into the game by tapping her own wizard and typing four digits —
 * no name to spell, no email anywhere.
 */
export default function Login({ onEnter }) {
  const [profiles, setProfiles] = useState(() => listProfiles())
  const [mode, setMode] = useState(() => listProfiles().length ? 'pick' : 'new')
  const [target, setTarget] = useState(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const codeRef = useRef(null)

  const nope = msg => { setErr(msg); setShake(true); setTimeout(() => setShake(false), 450) }

  useEffect(() => { if (mode === 'passcode') setTimeout(() => codeRef.current?.focus(), 120) }, [mode])

  const pick = p => { setTarget(p); setCode(''); setErr(''); setMode('passcode') }

  const unlock = async () => {
    const res = loadProfile(target.name, code)
    if (!res.ok) return nope(res.reason === 'passcode' ? 'Wrong passcode — try again 🔒' : 'That wizard vanished!')
    if (!syncEnabled()) return onEnter(res.profile)

    // Fold in anything she did on another device. If the network is down or
    // there's no cloud copy, the local profile is used unchanged.
    setBusy(true)
    const remote = await cloudPull(res.profile.name, code)
    setBusy(false)
    const merged = mergeProfiles(res.profile, remote)
    if (remote) saveProfile(merged)
    onEnter(merged)
  }

  const make = async () => {
    const n = name.trim()
    if (n.length < 2) return nope('Your name needs at least 2 letters!')
    if (!/^\d{4,6}$/.test(code)) return nope('Passcode must be 4–6 numbers!')
    if (profileExists(n)) return nope('A wizard already has that name — pick another!')

    // This might not be a new wizard at all — it might be the same wizard on a
    // new device. The same name and passcode derive the same token, so we look
    // in the cloud before creating a blank profile over the top of real progress.
    if (syncEnabled()) {
      setBusy(true)
      const remote = await cloudPull(n, code)
      if (remote) {
        setBusy(false)
        saveProfile(remote)
        return onEnter(remote)
      }
      setBusy(false)
    }

    const res = createProfile(n, code)
    if (!res.ok) return nope('A wizard already has that name — pick another!')
    onEnter(res.profile)
  }

  const startFresh = () => {
    const res = createProfile(name.trim(), code)
    if (!res.ok) return nope('A wizard already has that name — pick another!')
    onEnter(res.profile)
  }

  const lastName = getLastPlayer()

  // On a tablet the system keyboard slides up over the button you're trying to
  // press, and there's no way to put a "go" key on it. So on a touch device the
  // passcode box doesn't summon it — inputMode="none" keeps it down — and the
  // app draws its own pad with the enter key built in. The field itself stays
  // editable, so a Bluetooth keyboard (or an iPad in a case) still types, and
  // nobody is ever locked out by a wrong guess about what kind of device this is.
  const touch = typeof window !== 'undefined'
    && window.matchMedia?.('(pointer: coarse)').matches
  const codeKeypad = (submit, label) => touch && (
    <Keypad
      onDigit={dd => { setCode(c => (c + dd).slice(0, 6)); setErr('') }}
      onBack={() => { setCode(c => c.slice(0, -1)); setErr('') }}
      onSubmit={submit}
      canSubmit={code.length >= 4 && !busy}
      submitLabel={label}
    />
  )

  return (
    <div className="appear" style={{ textAlign: 'center', zIndex: 10, maxWidth: 440, width: '100%', padding: '0 14px' }}>
      <div style={{ fontSize: 66, marginBottom: 4 }} className="wf">🧙‍♂️</div>
      <h1 style={{
        fontFamily: serif, fontSize: 'clamp(23px,5.5vw,36px)', fontWeight: 900,
        color: C.gold, letterSpacing: 2, textShadow: `0 0 22px ${C.gold}aa`, margin: '0 0 4px',
      }}>Wizard Math Maze</h1>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 20px', fontFamily: serif, letterSpacing: 1 }}>
        Who dares enter the realm?
      </p>

      <div className={shake ? 'shake' : ''} style={panel({ borderColor: err ? C.bad : C.line, transition: 'border-color .2s' })}>

        {/* ── Pick a wizard ── */}
        {mode === 'pick' && (
          <>
            <div style={{ ...label({ textAlign: 'left' }) }}>CHOOSE YOUR WIZARD</div>
            <div className="scroll" style={{ display: 'grid', gap: 8, maxHeight: '42vh', marginBottom: 12 }}>
              {profiles.map(p => {
                const sk = formById(p.equippedSkin)
                const rank = rankFor(p.totalPoints)
                return (
                  <button key={p.name} className="bh" onClick={() => pick(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    padding: '11px 13px', borderRadius: 14, cursor: 'pointer',
                    background: C.panelHi, border: `2px solid ${p.name === lastName ? C.gold + '88' : C.lineHi}`,
                  }}>
                    <WizardPreview profile={p} form={sk} size={46} animate={false} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 900, fontSize: 17, fontFamily: sans, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      <span style={{ display: 'block', color: C.dim, fontSize: 11, fontFamily: serif, letterSpacing: 1 }}>
                        {rank.name} · {p.totalPoints.toLocaleString()} pts
                      </span>
                    </span>
                    {p.nest && <NestCrest nest={p.nest} size={26} />}
                    <span style={{ color: C.gold, fontSize: 18 }}>›</span>
                  </button>
                )
              })}
            </div>
            <button className="bh" onClick={() => { setMode('new'); setName(''); setCode(''); setErr('') }}
              style={btn('gold', { width: '100%' })}>＋ New Wizard</button>
          </>
        )}

        {/* ── Passcode ── */}
        {mode === 'passcode' && target && (
          <>
            <WizardPreview profile={target} form={formById(target.equippedSkin)} size={86} style={{ margin: '0 auto' }} />
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, marginBottom: 14, fontFamily: sans }}>{target.name}</div>
            <label style={label({ textAlign: 'left' })}>SECRET PASSCODE</label>
            <input
              ref={codeRef} type="password" inputMode={touch ? 'none' : 'numeric'}
              enterKeyHint="go" pattern="[0-9]*" maxLength={6}
              value={code} placeholder="••••"
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && unlock()}
              style={inputStyle({ textAlign: 'center', fontSize: 24, letterSpacing: 8 })}
            />
            {codeKeypad(unlock, 'ENTER ›')}
            {err && <Err>{err}</Err>}
            <button className="bh" onClick={unlock} disabled={busy}
              style={btn('gold', { width: '100%', marginTop: 4, opacity: busy ? 0.7 : 1 })}>
              {busy ? <><span className="spinner">✨</span> Finding your magic…</> : 'Enter the Realm! 🗺️'}
            </button>
            <button className="bh" onClick={() => { setMode('pick'); setErr('') }}
              style={{ marginTop: 10, background: 'none', border: 'none', color: C.faint, fontSize: 12, cursor: 'pointer' }}>← someone else</button>
          </>
        )}

        {/* ── New wizard ── */}
        {mode === 'new' && (
          <>
            <label style={label({ textAlign: 'left' })}>WIZARD NAME</label>
            <input
              type="text" maxLength={20} value={name} placeholder="e.g. Camille, Max, Zara…"
              onChange={e => { setName(e.target.value); setErr('') }}
              style={inputStyle()}
            />
            <label style={label({ textAlign: 'left' })}>
              SECRET PASSCODE <span style={{ color: C.faint, fontSize: 9 }}>(4–6 numbers)</span>
            </label>
            <input
              type="password" inputMode={touch ? 'none' : 'numeric'}
              enterKeyHint="go" pattern="[0-9]*" maxLength={6}
              value={code} placeholder="••••"
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && make()}
              style={inputStyle({ textAlign: 'center', fontSize: 22, letterSpacing: 8 })}
            />
            {codeKeypad(make, 'BEGIN ›')}
            {err && <Err>{err}</Err>}
            <button className="bh" onClick={make} disabled={busy}
              style={btn('gold', { width: '100%', marginTop: 4, opacity: busy ? 0.7 : 1 })}>
              {busy ? <><span className="spinner">✨</span> Checking the archives…</> : 'Begin the Journey! ✨'}
            </button>
            {profiles.length > 0 && (
              <button className="bh" onClick={() => { setMode('pick'); setErr('') }}
                style={{ marginTop: 10, background: 'none', border: 'none', color: C.faint, fontSize: 12, cursor: 'pointer' }}>← back to wizards</button>
            )}
            <p style={{ color: C.faint, fontSize: 10, marginTop: 14, lineHeight: 1.7 }}>
              Progress is saved right here in this browser — no account, no email.
            </p>
          </>
        )}

      </div>
    </div>
  )
}

const inputStyle = (extra = {}) => ({
  width: '100%', padding: '12px 14px', fontSize: 17, fontWeight: 800,
  background: '#0a0a2c', border: `2px solid ${C.lineHi}`, borderRadius: 12,
  color: '#fff', marginBottom: 14, outline: 'none', fontFamily: sans,
  ...extra,
})

const Err = ({ children }) => (
  <div style={{ color: C.bad, fontSize: 12, marginBottom: 12, fontWeight: 800 }}>{children}</div>
)
