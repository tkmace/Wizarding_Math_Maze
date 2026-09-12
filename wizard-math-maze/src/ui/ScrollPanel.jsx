import { useState } from 'react'
import { exportScroll } from '../store/storage.js'
import { C, sans, btn } from './theme.js'
import { Sheet } from './Wardrobe.jsx'

/**
 * Progress lives in this browser, so this is how it travels: a pasteable code.
 * Simpler than an account, and there is no server to keep awake.
 */
export default function ScrollPanel({ profile, onClose }) {
  const code = exportScroll(profile)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch { /* clipboard blocked — the textarea below is still selectable */ }
  }

  return (
    <Sheet title="Wizard Scroll" subtitle="Carry your progress to another device" onClose={onClose}>
      <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.7, margin: '0 0 12px' }}>
        Copy this scroll, then on the other device tap <strong style={{ color: '#fff' }}>“I have a Wizard Scroll”</strong> on
        the login screen and paste it in. Your points, rank and everything you’ve
        practiced come with you.
      </p>
      <textarea
        readOnly value={code} rows={5}
        onFocus={e => e.target.select()}
        style={{
          width: '100%', padding: 11, borderRadius: 12, background: '#0a0a2c',
          border: `2px solid ${C.lineHi}`, color: C.teal, fontFamily: 'monospace',
          fontSize: 10.5, resize: 'vertical', outline: 'none', wordBreak: 'break-all',
        }}
      />
      <button className="bh" onClick={copy} style={btn(copied ? 'good' : 'teal', { width: '100%', marginTop: 10, fontFamily: sans })}>
        {copied ? '✓ Copied!' : '📋 Copy scroll'}
      </button>
    </Sheet>
  )
}
