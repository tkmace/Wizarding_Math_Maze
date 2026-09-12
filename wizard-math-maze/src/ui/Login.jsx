import { useState, useEffect, useRef } from 'react'
import { listProfiles, loadProfile, createProfile, importScroll, getLastPlayer, profileExists, saveProfile } from '../store/storage.js'
import { syncEnabled, pull as cloudPull, mergeProfiles, findLegacy, claimLegacy } from '../store/sync.js'
import { formById, rankFor, mapLegacySkin } from '../game/skins.js'
import WizardPreview from './WizardPreview.jsx'
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
  const [scroll, setScroll] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const [legacy, setLegacy] = useState(null)
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
      // Nothing under that token — but there may be points waiting under this
      // NAME from the old version, whose passcodes are long forgotten.
      const old = await findLegacy(n)
      setBusy(false)
      if (old) { setLegacy(old); setMode('legacy'); return }
    }

    const res = createProfile(n, code)
    if (!res.ok) return nope('A wizard already has that name — pick another!')
    onEnter(res.profile)
  }

  /** Take the old points onto a freshly created profile. */
  const takeLegacy = async () => {
    const n = name.trim()
    const made = createProfile(n, code)
    if (!made.ok) return nope('A wizard already has that name — pick another!')

    setBusy(true)
    const result = await claimLegacy(made.profile, n)
    setBusy(false)

    if (!result) {
      // Someone claimed it in the meantime. The fresh profile still stands.
      saveProfile(made.profile)
      return onEnter(made.profile)
    }

    // Restore the old robe too. v1's six skins map onto the new form ladder, and
    // we only honour it if the claimed points actually reach that form's rank —
    // nobody inherits a rank they haven't earned.
    const wanted = mapLegacySkin(result.claimed.equippedSkin)
    const form = formById(wanted)
    const earned = rankFor(result.profile.totalPoints).rank >= form.rank
    // Rank 0 is the starting robe, not a choice, so it never goes in `chosen`.
    const restored = earned
      ? {
        ...result.profile, equippedSkin: wanted,
        chosen: form.rank > 0
          ? { ...(result.profile.chosen || {}), [form.rank]: wanted }
          : { ...(result.profile.chosen || {}) },
      }
      : { ...result.profile, equippedSkin: 'apprentice' }
    saveProfile(restored)
    onEnter(restored)
  }

  const startFresh = () => {
    const res = createProfile(name.trim(), code)
    if (!res.ok) return nope('A wizard already has that name — pick another!')
    onEnter(res.profile)
  }

  const restore = () => {
    const res = importScroll(scroll)
    if (!res.ok) return nope('That scroll is unreadable ✨')
    onEnter(res.profile)
  }

  const lastName = getLastPlayer()

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
                    <WizardPreview form={sk} appearance={p.appearance} size={46} animate={false} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 900, fontSize: 17, fontFamily: sans, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      <span style={{ display: 'block', color: C.dim, fontSize: 11, fontFamily: serif, letterSpacing: 1 }}>
                        {rank.name} · {p.totalPoints.toLocaleString()} pts
                      </span>
                    </span>
                    <span style={{ color: C.gold, fontSize: 18 }}>›</span>
                  </button>
                )
              })}
            </div>
            <button className="bh" onClick={() => { setMode('new'); setName(''); setCode(''); setErr('') }}
              style={btn('gold', { width: '100%' })}>＋ New Wizard</button>
            <button className="bh" onClick={() => { setMode('scroll'); setErr('') }}
              style={{ marginTop: 10, background: 'none', border: 'none', color: C.faint, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
              I have a Wizard Scroll from another device
            </button>
          </>
        )}

        {/* ── Passcode ── */}
        {mode === 'passcode' && target && (
          <>
            <WizardPreview form={formById(target.equippedSkin)} appearance={target.appearance} size={86} style={{ margin: '0 auto' }} />
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, marginBottom: 14, fontFamily: sans }}>{target.name}</div>
            <label style={label({ textAlign: 'left' })}>SECRET PASSCODE</label>
            <input
              ref={codeRef} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={code} placeholder="••••"
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && unlock()}
              style={inputStyle({ textAlign: 'center', fontSize: 24, letterSpacing: 8 })}
            />
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
              type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={code} placeholder="••••"
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && make()}
              style={inputStyle({ textAlign: 'center', fontSize: 22, letterSpacing: 8 })}
            />
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

        {/* ── Reclaim progress from the old version ── */}
        {mode === 'legacy' && legacy && (
          <>
            <div style={{ fontSize: 40, marginBottom: 4 }}>📜</div>
            <div style={{ fontFamily: serif, fontSize: 14, letterSpacing: 2, color: C.gold, fontWeight: 900, marginBottom: 10 }}>
              AN OLD SCROLL BEARS YOUR NAME
            </div>
            <div style={{
              background: '#0a0a2c', border: `2px solid ${C.gold}66`, borderRadius: 14,
              padding: '14px 12px', marginBottom: 14,
            }}>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 19, fontFamily: sans }}>{legacy.name}</div>
              <div style={{ color: C.gold, fontWeight: 900, fontSize: 26, fontFamily: sans, marginTop: 4 }}>
                {legacy.totalPoints.toLocaleString()}
                <span style={{ fontSize: 11, color: C.faint, marginLeft: 5, letterSpacing: 1 }}>PTS</span>
              </div>
              <div style={{ color: C.dim, fontSize: 11, marginTop: 6, fontFamily: serif, letterSpacing: 1 }}>
                {formById(mapLegacySkin(legacy.equippedSkin)).title}
              </div>
            </div>
            <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.7, margin: '0 0 14px' }}>
              If this is you, claim it and the passcode you just chose becomes your new one.
              Old passcodes weren’t carried over.
            </p>
            {err && <Err>{err}</Err>}
            <button className="bh" onClick={takeLegacy} disabled={busy}
              style={btn('gold', { width: '100%', opacity: busy ? 0.7 : 1 })}>
              {busy ? <><span className="spinner">✨</span> Claiming…</> : 'That’s me — claim it! 🪄'}
            </button>
            <button className="bh" onClick={startFresh} disabled={busy}
              style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 13 })}>
              Not me — start fresh
            </button>
          </>
        )}

        {/* ── Import scroll ── */}
        {mode === 'scroll' && (
          <>
            <label style={label({ textAlign: 'left' })}>PASTE YOUR WIZARD SCROLL</label>
            <textarea
              value={scroll} onChange={e => { setScroll(e.target.value); setErr('') }}
              placeholder="WMM3-…" rows={4}
              style={inputStyle({ fontSize: 11, fontFamily: 'monospace', resize: 'vertical' })}
            />
            {err && <Err>{err}</Err>}
            <button className="bh" onClick={restore} style={btn('teal', { width: '100%', marginTop: 4 })}>Unroll the Scroll 📜</button>
            <button className="bh" onClick={() => { setMode(profiles.length ? 'pick' : 'new'); setErr('') }}
              style={{ marginTop: 10, background: 'none', border: 'none', color: C.faint, fontSize: 12, cursor: 'pointer' }}>← back</button>
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
