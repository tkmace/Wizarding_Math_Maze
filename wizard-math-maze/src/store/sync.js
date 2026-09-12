// ─── Optional cloud mirror ────────────────────────────────────────────────────
// Off unless VITE_SYNC_URL is set at build time. The game is fully playable
// without it; this only copies a finished profile up and pulls it down on
// another device. The passcode itself never leaves the browser — the server only
// ever sees a hash of name+passcode as the lookup token.

const URL_BASE = import.meta.env?.VITE_SYNC_URL || ''
export const syncEnabled = () => !!URL_BASE

async function token(name, passcode) {
  const data = new TextEncoder().encode(`wmm:${String(name).toLowerCase()}:${passcode}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Push a profile up. Resolves to false on any failure — sync is best-effort. */
export async function push(profile) {
  if (!URL_BASE) return false
  try {
    const t = await token(profile.name, profile.passcode)
    const { passcode, ...safe } = profile
    const res = await fetch(`${URL_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t, profile: safe }),
    })
    return res.ok
  } catch { return false }
}

/** Pull a profile down, or null if there isn't one / the network is unavailable. */
export async function pull(name, passcode) {
  if (!URL_BASE) return null
  try {
    const t = await token(name, passcode)
    const res = await fetch(`${URL_BASE}/profile?token=${t}`)
    if (!res.ok) return null
    const body = await res.json()
    return body?.profile ? { ...body.profile, passcode } : null
  } catch { return null }
}

/** Whichever copy has seen more questions wins; fact tables are unioned. */
export function mergeProfiles(local, remote) {
  if (!remote) return local
  if (!local) return remote
  const base = (remote.plays || 0) > (local.plays || 0) ? remote : local
  const other = base === remote ? local : remote
  const facts = { ...(other.facts || {}) }
  for (const [k, f] of Object.entries(base.facts || {})) {
    const o = facts[k]
    facts[k] = !o || (f.n || 0) >= (o.n || 0) ? f : o
  }
  return {
    ...base,
    facts,
    totalPoints: Math.max(local.totalPoints || 0, remote.totalPoints || 0),
    stones: Math.max(local.stones || 0, remote.stones || 0),
  }
}
