import { neon } from '@neondatabase/serverless'

/**
 * Cloud mirror for a wizard's progress, plus the one-time claim path for
 * players migrated from the old v1 database.
 *
 *   GET  /api/profile?token=<hex>   -> { profile } | 404
 *   GET  /api/profile?legacy=<name> -> { found, name, totalPoints, equippedSkin }
 *   PUT  /api/profile               <- { token, profile, claimLegacy? }
 *                                   -> { profile, claimed }
 *
 * The token is PBKDF2(passcode, salt="wmm:<name>") computed in the browser. The
 * passcode never reaches this function, so the token is both the lookup key and
 * the only credential: a wrong passcode derives a token matching no row.
 */

const TOKEN_RE = /^[0-9a-f]{64}$/
const MAX_BYTES = 64 * 1024      // a profile with years of fact history is ~20 kB
const nameKey = s => String(s).trim().toLowerCase().slice(0, 40)

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'sync not configured' })
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      // ── Is there unclaimed v1 progress under this name? ──
      if (req.query.legacy) {
        const rows = await sql`
          select name, total_points, equipped_skin
            from legacy_players
           where name_key = ${nameKey(req.query.legacy)}
             and claimed_by is null
        `
        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).json(rows.length
          ? { found: true, name: rows[0].name, totalPoints: rows[0].total_points, equippedSkin: rows[0].equipped_skin }
          : { found: false })
      }

      const { token } = req.query
      if (!TOKEN_RE.test(token || '')) return res.status(400).json({ error: 'bad token' })

      const rows = await sql`select data from profiles where token = ${token}`
      if (!rows.length) return res.status(404).json({ error: 'not found' })

      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ profile: rows[0].data })
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { token, profile, claimLegacy } = body || {}
      if (!TOKEN_RE.test(token || '')) return res.status(400).json({ error: 'bad token' })
      if (!profile || typeof profile !== 'object' || !profile.name) {
        return res.status(400).json({ error: 'bad profile' })
      }
      if (JSON.stringify(profile).length > MAX_BYTES) {
        return res.status(413).json({ error: 'profile too large' })
      }
      // Belt and braces: the client strips the passcode before sending, and we
      // refuse to persist one even if a future client forgets to.
      delete profile.passcode

      // ── Claim old points, if asked ──
      // The award is decided here, not by the client, and the UPDATE's
      // `claimed_by is null` makes it single-shot: if two people race on the
      // same name, exactly one UPDATE returns a row.
      let claimed = null
      if (claimLegacy) {
        const rows = await sql`
          update legacy_players
             set claimed_by = ${token}, claimed_at = now()
           where name_key = ${nameKey(claimLegacy)}
             and claimed_by is null
          returning total_points, equipped_skin
        `
        if (rows.length) {
          claimed = { totalPoints: rows[0].total_points, equippedSkin: rows[0].equipped_skin }
          profile.totalPoints = (profile.totalPoints || 0) + claimed.totalPoints
          profile.legacyClaimed = claimed.totalPoints
        }
      }

      const plays = Number.isFinite(profile.plays) ? Math.trunc(profile.plays) : 0

      // Plain last-writer-wins would let a stale tab clobber a newer device, so
      // a write only lands if it represents at least as much play as what's
      // already stored. A claim bypasses it, since claimed points aren't plays.
      if (claimed) {
        await sql`
          insert into profiles (token, name, data, plays, updated_at)
          values (${token}, ${String(profile.name).slice(0, 40)}, ${profile}, ${plays}, now())
          on conflict (token) do update
            set data = excluded.data, name = excluded.name,
                plays = greatest(excluded.plays, profiles.plays), updated_at = now()
        `
      } else {
        await sql`
          insert into profiles (token, name, data, plays, updated_at)
          values (${token}, ${String(profile.name).slice(0, 40)}, ${profile}, ${plays}, now())
          on conflict (token) do update
            set data = excluded.data, name = excluded.name,
                plays = excluded.plays, updated_at = now()
            where excluded.plays >= profiles.plays
        `
      }

      return res.status(200).json({ profile, claimed })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    console.error('[profile]', err?.message || err)
    return res.status(500).json({ error: 'server error' })
  }
}
