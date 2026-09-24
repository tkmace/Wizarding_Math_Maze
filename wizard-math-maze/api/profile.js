import { neon } from '@neondatabase/serverless'

/**
 * Cloud mirror for a wizard's progress.
 *
 *   GET  /api/profile?token=<hex>   -> { profile } | 404
 *   PUT  /api/profile               <- { token, profile } -> { profile }
 *
 * The one-time claim path for players carried over from the old v1 database
 * has been removed: everyone who was coming across has come across. The
 * `legacy_players` table is untouched and can be dropped whenever you like.
 *
 * The token is PBKDF2(passcode, salt="wmm:<name>") computed in the browser. The
 * passcode never reaches this function, so the token is both the lookup key and
 * the only credential: a wrong passcode derives a token matching no row.
 */

const TOKEN_RE = /^[0-9a-f]{64}$/
const MAX_BYTES = 64 * 1024      // a profile with years of fact history is ~20 kB

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'sync not configured' })
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    if (req.method === 'GET') {
      const { token } = req.query
      if (!TOKEN_RE.test(token || '')) return res.status(400).json({ error: 'bad token' })

      const rows = await sql`select data from profiles where token = ${token}`
      if (!rows.length) return res.status(404).json({ error: 'not found' })

      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ profile: rows[0].data })
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { token, profile } = body || {}
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

      const plays = Number.isFinite(profile.plays) ? Math.trunc(profile.plays) : 0

      // Plain last-writer-wins would let a stale tab clobber a newer device, so
      // a write only lands if it represents at least as much play as what's
      // already stored.
      await sql`
        insert into profiles (token, name, data, plays, updated_at)
        values (${token}, ${String(profile.name).slice(0, 40)}, ${profile}, ${plays}, now())
        on conflict (token) do update
          set data = excluded.data, name = excluded.name,
              plays = excluded.plays, updated_at = now()
          where excluded.plays >= profiles.plays
      `

      return res.status(200).json({ profile })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    console.error('[profile]', err?.message || err)
    return res.status(500).json({ error: 'server error' })
  }
}
