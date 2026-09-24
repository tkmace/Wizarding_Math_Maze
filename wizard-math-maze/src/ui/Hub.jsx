import { useState } from 'react'
import { OPS, DIFFS, SENSE, senseTier, skillOf } from '../game/math.js'
import { formById, rankFor, nextRank, rankProgress, activePerks } from '../game/skins.js'
import { nestById } from '../game/nests.js'
import { C, sans, serif, btn, panel, label } from './theme.js'
import WizardPreview from './WizardPreview.jsx'
import Portrait from './Portrait.jsx'
import NestCrest from './NestCrest.jsx'

/** The castle: choose what to practice, see your rank, head into a maze. */
export default function Hub({ profile, ops, diff, onToggleOp, onSetDiff, onStart, onWardrobe, onShop, onReport, onLook, onNest, onAttune, onLogout, pendingPicks }) {
  const form = formById(profile.equippedSkin)
  const rank = rankFor(profile.totalPoints)
  const next = nextRank(profile.totalPoints)
  const pct = rankProgress(profile.totalPoints)
  const perks = activePerks(profile)
  const [showFixed, setShowFixed] = useState(diff !== SENSE)
  const nest = nestById(profile.nest)

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px' }}>
      {/* Wizard + rank. The nest crest hangs beside her: not a menu item, just
          the badge she belongs to, and a tap away from being changed. */}
      <div style={{ textAlign: 'center', marginBottom: 10, position: 'relative' }}>
        {nest && (
          <button className="bh" onClick={onNest} aria-label={`Nest: ${nest.name}`} style={{
            position: 'absolute', right: 0, top: 2, zIndex: 2, width: 92,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ color: C.faint, fontSize: 9, letterSpacing: 2.5, fontFamily: serif, fontWeight: 900 }}>
              NEST
            </span>
            <span style={{ filter: `drop-shadow(0 0 14px ${nest.shield}88)` }}>
              <NestCrest nest={nest} size={70} />
            </span>
            <span style={{
              color: '#fff', fontSize: 11, lineHeight: 1.1, fontFamily: sans, fontWeight: 900,
              textShadow: `0 0 10px ${nest.shield}`,
            }}>
              {nest.name.replace(' Eagles', '')}
            </span>
            <span style={{ color: C.faint, fontSize: 9, lineHeight: 1.1, fontFamily: sans, fontWeight: 800 }}>
              Eagles
            </span>
          </button>
        )}
        <div className="wf" style={{ filter: `drop-shadow(0 0 26px ${form.trim}88)` }}>
          <Portrait profile={profile} form={form} size={196} style={{ margin: '0 auto' }} />
        </div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, fontFamily: sans, marginTop: -6 }}>{profile.name}</div>
        <div style={{ color: form.trim, fontFamily: serif, fontSize: 14, letterSpacing: 2, fontWeight: 900 }}>
          {form.title.toUpperCase()}
        </div>
        {perks.form.perk?.label && perks.form.perk.label !== 'A steady beginning' && (
          <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>✦ {perks.form.perk.label}</div>
        )}
      </div>

      {/* Points + next rank */}
      <div style={panel({ padding: '14px 16px', marginBottom: 12 })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ color: C.gold, fontWeight: 900, fontSize: 26, fontFamily: sans }}>
            {profile.totalPoints.toLocaleString()}
            <span style={{ fontSize: 11, color: C.faint, marginLeft: 5, letterSpacing: 1 }}>PTS</span>
          </span>
          {/* The purse.
              Runes buy things now — hints, curios, robes — so the count has to
              look like money rather than a statistic. It was 13px of teal text
              beside a 26px points figure, which made it read as a second score
              nobody could spend. A bordered pill you can press, that takes you
              to the shop, says what it is without a word of explanation. */}
          <button className="bh" onClick={onShop} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 11px 6px 9px', borderRadius: 13,
            border: `2px solid ${C.teal}`, background: `${C.teal}1c`,
            cursor: onShop ? 'pointer' : 'default',
            boxShadow: `0 0 14px ${C.teal}2e`,
          }}>
            <span style={{ fontSize: 19, lineHeight: 1 }}>🔮</span>
            <span style={{ textAlign: 'left', lineHeight: 1.05 }}>
              <span style={{ display: 'block', color: '#fff', fontSize: 19, fontWeight: 900, fontFamily: sans }}>
                {profile.stones || 0}
              </span>
              <span style={{ display: 'block', color: C.teal, fontSize: 8.5, fontWeight: 900, letterSpacing: 1.2 }}>
                RUNES
              </span>
            </span>
            {onShop && <span style={{ color: C.teal, fontSize: 15, fontWeight: 900 }}>›</span>}
          </button>
        </div>
        <div style={{ height: 9, background: '#0a0a2c', borderRadius: 9, overflow: 'hidden', border: `1px solid ${C.line}` }}>
          <div style={{
            height: '100%', width: `${pct * 100}%`, borderRadius: 9,
            background: `linear-gradient(90deg,${form.robe},${form.trim})`,
            boxShadow: `0 0 12px ${form.trim}99`, transition: 'width .5s ease-out',
          }} />
        </div>
        {/* What the bar is actually counting down to. This used to be one line
            of 10px grey, which is not much of a carrot for the thing the whole
            ladder is built around — so the number that matters is now the size
            of a headline and the reward is spelled out under it. */}
        <div style={{ marginTop: 9, textAlign: 'center' }}>
          {next ? (
            <>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 900, fontFamily: sans, lineHeight: 1.3 }}>
                <span style={{ color: C.gold, fontSize: 19 }}>
                  {(next.threshold - profile.totalPoints).toLocaleString()}
                </span>
                {' '}more points to {next.name}
              </div>
              <div style={{ color: C.dim, fontSize: 12, fontWeight: 800, marginTop: 1 }}>
                🧥 then choose from 3 new robes
              </div>
            </>
          ) : (
            <div style={{ color: C.gold, fontSize: 15, fontWeight: 900, fontFamily: sans }}>
              {rank.name} — every robe unlocked. ☄️
            </div>
          )}
        </div>
      </div>

      {/* Into the maze — the thing she came here to press. */}
      <button className="bh" onClick={onStart} style={btn('gold', { width: '100%', fontSize: 19, minHeight: 58 })}>
        Enter the Maze! 🗝️
      </button>

      {/* Wardrobe + look */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, margin: '10px 0 14px' }}>
        <button className="bh" onClick={onWardrobe} style={btn('ghost', { fontSize: 13, position: 'relative' })}>
          🧥 Wardrobe
          {pendingPicks > 0 && <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9,
            background: C.bad, border: `2px solid ${C.bg}`, color: '#fff',
            fontSize: 10, fontWeight: 900, lineHeight: '13px',
          }}>{pendingPicks}</span>}
        </button>
        <button className="bh" onClick={onLook} style={btn('ghost', { fontSize: 13 })}>🪞 My Wizard</button>
      </div>

      {/* Operations */}
      <div style={panel({ padding: '14px 16px', marginBottom: 12 })}>
        <div style={label()}>WHAT SHALL WE PRACTICE?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {OPS.map(o => {
            const on = ops.has(o.key)
            const band = diff === SENSE ? senseTier(skillOf(profile, o.key), o.key) : null
            return (
              <button key={o.key} className="bh" onClick={() => onToggleOp(o.key)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 11px',
                borderRadius: 13, cursor: 'pointer', minHeight: 50,
                border: `2px solid ${on ? o.color : C.lineHi}`,
                background: on ? `${o.color}1f` : C.panelHi,
                boxShadow: on ? `0 0 16px ${o.color}33` : 'none',
                color: on ? '#fff' : C.faint,
                fontWeight: 900, fontSize: 13, fontFamily: sans,
              }}>
                <span style={{ fontSize: 19 }}>{o.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {o.label}
                  {on && band && (
                    <span style={{ display: 'block', fontSize: 9, color: C.dim, fontWeight: 800, letterSpacing: 0.5 }}>
                      up to {band.ranges[o.short][1]}
                    </span>
                  )}
                </span>
                {on && <span style={{ color: o.color, fontSize: 13 }}>✓</span>}
              </button>
            )
          })}
        </div>

      </div>

      {/* Difficulty.
          Wizard's Sense is the recommendation and the default, and a wall of
          five fixed tiers underneath it invites picking one at random. So the
          fixed levels are folded away behind a toggle — still one tap for a
          parent who wants to pin the level, out of the way for everyone else.
          Opened automatically if a fixed level is already in use, so nobody
          lands on this card unable to see what they chose. */}
      <div style={panel({ padding: '14px 16px', marginBottom: 14 })}>
        <div style={label()}>HOW BRAVE ARE YOU?</div>
        <div style={{ display: 'grid', gap: 7 }}>
          {DIFFS.filter(d => d.adaptive || showFixed).map(d => {
            const on = d.key === diff
            return (
              <button key={d.key} className="bh" onClick={() => onSetDiff(d.key)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 13, cursor: 'pointer', minHeight: 48, textAlign: 'left',
                border: `2px solid ${on ? d.color : C.lineHi}`,
                background: on ? `${d.color}1c` : C.panelHi,
                color: on ? '#fff' : C.faint, fontFamily: sans,
              }}>
                <span style={{ fontSize: 18 }}>{d.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 900, fontSize: 14 }}>{d.label}</span>
                  {d.adaptive && (
                    <span style={{ display: 'block', color: C.gold, fontSize: 9, letterSpacing: 1, fontWeight: 900, margin: '1px 0' }}>
                      ADAPTIVE MODE — RECOMMENDED
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: 10, color: on ? C.dim : C.faint }}>{d.desc}</span>
                </span>
                {!d.adaptive && <span style={{ color: d.color, fontSize: 10, fontWeight: 900 }}>×{d.mult}</span>}
              </button>
            )
          })}
        </div>
        {diff === SENSE && (
          <p style={{ color: C.faint, fontSize: 10, marginTop: 9, lineHeight: 1.6 }}>
            Each operation adjusts on its own — get quicker and the numbers grow,
            struggle and they ease back. Points scale with the difficulty it picks.
          </p>
        )}

        <label style={{
          display: 'flex', alignItems: 'center', gap: 9, marginTop: 11,
          cursor: 'pointer', userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={showFixed}
            onChange={e => setShowFixed(e.target.checked)}
            style={{ width: 17, height: 17, accentColor: C.gold, cursor: 'pointer', flex: 'none' }}
          />
          <span style={{ color: C.faint, fontSize: 11, fontWeight: 800, letterSpacing: 0.3 }}>
            Show fixed skill level modes
          </span>
        </label>
      </div>

      {/* Switching wizard is something a household with two children does every
          session, so it's a card like the rest rather than fine print. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        <button className="bh" onClick={onReport} style={btn('ghost', { fontSize: 13 })}>
          📊 My Progress
        </button>
        <button className="bh" onClick={onLogout} style={btn('ghost', { fontSize: 13 })}>
          ↩ Switch Wizard
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {/* A wizard grows, and one who was measured badly should not be stuck
            with it. A link rather than a card: doing it twice in one afternoon
            is not the idea. */}
        <button onClick={onAttune} style={linkStyle}>
          ✦ {profile.attuned ? 'Be measured again' : 'The Attunement'}
        </button>
      </div>
    </div>
  )
}

const linkStyle = {
  background: 'none', border: 'none', color: C.faint,
  fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 4,
}
