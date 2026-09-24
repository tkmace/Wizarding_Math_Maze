import { blankSkill, SENSE, parseFactKey } from '../game/math.js'
import { allSeen } from '../game/tips.js'
import { blankAppearance, randomAppearance } from '../game/appearance.js'
import { mapLegacySkin, formById, STARTER } from '../game/skins.js'

// --- Local-first profile store ------------------------------------------------
// Progress lives in this browser. No backend to wake up, no free-tier project to
// keep alive, works on a plane. `sync.js` mirrors a profile to the cloud without
// any of the game code changing.

const KEY = 'wmm.profiles.v3'      // storage key kept stable across schema bumps
const LAST = 'wmm.lastPlayer'
const SCHEMA = 4

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
    equippedSkin: STARTER,
    chosen: {},                    // rank -> chosen form id, one pick per rank
    bought: [],                    // form ids bought with rune stones
    trinkets: [],                  // curios bought in the shop, hers for good
    wearing: [],                   // which of those she has on right now
    appearance: randomAppearance(),// face and hair — hers, kept across every form
    nest: null,                    // one of the four nests, chosen on first run
    skill: blankSkill(),           // per-operation 0..1, drives Wizard's Sense
    opPlays: {},                   // answers per operation — holds the adaptive
                                   // climb down while it has nothing to read yet
    seen: {},                      // first-run explanations already shown
    stones: 0,
    plays: 0,
    facts: {},
    stats: { mazesCleared: 0, doorsOpened: 0, correct: 0, wrong: 0, bestStreak: 0, hintsUsed: 0, playMs: 0 },
    settings: { ops: ['addition'], diff: SENSE, showCompass: true, bigKeypad: true },
    createdAt: Date.now(),
    lastPlayed: Date.now(),
  }
}

/**
 * Bring a profile from any earlier schema up to the current one.
 *
 * The v3 -> v4 step matters: v3 stored one of six skin ids, which have been
 * replaced by 25 procedurally drawn forms across 8 ranks. A returning player's
 * old skin is mapped to its nearest new form AND recorded as her chosen form for
 * that rank, so she keeps wearing something she recognises rather than being
 * silently demoted to the starter robe.
 */
export function migrate(p) {
  const base = blankProfile(p.name || 'Wizard', p.passcode || '0000')
  const out = {
    ...base, ...p,
    v: SCHEMA,
    stats: { ...base.stats, ...(p.stats || {}) },
    settings: { ...base.settings, ...(p.settings || {}) },
    facts: p.facts || {},
    chosen: { ...(p.chosen || {}) },
    bought: Array.isArray(p.bought) ? [...p.bought] : [],
    trinkets: Array.isArray(p.trinkets) ? [...p.trinkets] : [],
    wearing: Array.isArray(p.wearing) ? [...p.wearing] : [],
    skill: { ...blankSkill(), ...(p.skill || {}) },
    appearance: { ...blankAppearance(), ...(p.appearance || {}) },
    opPlays: { ...(p.opPlays || {}) },
    seen: { ...(p.seen || {}) },
  }

  // Someone with a real history behind her does not need to be told what a door
  // is. Anyone from before these existed who has played more than a handful of
  // questions starts with the lot marked as read.
  if (!p.seen && (p.plays || 0) >= 15) out.seen = allSeen()

  // A wizard from before opPlays existed has a real history in her fact table.
  // Count it, so the beginner's ceiling on Wizard's Sense doesn't apply to
  // someone who is plainly not a beginner.
  if (!p.opPlays) {
    const counted = {}
    for (const [key, f] of Object.entries(out.facts)) {
      const { op } = parseFactKey(key)          // the key stores 'add', not 'addition'
      counted[op] = (counted[op] || 0) + (f?.n || 0)
    }
    out.opPlays = counted
  }

  if (!Array.isArray(out.settings.ops) || !out.settings.ops.length) out.settings.ops = ['addition']

  if ((p.v || 0) < 4) {
    const mapped = mapLegacySkin(p.equippedSkin)
    out.equippedSkin = mapped
    const form = formById(mapped)
    if (form.rank > 0 && !out.chosen[form.rank]) out.chosen[form.rank] = form.id
  }
  // Guard against a form id that no longer exists.
  if (!formById(out.equippedSkin) || formById(out.equippedSkin).id !== out.equippedSkin) {
    out.equippedSkin = STARTER
  }
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
      equippedSkin: p.equippedSkin || STARTER,
      appearance: p.appearance,
      nest: p.nest || null,
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
