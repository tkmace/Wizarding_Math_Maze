import { C, sans, serif } from './theme.js'

/**
 * On-screen number pad. The original game was arrow-keys-and-keyboard only,
 * which made it unplayable on a tablet — this is the answer-entry half of the
 * fix. Keys are 56px minimum so they work under a child's finger.
 */
export default function Keypad({ onDigit, onBack, onSubmit, disabled, canSubmit, submitLabel = '✓' }) {
  const key = (content, handler, tone) => (
    <button
      className="bh"
      onClick={handler}
      disabled={disabled}
      style={{
        minHeight: 56,
        borderRadius: 14,
        border: `2px solid ${tone === 'plain' ? C.lineHi : 'transparent'}`,
        background: tone === 'submit' ? `linear-gradient(135deg,${C.good},#3fbf75)`
                  : tone === 'back'   ? C.panelHi
                  : '#1a1a4e',
        color: tone === 'submit' ? '#052013' : C.ink,
        fontSize: tone === 'plain' ? 24 : 22,
        fontWeight: 900,
        fontFamily: tone === 'back' ? `${sans}, 'Apple Symbols', 'Segoe UI Symbol'` : sans,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
      }}
    >{content}</button>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => key(n, () => onDigit(String(n)), 'plain'))}
      {key('⌫', onBack, 'back')}
      {key(0, () => onDigit('0'), 'plain')}
      <button
        className="bh"
        onClick={onSubmit}
        disabled={disabled || !canSubmit}
        style={{
          minHeight: 56, borderRadius: 14, border: 'none',
          background: canSubmit ? `linear-gradient(135deg,${C.good},#3fbf75)` : '#1a1a3e',
          color: canSubmit ? '#052013' : C.faint,
          fontSize: String(submitLabel).length > 2 ? 15 : 24, fontWeight: 900,
          fontFamily: String(submitLabel).length > 2 ? serif : sans,
          letterSpacing: String(submitLabel).length > 2 ? 1 : 0,
          cursor: canSubmit && !disabled ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
        }}
      >{submitLabel}</button>
    </div>
  )
}
