import { useState } from 'react'
import {
  SKIN_TONES, HAIR_COLORS, HAIR_STYLES, blankAppearance,
  EYE_COLORS, BEARD_STYLES,
} from '../game/appearance.js'
import { formById } from '../game/skins.js'
import { nestById } from '../game/nests.js'
import { wizardById } from '../game/wizards.js'
import { C, sans, serif, btn, panel, label } from './theme.js'
import WizardPreview from './WizardPreview.jsx'
import Portrait from './Portrait.jsx'
import NestCrest from './NestCrest.jsx'

/**
 * Everything about the wizard herself, as opposed to the robe she's earned.
 *
 * Called "My Wizard" rather than "My Look" because it isn't only a look any
 * more: her face, her hair, her beard and the nest she belongs to all live
 * here, and a child looking for where to change her house was never going to
 * find it behind the word "look". Changes preview live on the robe she's
 * actually wearing.
 */
export default function LookPicker({ profile, onSave, onClose, onNest, onWizard }) {
  // On the way in there is no castle to go back to yet, and a button offering
  // to return to one she has never seen is a dead end with a cheerful label.
  const first = !profile.nest
  const [look, setLook] = useState(() => ({ ...blankAppearance(), ...(profile.appearance || {}) }))
  const form = formById(profile.equippedSkin)

  const nest = nestById(profile.nest)
  const wiz = wizardById(profile.wizard)
  const set = (key, value) => setLook(l => ({ ...l, [key]: value }))

  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 470, padding: '8px 14px 24px' }}>
      {/* The way out lives at the top as well as the bottom — this page is long
          and scrolling to the end to get home is a chore on a tablet. */}
      {!first && (
        <button className="bh" onClick={onClose} style={btn('gold', { width: '100%', marginBottom: 12 })}>
          Back to the Castle 🏰
        </button>
      )}
      <h2 style={{
        fontFamily: serif, fontSize: 26, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, textAlign: 'center', margin: '6px 0 2px',
        textShadow: `0 0 18px ${C.gold}77`,
      }}>My Wizard</h2>
      <p style={{ color: C.dim, fontSize: 13, textAlign: 'center', margin: '0 0 14px', fontFamily: serif, letterSpacing: 1 }}>
        {first ? 'Make her yours — all of it can change later' : 'This stays with you whatever robes you wear'}
      </p>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {/* The portrait, not the little figure — these are the choices that
            change a face, so the face is what has to be on screen. */}
        <div style={{ filter: `drop-shadow(0 0 22px ${form.trim}66)` }}>
          <Portrait profile={{ ...profile, appearance: look }} form={form} size={200} style={{ margin: '0 auto' }} />
        </div>
        <div style={{ color: form.trim, fontFamily: serif, fontSize: 13, letterSpacing: 2, fontWeight: 900, marginTop: -6 }}>
          {form.title.toUpperCase()}
        </div>
      </div>

      {/* Which of the six she is. Top of the page because it is the biggest
          single thing about her, and because a child who wants to be someone
          else should not have to hunt for it. */}
      <div style={panel({ padding: '12px 14px', marginBottom: 10 })}>
        <div style={label()}>MY FACE</div>
        <button className="bh" onClick={() => onWizard(look)} style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '8px 10px', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
          border: `2px solid ${C.lineHi}`, background: C.panelHi,
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Portrait profile={{ ...profile, appearance: look }} form={form} size={44}
            animate={false} style={{ borderRadius: 9 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', color: '#fff', fontWeight: 900, fontSize: 15, fontFamily: sans }}>
              {wiz.name}
            </span>
            <span style={{ display: 'block', color: C.dim, fontSize: 11, fontStyle: 'italic' }}>
              {wiz.blurb}
            </span>
          </span>
          <span style={{ color: C.gold, fontSize: 12, fontWeight: 900, fontFamily: serif, letterSpacing: 1 }}>
            CHANGE ›
          </span>
        </button>
      </div>

      {/* Your nest belongs on the page about who you are, not tucked behind a
          crest in the corner of the castle. */}
      <div style={panel({ padding: '12px 14px', marginBottom: 10 })}>
        <div style={label()}>MY NEST</div>
        {/* Keeps whatever she's changed here before jumping to the nests, so a
            trip to change house doesn't quietly discard a new hair colour. */}
        <button className="bh" onClick={() => onNest(look)} style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '8px 10px', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
          border: `2px solid ${nest ? nest.shield : C.lineHi}`,
          background: nest ? `${nest.shield}1f` : C.panelHi,
          WebkitTapHighlightColor: 'transparent',
        }}>
          {nest
            ? <NestCrest nest={nest} size={44} />
            : <span style={{ fontSize: 30, width: 44, textAlign: 'center' }}>🪶</span>}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', color: '#fff', fontWeight: 900, fontSize: 15, fontFamily: sans }}>
              {nest ? nest.name : 'Choose a nest'}
            </span>
            <span style={{ display: 'block', color: C.dim, fontSize: 11, fontStyle: 'italic' }}>
              {nest ? nest.motto : 'Every wizard belongs to one of the four'}
            </span>
          </span>
          <span style={{ color: C.gold, fontSize: 12, fontWeight: 900, fontFamily: serif, letterSpacing: 1 }}>
            CHANGE ›
          </span>
        </button>
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 10 })}>
        <div style={label()}>SKIN</div>
        <Swatches
          items={SKIN_TONES}
          selected={look.skin}
          onPick={i => set('skin', i)}
          colorOf={s => s.hex}
        />
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 10 })}>
        <div style={label()}>HAIR COLOUR</div>
        <Swatches
          items={HAIR_COLORS}
          selected={look.hairColor}
          onPick={i => set('hairColor', i)}
          colorOf={s => s.hex}
        />
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 14 })}>
        <div style={label()}>HAIR LENGTH</div>
        <div style={{ display: 'grid', gap: 7 }}>
          {HAIR_STYLES.map(h => {
            const on = look.hairStyle === h.id
            return (
              <button key={h.id} className="bh" onClick={() => set('hairStyle', h.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                padding: '10px 12px', borderRadius: 13, cursor: 'pointer', minHeight: 48,
                border: `2px solid ${on ? C.gold : C.lineHi}`,
                background: on ? `${C.gold}1c` : C.panelHi,
                color: on ? '#fff' : C.faint, fontFamily: sans,
              }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 900, fontSize: 14.5 }}>{h.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: on ? C.dim : C.faint }}>{h.desc}</span>
                </span>
                {on && <span style={{ color: C.gold, fontSize: 17 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* The face.
          Face shape, eyebrows, nose and mouth are all still parts in the rig
          (appearance.js, and the renderer draws whichever it is handed) — they
          are simply not offered here. Four more rows of chips turned a quick,
          fun screen into a police sketch, and the parts that actually read at
          the size a wizard is drawn are the skin, the hair and the eyes. The
          tables stay so a row can come back by adding one Chips line. */}
      {/* The eye SHAPE row used to live here and did nothing at all. Each of
          the six wizards has her eyes authored for her own spacing — that is
          most of why they stopped looking like the same person — so the
          portrait ignores a shape override, and a control that moves nothing
          is worse than no control. Colour still works, because colour moves
          nothing either. */}
      <div style={panel({ padding: '14px 16px', marginBottom: 14 })}>
        <div style={label()}>EYE COLOUR</div>
        <Swatches items={EYE_COLORS} selected={look.eyeColor} onPick={i => set('eyeColor', i)} colorOf={s => s.hex} size={40} />

        {/* Facial hair used to come with the ROBE — every rank above Archmage
            drew an elder's beard on whoever was wearing it. It's a choice now,
            off unless she asks for it, and available at every rank. */}
        <div style={{ ...label(), marginTop: 12 }}>BEARD</div>
        <Chips items={BEARD_STYLES} selected={look.beard} onPick={i => set('beard', i)} />
      </div>

      <button className="bh" onClick={() => setLook(l => ({ ...l, ...surprise() }))}
        style={btn('ghost', { width: '100%', marginBottom: 10, fontSize: 13 })}>
        🎲 Surprise me
      </button>

      <button className="bh" onClick={() => onSave(look)} style={btn('gold', { width: '100%', fontSize: 17, minHeight: 54 })}>
        That's me! ✨
      </button>
      <button className="bh" onClick={onClose} style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 13 })}>
        {first ? 'Skip for now →' : '🏰 Back to the Castle — don\'t save'}
      </button>
    </div>
  )
}

