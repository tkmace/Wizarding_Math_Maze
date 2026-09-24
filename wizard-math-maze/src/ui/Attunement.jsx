import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  attuneCorridor, beginAttunement, attuneNext, attuneRecord, attuneDone,
  attuneResult, attuneProgress, attuneLength,
} from '../game/attunement.js'
import { warmPlaysFor, recordAnswer } from '../game/curriculum.js'
import { senseTier, opByKey, OPS } from '../game/math.js'
import { FACING_DELTA, WALL, DOOR, END, PATH, revealFrom } from '../game/maze.js'
import { C, sans, serif, btn, panel } from './theme.js'
import GameView from './GameView.jsx'
import MathDoor from './MathDoor.jsx'
import Portrait from './Portrait.jsx'

/**
 * The Attunement — the castle taking a new wizard's measure.
 *
 * It is a placement test, and a child can smell a test from the next room. So
 * it is a walk through the castle, drawn by the same renderer as every maze —
 * but a single corridor rather than a maze, with one door at every turn and
 * nothing else in it. No creatures, no rune stones, no sealed exit, and no way
 * to do badly: she cannot fail this, and she will not be told she got anything
 * wrong.
 *
 * It WAS a maze, and the maze was wrong in three ways a child found in one
 * sitting — see `attuneCorridor` for what a corridor fixes and why.
 *
 * The measurement is a staircase; `game/attunement.js` has the reasoning. What
 * lives here is the ceremony round it, and one rule the ordinary maze does not
 * have: ONE answer per door. A retry would tell the staircase she can do
 * something she needed three goes at, and the placement would come out too high
 * — which is the one failure mode that actually hurts.
 *
 * It owns its own movement rather than borrowing App's. App's `act` carries
 * encounters, rune stones, the exit gate, rank-ups and scoring, none of which
 * exist here; the subset is short, and keeping it separate means the ceremony
 * cannot break the game loop that everything else depends on.
 */
