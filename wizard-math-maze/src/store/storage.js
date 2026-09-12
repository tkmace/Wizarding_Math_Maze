// ─── Local-first profile store ────────────────────────────────────────────────
// Progress lives in this browser. No backend to wake up, no free-tier project to
// keep alive, works on a plane. `sync.js` can mirror a profile to a cloud
// backend later without any of the game code changing.

const KEY = 'wmm.profiles.v3'
const LAST = 'wmm.lastPlayer'
const SCHEMA = 3

/** localStorage can throw (private windows, blocked site data) — never let it break the game. */
function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch { return {} }
}

function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true }
  catch { return false }
}

export const slug = name => String(name || '').trim().toLowerCase()

export function blankProfile(name, passcode) {
  return {
    v: SCHEMA,
    name: String(name).trim(),
    passcode: String(passcode),
    totalPoints: 0,
    equippedSkin: 'apprentice',
    stones: 0,
    plays: 0,
    facts: {},
    stats: { mazesCleared: 0, doorsOpened: 0, correct: 0, wrong: 0, bestStreak: 0, hintsUsed: 0, playMs: 0 },
    settings: { ops: ['addition'], diff: 'apprentice', showCompass: true, bigKeypad: true },
    createdAt: Date.now(),
    lastPlayed: Date.now(),
  }
}

/** Fill in anything a profile from an older schema is missing. */
export function migrate(p) {
  const base = blankProfile(p.name || 'Wizard', p.passcode || '0000')
  const out = {
    ...base, ...p,
    v: SCHEMA,
    stats: { ...base.stats, ...(p.stats || {}) },
    settings: { ...base.settings, ...(p.settings || {}) },
    facts: p.facts || {},
  }
  if (!Array.isArray(out.settings.ops) || !out.settings.ops.length) out.settings.ops = ['addition']
  return out
}

/** Profile cards for the login screen — no passcode needed just to see who exists. */
export function listProfiles() {
  return Object.values(readAll())
    .map(migrate)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .map(p => ({
      name: p.name,
      totalPoints: p.totalPoints || 0,
      equippedSkin: p.equippedSkin || 'apprentice',
      lastPlayed: p.lastPlayed,
      mazesCleared: p.stats?.mazesCleared || 0,
    }))
}

export function profileExists(name) { return !!readAll()[slug(name)] }

/** Returns { ok, profile } or { ok:false, reason:'missing'|'passcode' }. */
export function loadProfile(name, passcode) {
  const rec = readAll()[slug(name)]
  if (!rec) return { ok: false, reason: 'missing' }
  if (String(rec.passcode) !== String(passcode)) return { ok: false, reason: 'passcode' }
  return { ok: true, profile: migrate(rec) }
}

export function createProfile(name, passcode) {
  const all = readAll()
  if (all[slug(name)]) return { ok: false, reason: 'taken' }
  const p = blankProfile(name, passcode)
  all[slug(p.name)] = p
  writeAll(all)
  setLastPlayer(p.name)
  return { ok: true, profile: p }
}

export function saveProfile(profile) {
  if (!profile?.name) return false
  const all = readAll()
  all[slug(profile.name)] = { ...profile, lastPlayed: Date.now() }
  setLastPlayer(profile.name)
  return writeAll(all)
}

export function deleteProfile(name) {
  const all = readAll()
  delete all[slug(name)]
  return writeAll(all)
}

export function setLastPlayer(name) { try { localStorage.setItem(LAST, name) } catch {} }
export function getLastPlayer() { try { return localStorage.getItem(LAST) || null } catch { return null } }

// ─── Wizard Scroll: move a profile between devices ────────────────────────────
// A pasteable code, so progress can hop from the iPad to the laptop with no
// account system at all.
export function exportScroll(profile) {
  const slim = {
    n: profile.name, p: profile.passcode, t: profile.totalPoints, s: profile.equippedSkin,
    st: profile.stones, pl: profile.plays, f: profile.facts, x: profile.stats, g: profile.settings,
  }
  const json = JSON.stringify(slim)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return `WMM3-${b64}`
}

export function importScroll(code) {
  try {
    const body = String(code).trim().replace(/^WMM3-/, '')
    const json = decodeURIComponent(escape(atob(body)))
    const s = JSON.parse(json)
    if (!s?.n) return { ok: false, reason: 'unreadable' }
    const p = migrate({
      name: s.n, passcode: s.p, totalPoints: s.t, equippedSkin: s.s,
      stones: s.st, plays: s.pl, facts: s.f, stats: s.x, settings: s.g,
    })
    const all = readAll()
    const existing = all[slug(p.name)]
    // Keep whichever copy has seen more play, so importing an old scroll can't
    // wipe out newer progress on this device.
    const merged = existing && (existing.plays || 0) > (p.plays || 0) ? migrate(existing) : p
    all[slug(p.name)] = merged
    writeAll(all)
    return { ok: true, profile: merged }
  } catch { return { ok: false, reason: 'unreadable' } }
}