/** Roll the parts this screen offers — never the ones it doesn't, or the dice
 *  would change things she has no way to change back. */
function surprise() {
  const r = list => list[Math.floor(Math.random() * list.length)].id
  return {
    skin: r(SKIN_TONES), hairColor: r(HAIR_COLORS), hairStyle: r(HAIR_STYLES),
    eyeColor: r(EYE_COLORS),
  }
}

/** A row of named part chips — the generic control for any face part. */
function Chips({ items, selected, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {items.map(it => {
        const on = selected === it.id
        return (
          <button key={it.id} className="bh" onClick={() => onPick(it.id)} style={{
            flex: '1 1 auto', minWidth: 74, minHeight: 40, padding: '8px 10px',
            borderRadius: 11, cursor: 'pointer', fontFamily: sans,
            fontWeight: 900, fontSize: 12.5,
            border: `2px solid ${on ? C.gold : C.lineHi}`,
            background: on ? `${C.gold}1c` : C.panelHi,
            color: on ? '#fff' : C.faint,
            WebkitTapHighlightColor: 'transparent',
          }}>{it.name}</button>
        )
      })}
    </div>
  )
}

function Swatches({ items, selected, onPick, colorOf, size = 54 }) {
  return (
    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map(s => {
        const on = selected === s.id
        return (
          <button key={s.id} className="bh" onClick={() => onPick(s.id)} aria-label={s.name} style={{
            width: size, height: size, borderRadius: '50%', cursor: 'pointer',
            background: colorOf(s),
            border: `3px solid ${on ? C.gold : 'transparent'}`,
            boxShadow: on ? `0 0 16px ${C.gold}88` : 'inset 0 0 0 1px rgba(0,0,0,.35)',
            position: 'relative',
            WebkitTapHighlightColor: 'transparent',
          }}>
            {on && (
              <span style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.37, color: '#0c0820', fontWeight: 900,
                textShadow: '0 0 4px rgba(255,255,255,.7)',
              }}>✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