export default function Attunement({ profile, ops, form, onDone, onCancel }) {
  const [phase, setPhase] = useState('intro')      // intro | walk | done
  const session = useRef(null)
  const [maze, setMaze] = useState(null)
  const [pos, setPos] = useState({ row: 1, col: 1, facing: 0 })
  const [doorQ, setDoorQ] = useState(null)
  const [doorCell, setDoorCell] = useState(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const posRef = useRef(pos); posRef.current = pos
  const phaseRef = useRef(phase); phaseRef.current = phase
  const doorRef = useRef(doorQ); doorRef.current = doorQ

  // Which operations this ceremony will measure.
  //
  // It used to be whatever she had switched on in the castle — which on a
  // first run is the blank profile's `['addition']`, because the Attunement
  // arrives BEFORE she has ever seen the practice list. So every new wizard
  // was measured at addition and left at the beginner's default for the other
  // three, which is the exact problem this ceremony exists to solve, solved
  // one quarter of the way.
  //
  // She picks now, on the invitation, starting from what she has on.
  const [picked, setPicked] = useState(() => {
    const from = [...ops].filter(k => OPS.some(o => o.key === k))
    return from.length ? from : ['addition']
  })
  const opList = useMemo(
    () => OPS.map(o => o.key).filter(k => picked.includes(k)),
    [picked])
  const plan = useMemo(() => attuneLength(opList), [opList])

  const toggleOp = useCallback(key => {
    setPicked(cur => cur.includes(key)
      // Never all the way off: a ceremony that measures nothing has nothing to
      // tell her, and the button would sit there disabled with no explanation.
      ? (cur.length > 1 ? cur.filter(k => k !== key) : cur)
      : [...cur, key])
  }, [])

  const begin = useCallback(() => {
    session.current = beginAttunement(opList)
    const m = attuneCorridor(opList, profile)
    m.id = `attune-${Date.now()}`
    setMaze(m)
    setPos({ ...m.start, facing: 0 })
    setDoorQ(null); setDoorCell(null)
    setProgress(0)
    setPhase('walk')
  }, [opList, profile])

  /**
   * Fold the whole ceremony into the profile.
   *
   * Her answers are real practice, so they go through `recordAnswer` like any
   * other — the fact table and the play count should not care where a question
   * was asked. But the SKILL it computes is thrown away and replaced by the
   * placement, because the staircase has just measured in ten questions what
   * `recordAnswer` would take fifty to approach.
   *
   * `opPlays` is credited too, and that is not cosmetic: the beginner ceiling in
   * curriculum.js would otherwise pin her at the level she was placed and let
   * her slide down from it without ever climbing back. See `warmPlaysFor`.
   */
  const finish = useCallback(() => {
    const s = session.current
    const r = attuneResult(s)
    let next = profile
    let right = 0
    for (const { q, correct, ms } of r.log) {
      const rec = recordAnswer(next, q, correct, ms, 0)
      if (correct) right++
      next = { ...next, facts: rec.facts, plays: rec.plays }
    }
    const skill = { ...next.skill }
    const opPlays = { ...(next.opPlays || {}) }
    for (const [op, level] of Object.entries(r.skill)) {
      skill[op] = level
      opPlays[op] = Math.max(opPlays[op] || 0, warmPlaysFor(level))
    }
    setResult({ ...r, right })
    setPhase('done')
    onDone({
      ...next,
      skill,
      opPlays,
      attuned: Date.now(),
      // What has actually been measured, so the castle can offer to measure an
      // operation the first time she switches it on rather than leaving it at
      // the beginner's default for a fortnight.
      attunedOps: [...new Set([...(next.attunedOps || []), ...Object.keys(r.skill)])],
      stats: {
        ...next.stats,
        correct: (next.stats?.correct || 0) + right,
        wrong: (next.stats?.wrong || 0) + (r.log.length - right),
      },
    })
  }, [profile, onDone])

  // --- Movement, the short version -------------------------------------------
  const act = useCallback(action => {
    if (phaseRef.current !== 'walk' || doorRef.current) return
    const { row, col, facing } = posRef.current
    // Same reasoning as the door guard below: every move updates the ref it was
    // read from, so two presses in one tick are two steps rather than one.
    const go = p => { posRef.current = p; setPos(p) }
    if (action === 'turnLeft') { go({ row, col, facing: (facing + 3) % 4 }); return }
    if (action === 'turnRight') { go({ row, col, facing: (facing + 1) % 4 }); return }

    const [dr, dc] = action === 'forward' ? FACING_DELTA[facing] : FACING_DELTA[(facing + 2) % 4]
    const nr = row + dr, nc = col + dc
    const cell = maze?.grid[nr]?.[nc]
    if (cell === undefined || cell === WALL) return

    if (cell === DOOR) {
      const q = attuneNext(session.current)
      if (!q) { finish(); return }
      // Close the door to any further input NOW, not at the next render.
      //
      // The guard at the top of this function reads a ref that React assigns
      // while rendering, so two key events in the same tick — a held arrow key,
      // an impatient double tap — both got through, and the second one rolled a
      // SECOND question over the top of the first. She would then be answering
      // the sum she could see while the staircase scored her against the one it
      // had quietly swapped in, so a child answering correctly could be walked
      // steadily DOWN to the easiest questions in the game. It showed up as the
      // Attunement placing a confident answerer at the floor.
      doorRef.current = q
      setDoorQ(q)
      setDoorCell({ row: nr, col: nc })
      return
    }
    // The way out. It used to do nothing at all — she could walk onto it and
    // the ceremony carried on regardless, which is the worst kind of dead end:
    // one that looks like an exit. Reaching it now finishes, on whatever the
    // staircase has, because a staircase has a usable estimate at every step.
    if (cell === END) { finish(); return }
    go({ row: nr, col: nc, facing })
    revealFrom(maze.seen, maze.grid, nr, nc)
  }, [maze, finish])

  const actRef = useRef(act); actRef.current = act
  const onAction = useCallback(a => actRef.current(a), [])

  /** Open the door she just answered at, whichever way it went. */
  const passThrough = useCallback(cell => {
    setMaze(m => {
      if (!m) return m
      const grid = m.grid.map(r => [...r])
      grid[cell.row][cell.col] = PATH
      revealFrom(m.seen, grid, cell.row, cell.col)
      return { ...m, grid }
    })
    // Keep the ref that `act` reads in step with the move, or the first step
    // after a door is computed from where she was standing before it.
    posRef.current = { ...posRef.current, row: cell.row, col: cell.col }
    setPos(p => ({ ...p, row: cell.row, col: cell.col }))
  }, [])

  const answered = useCallback((correct, ms) => {
    const s = session.current
    const q = doorRef.current
    const cell = doorCell
    attuneRecord(s, q, correct, ms)
    setProgress(attuneProgress(s))
    setDoorQ(null); setDoorCell(null)
    if (cell) passThrough(cell)
    if (attuneDone(s)) setTimeout(finish, 420)
  }, [doorCell, passThrough, finish])

  // Every door opens. A wrong answer is not a wall here — she walks through it
  // exactly as if she had been right, and is never told which it was.
  const onCorrect = useCallback(ms => answered(true, ms), [answered])
  const onWrong = useCallback(() => answered(false, 0), [answered])

  if (phase === 'intro') {
    return <Invitation plan={plan} ops={opList} onToggle={toggleOp}
      form={form} profile={profile} onBegin={begin} onCancel={onCancel} />
  }
  if (phase === 'done' && result) return <Verdict result={result} form={form} profile={profile} onClose={onCancel} />
  if (!maze) return null

  return (
    <>
      <GameView
        maze={maze} pos={pos} form={form} appearance={profile.appearance}
        runPoints={0} total={profile.totalPoints || 0} stones={0}
        doorsLeft={0} effects={[]} gateMet
        showCompass={profile.settings?.showCompass}
        paused={!!doorQ}
        onAction={onAction}
        onExit={onCancel}
        hud={<Meter value={progress} />}
      />
      {doorQ && (
        <MathDoor
          q={doorQ} stones={0} bigKeypad={profile.settings?.bigKeypad}
          exam
          onCorrect={onCorrect}
          onWrong={onWrong}
          onStepBack={onWrong}
        />
      )}
    </>
  )
}

/** How far through the ceremony she is. Deliberately not a score. */
function Meter({ value }) {
  return (
    <div style={{ marginBottom: 7, padding: '0 2px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 9.5, fontWeight: 900, letterSpacing: 1, marginBottom: 3,
      }}>
        <span style={{ fontFamily: serif, color: C.gold }}>✦ THE ATTUNEMENT</span>
        <span style={{ color: C.faint }}>THE CASTLE IS WATCHING</span>
      </div>
      <div style={{ height: 7, background: '#0a0a2c', borderRadius: 7, overflow: 'hidden', border: `1px solid ${C.line}` }}>
        <div style={{
          height: '100%', width: `${value * 100}%`, borderRadius: 7,
          background: `linear-gradient(90deg,${C.teal},${C.gold})`,
          boxShadow: `0 0 10px ${C.gold}88`,
          transition: 'width .5s ease-out',
        }} />
      </div>
    </div>
  )
}

function Invitation({ plan, ops, onToggle, form, profile, onBegin, onCancel }) {
  const names = [...ops].map(k => opByKey(k).label.toLowerCase())
  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 420, padding: '8px 14px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, lineHeight: 1 }}>✦</div>
      <h2 style={{
        fontFamily: serif, fontSize: 27, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, margin: '4px 0 2px', textShadow: `0 0 18px ${C.gold}77`,
      }}>The Attunement</h2>
      <p style={{ color: C.dim, fontSize: 13, fontFamily: serif, letterSpacing: 1, margin: '0 0 14px' }}>
        Let the castle take your measure
      </p>

      <div style={{ filter: `drop-shadow(0 0 22px ${form.trim}55)`, margin: '0 0 10px' }}>
        <Portrait profile={profile} form={form} size={170} style={{ margin: '0 auto' }} />
      </div>

      <div style={panel({ padding: '14px 16px', marginBottom: 12, textAlign: 'left' })}>
        <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.75, margin: '0 0 9px', fontFamily: sans }}>
          A short maze, about <strong style={{ color: C.goldHi }}>{plan.typical} doors</strong>. Each
          one is a little harder or a little easier than the last, depending on how the one before
          it went.
        </p>
        <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: sans }}>
          You cannot lose this, and you will not be marked. When it is over, every
          maze after it will be pitched at you — so nobody wastes your time asking
          things you already know.
        </p>
      </div>

      {/* What to measure.
          Measuring several in ONE ceremony is much cheaper than it looks: a
          lane that has not started yet borrows its starting level from one
          that has finished, so subtraction begins near where addition landed
          rather than at the bottom. Three operations cost about the same as
          two. Four separate ceremonies would throw all of that away. */}
      <div style={panel({ padding: '11px 12px', marginBottom: 12 })}>
        <div style={{
          fontFamily: serif, fontSize: 11.5, letterSpacing: 2, color: C.dim,
          fontWeight: 900, textAlign: 'left', marginBottom: 8,
        }}>WHAT SHOULD IT MEASURE?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
          {OPS.map(o => {
            const on = ops.includes(o.key)
            return (
              <button key={o.key} className="bh" onClick={() => onToggle(o.key)} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px',
                borderRadius: 12, cursor: 'pointer', minHeight: 44,
                border: `2px solid ${on ? o.color : C.lineHi}`,
                background: on ? `${o.color}1f` : C.panelHi,
                color: on ? '#fff' : C.faint,
                fontWeight: 900, fontSize: 12.5, fontFamily: sans,
              }}>
                <span style={{ fontSize: 17 }}>{o.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{o.label}</span>
                {on && <span style={{ color: o.color, fontSize: 12 }}>✓</span>}
              </button>
            )
          })}
        </div>
        <p style={{ color: C.faint, fontSize: 10.5, margin: '9px 2px 0', lineHeight: 1.55, textAlign: 'left' }}>
          Only pick the ones you have done before. Anything you leave off, the
          castle can measure later — it will offer when you first switch it on.
        </p>
      </div>

      <p style={{ color: C.faint, fontSize: 11.5, margin: '0 0 14px', lineHeight: 1.6 }}>
        Measuring {names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names.slice(-1)}.
        {' '}Answer each door once — there is no going back and no hints, so a guess is fine.
      </p>

      <button className="bh" onClick={onBegin} style={btn('gold', { width: '100%', fontSize: 17, minHeight: 56 })}>
        Begin the Attunement ✦
      </button>
      <button className="bh" onClick={onCancel} style={btn('ghost', { width: '100%', marginTop: 9, fontSize: 13 })}>
        Not now — take me to the castle
      </button>
    </div>
  )
}

