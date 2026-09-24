// --- Optional cloud mirror ---------------------------------------------------
// Local storage is always the source of truth during play. This only copies a
// finished profile up, and pulls it down on another device, so the game stays
// fully playable with no backend at all.
//
// It points at the app's own /api by default and needs no configuration. If the
// endpoint isn't deployed (or DATABASE_URL isn't set) the first call gets a 404
// or 503, we remember that, and nothing tries again for the rest of the session.
//
// The passcode never leaves the browser. We derive a token from it and send only
// that. PBKDF2 at 100k iterations makes each guess cost an attacker real CPU
// time, which matters because a 4-digit passcode is only 10,000 possibilities:
// one derivation is imperceptible to the child logging in, but brute-forcing a
// name becomes hours of work rather than seconds.

const BASE = import.meta.env?.VITE_SYNC_URL ?? '/api'
const ITERATIONS = 100_000

let unavailable = false
export const syncEnabled = () => !!BASE && !unavailable

const tokenCache = new Map()

async function token(name, passcode) {
  const cacheKey = `${name}\u0000${passcode}`
  if (tokenCache.has(cacheKey)) return tokenCache.get(cacheKey)

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(String(passcode)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: enc.encode(`wmm:${String(name).trim().toLowerCase()}`),
    iterations: ITERATIONS,
    hash: 'SHA-256',
  }, key, 256)

  const hex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
  tokenCache.set(cacheKey, hex)
  return hex
}

/** Push a profile up. Resolves false on any failure - sync is best-effort. */
export async function push(profile) {
  if (!syncEnabled() || !profile?.name) return false
  try {
    const t = await token(profile.name, profile.passcode)
    const { passcode, ...safe } = profile
    const res = await fetch(`${BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t, profile: safe }),
      keepalive: true,          // survives the tab being closed mid-request
    })
    if (res.status === 503 || res.status === 404) unavailable = true
    return res.ok
  } catch { return false }
}

/** Pull a profile down, or null if there isn't one / the network is unavailable. */
export async function pull(name, passcode) {
  if (!syncEnabled()) return null
  try {
    const t = await token(name, passcode)
    const res = await fetch(`${BASE}/profile?token=${t}`, { cache: 'no-store' })
    if (res.status === 503) { unavailable = true; return null }
    if (!res.ok) return null                  // 404 here just means "no such wizard"
    const body = await res.json()
    return body?.profile ? { ...body.profile, passcode } : null
  } catch { return null }
}

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

  const stats = {}
  for (const k of new Set([...Object.keys(local.stats || {}), ...Object.keys(remote.stats || {})])) {
    stats[k] = Math.max(local.stats?.[k] || 0, remote.stats?.[k] || 0)
  }

  return {
    ...base,
    facts,
    stats,
    // A rank pick and a rune purchase are both permanent, so neither copy may
    // lose one. Where both devices picked at the SAME rank, the busier copy wins.
    chosen: { ...(other.chosen || {}), ...(base.chosen || {}) },
    bought: [...new Set([...(local.bought || []), ...(remote.bought || [])])],
    totalPoints: Math.max(local.totalPoints || 0, remote.totalPoints || 0),
    stones: Math.max(local.stones || 0, remote.stones || 0),
    plays: Math.max(local.plays || 0, remote.plays || 0),
  }
}