/**
 * What it found.
 *
 * Shown as a rank she has been *given*, never as a mark out of anything. A
 * child who has just been measured wants to know what she is, not how she did.
 */
function Verdict({ result, form, profile, onClose }) {
  return (
    <div className="appear scroll" style={{ zIndex: 10, width: '100%', maxWidth: 420, padding: '8px 14px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 44, lineHeight: 1 }}>✦</div>
      <h2 style={{
        fontFamily: serif, fontSize: 25, fontWeight: 900, color: C.gold,
        letterSpacing: 1.5, margin: '4px 0 4px', textShadow: `0 0 20px ${C.gold}77`,
      }}>The castle knows you now</h2>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 14px', fontFamily: serif, letterSpacing: 1 }}>
        {result.asked} doors · your mazes are set
      </p>

      <div style={{ filter: `drop-shadow(0 0 24px ${form.trim}66)`, margin: '0 0 12px' }}>
        <Portrait profile={profile} form={form} size={180} style={{ margin: '0 auto' }} />
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        {Object.entries(result.skill).map(([op, level]) => {
          const o = opByKey(op)
          const band = senseTier(level, op).band
          const name = TIER_NAMES[Math.min(TIER_NAMES.length - 1, Math.round(band))]
          return (
            <div key={op} style={panel({ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11 })}>
              <span style={{ fontSize: 20 }}>{o.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>
                <span style={{ display: 'block', color: '#fff', fontWeight: 900, fontSize: 14, fontFamily: sans }}>
                  {o.label}
                </span>
                <span style={{ display: 'block', color: C.faint, fontSize: 11 }}>
                  starting at {name.toLowerCase()}
                </span>
              </span>
              <span style={{ width: 88 }}>
                <span style={{ display: 'block', height: 7, background: '#0a0a2c', borderRadius: 7, overflow: 'hidden', border: `1px solid ${C.line}` }}>
                  <span style={{
                    display: 'block', height: '100%', width: `${level * 100}%`,
                    background: o.color, boxShadow: `0 0 8px ${o.color}88`,
                  }} />
                </span>
              </span>
            </div>
          )
        })}
      </div>

      <p style={{ color: C.faint, fontSize: 11.5, lineHeight: 1.7, margin: '0 0 14px' }}>
        The mazes start a little below this on purpose, and climb as you do.
        You can be measured again any time from the castle.
      </p>

      <button className="bh" onClick={onClose} style={btn('gold', { width: '100%', fontSize: 17, minHeight: 56 })}>
        To the castle 🏰
      </button>
    </div>
  )
}

const TIER_NAMES = ['Novice', 'Apprentice', 'Sorcerer', 'Archmage', 'Legendary']
