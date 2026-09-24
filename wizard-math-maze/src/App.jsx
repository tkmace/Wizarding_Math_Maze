import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { genMaze, revealFrom, WALL, PATH, DOOR, END, FACING_DELTA, cellKey } from './game/maze.js'
import { recordAnswer } from './game/curriculum.js'
import { roundPts, SENSE } from './game/math.js'
import { trinketById, buyTrinketState, ownsTrinket } from './game/trinkets.js'
import { formById, rankFor, pendingRanks, activePerks, buyState, STARTER } from './game/skins.js'
import { rollEncounter, encounterReward, duelIsTimed } from './game/encounters.js'
import { hasNest } from './game/nests.js'
import { seenTip } from './game/tips.js'
import { saveProfile } from './store/storage.js'
import { syncEnabled, push as cloudPush } from './store/sync.js'
import { CSS, C, sans, serif } from './ui/theme.js'
import StarField from './ui/StarField.jsx'
import Login from './ui/Login.jsx'
import Hub from './ui/Hub.jsx'
import GameView from './ui/GameView.jsx'
import MathDoor from './ui/MathDoor.jsx'
import Wardrobe from './ui/Wardrobe.jsx'
import Shop from './ui/Shop.jsx'
import WinScreen from './ui/WinScreen.jsx'
import ParentReport from './ui/ParentReport.jsx'
import SkinChoice from './ui/SkinChoice.jsx'
import LookPicker from './ui/LookPicker.jsx'
import NestPicker from './ui/NestPicker.jsx'
import Encounter from './ui/Encounter.jsx'
import Attunement from './ui/Attunement.jsx'
import WizardPicker from './ui/WizardPicker.jsx'
import { wizardById } from './game/wizards.js'
import Coach from './ui/Coach.jsx'

const DISSOLVE_MS = 620
const AMBUSH_MS = 760       // the creature lands in the corridor before the pop-up
const blankRun = () => ({ points: 0, doors: 0, answered: 0, correct: 0, fast: 0, startedAt: Date.now() })

export default function App() {
  const [profile, setProfile] = useState(null)
  const [screen, setScreen] = useState('login')
  const screenRef = useRef(screen)
  screenRef.current = screen
  const [ops, setOps] = useState(new Set(['addition']))
  const [diff, setDiff] = useState(SENSE)

  const [maze, setMaze] = useState(null)
  const [pos, setPos] = useState({ row: 1, col: 1, facing: 0 })
  const posRef = useRef(pos)
  posRef.current = pos

  const [doorQ, setDoorQ] = useState(null)
  // Where the shop was opened from, so its way out goes back there.
  const shopFrom = useRef('wardrobe')
  const [doorCell, setDoorCell] = useState(null)
  const [run, setRun] = useState(blankRun)
  const runRef = useRef(run)
  runRef.current = run
  const [effects, setEffects] = useState([])
  const [popup, setPopup] = useState(null)
  const [flare, setFlare] = useState(0)
  const [newRank, setNewRank] = useState(null)
  const [encounter, setEncounter] = useState(null)
  // The first-run explanations. `tip` is the one on screen; the ref lets the
  // movement handler refuse to walk while one is up, since the card covers the
  // maze and a held arrow key would otherwise carry on behind it.
  const [tip, setTip] = useState(null)
  const tipRef = useRef(null)
  tipRef.current = tip
  // An encounter is queued with a short delay so the step finishes animating.
  // Without this flag, a door bumped inside that window opened BOTH overlays.
  const encPending = useRef(false)
  const encState = useRef({ count: 0, lastAt: -99 })
  const steps = useRef(0)
  const mazeSeq = useRef(0)

  const perks = useMemo(() => activePerks(profile), [profile])
  const pending = useMemo(() => (profile ? pendingRanks(profile) : []), [profile])
  const gateMet = !maze || run.points >= (maze.pointsRequired || 0)

  // --- Persistence -----------------------------------------------------------
  // Local storage is written straight through, so closing the tab mid-maze never
  // loses points she just earned. The cloud copy is NOT written here — that
  // would be one request per correct answer. See `syncUp`.
  const commit = useCallback(next => {
    setProfile(next)
    saveProfile(next)
    return next
  }, [])

  const profileRef = useRef(null)
  profileRef.current = profile

  const syncUp = useCallback(() => {
    const p = profileRef.current
    if (p && syncEnabled()) cloudPush(p)
  }, [])

  // Show an explanation the first time its moment arrives, and never again.
  const teach = useCallback(id => {
    const p = profileRef.current
    if (p && !seenTip(p, id)) setTip(id)
  }, [])

  const learned = useCallback(() => {
    const id = tipRef.current
    setTip(null)
    const p = profileRef.current
    if (id && p) commit({ ...p, seen: { ...(p.seen || {}), [id]: true } })
  }, [commit])

  const enter = useCallback(p => {
    setProfile(p)
    setOps(new Set(p.settings?.ops?.length ? p.settings.ops : ['addition']))
    setDiff(p.settings?.diff || SENSE)
    setScreen('hub')
  }, [])

  useEffect(() => {
    if (!profile) return
    const settings = { ...profile.settings, ops: [...ops], diff }
    if (JSON.stringify(settings) === JSON.stringify(profile.settings)) return
    commit({ ...profile, settings })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops, diff])

  useEffect(() => {
    if (screen === 'hub') syncUp()
  }, [screen, syncUp])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') syncUp() }
    window.addEventListener('pagehide', syncUp)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', syncUp)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [syncUp])

  // A rank she's reached but not chosen a form for is owed a pick. Collect it
  // the moment she's back in the castle rather than interrupting a maze.
  useEffect(() => {
    if (screen !== 'hub') return
    // Who she is comes first. A nest is a team you join and the Attunement is
    // something done to you; this is the one that is simply hers, so it is not
    // third in a queue behind the other two.
    if (profile && !profile.wizard) { setScreen('wizard'); return }
    if (profile && !hasNest(profile)) { setScreen('nest'); return }
    if (pending.length) setScreen('pick')
  }, [screen, pending.length, profile])

  // --- Start a maze ----------------------------------------------------------
  const startGame = useCallback(() => {
    const m = genMaze(ops, diff, profile, perks)
    m.id = ++mazeSeq.current
    setMaze(m)
    setPos({ row: 1, col: 1, facing: 0 })
    setRun(blankRun())
    setDoorQ(null); setDoorCell(null); setEffects([]); setNewRank(null)
    setEncounter(null)
    encPending.current = false
    encState.current = { count: 0, lastAt: -99 }
    steps.current = 0
    setScreen('game')
    teach('maze')
  }, [ops, diff, profile, perks, teach])

  const toggleOp = useCallback(k => setOps(prev => {
    const n = new Set(prev)
    if (n.has(k)) { if (n.size > 1) n.delete(k) } else n.add(k)
    return n
  }), [])

  // A message over the maze. Anything asked to stay up for longer than a beat
  // gets the holding animation as well as the longer timeout — otherwise the
  // CSS faded it out on its own schedule and the extra time bought nothing.
  const say = useCallback((text, ms = 1500) => {
    setPopup({ text, k: Date.now(), long: ms >= 2200 })
    setTimeout(() => setPopup(null), ms)
  }, [])

  // --- Movement --------------------------------------------------------------
  const act = useCallback(action => {
    // Nothing moves unless the maze is actually on screen. Belt and braces
    // against a stuck repeat: the pad already cancels itself on unmount, and a
    // move that arrives anyway is dropped here rather than walking her through
    // a maze she is no longer looking at.
    if (screenRef.current !== 'game') return
    if (tipRef.current) return
    if (doorQ || encounter || encPending.current || !maze) return
    const cur = posRef.current
    const { row, col, facing } = cur

    if (action === 'turnLeft')  { setPos({ row, col, facing: (facing + 3) % 4 }); return }
    if (action === 'turnRight') { setPos({ row, col, facing: (facing + 1) % 4 }); return }

    const [dr, dc] = action === 'forward' ? FACING_DELTA[facing] : FACING_DELTA[(facing + 2) % 4]
    const nr = row + dr, nc = col + dc
    const cell = maze.grid[nr]?.[nc]
    if (cell === undefined || cell === WALL) return

    if (cell === DOOR) {
      const q = maze.dq[cellKey(nr, nc)]
      if (q) { setDoorQ(q); setDoorCell({ row: nr, col: nc }); teach('door') }
      return
    }

    // The exit gate. Finding the way out early shouldn't let her skip the maths,
    // so the last step is refused until she's banked enough points in this run.
    if (cell === END) {
      const needed = (maze.pointsRequired || 0) - runRef.current.points
      if (needed > 0) {
        say(`🔒 The way out is sealed —\nearn ${needed} more points to open it`, 3600)
        teach('gate')
        return
      }
    }

    setPos({ row: nr, col: nc, facing })
    revealFrom(maze.seen, maze.grid, nr, nc)

    const k = cellKey(nr, nc)
    if (maze.stones?.[k]) {
      // A stone's entry is what it is WORTH. Older saved mazes stored `true`,
      // which is one.
      const worth = maze.stones[k] === true ? 1 : (maze.stones[k] || 1)
      delete maze.stones[k]
      commit({ ...profile, stones: (profile.stones || 0) + worth })
      say(worth > 1 ? `✨ THE GREAT RUNE ✨\n🔮 +${worth} rune stones` : '🔮 +1 Rune Stone', worth > 1 ? 2600 : 1500)
      teach('rune')
    }

    if (cell === END) { setTimeout(() => finishMaze(), 280); return }

    // Wandering encounters fire on ordinary corridor squares only — never on the
    // exit, and never stacked on top of a door puzzle.
    steps.current += 1
    const enc = rollEncounter(encState.current, steps.current)
    if (enc) {
      // Show it arriving before the pop-up covers the maze, so the interruption
      // has a visible cause. Movement is already blocked by encPending.
      encPending.current = true
      const start = performance.now()
      setEffects(e => [...e, { kind: 'ambush', creature: enc.creature, start, dur: AMBUSH_MS }])
      setTimeout(() => {
        encPending.current = false
        setEncounter(enc)
        // What an encounter IS comes first; only once that's known is the
        // creature's clock worth a card of its own. Both are once-only, and
        // `teach` ignores whichever has already been seen.
        if (!seenTip(profileRef.current, 'encounter')) teach('encounter')
        else if (enc.kind === 'duel' && duelIsTimed(diff, profileRef.current, ops)) teach('duelTimer')
        setEffects(e => e.filter(x => x.start !== start))
      }, AMBUSH_MS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorQ, encounter, maze, profile, commit, say, teach, diff, ops])

  // The movement pad repeats on hold, so it must not capture `act` from the
  // render where the hold began — the maze can change underneath it.
  const actRef = useRef(act)
  actRef.current = act
  const onAction = useCallback(a => actRef.current(a), [])

  // --- Finish ----------------------------------------------------------------
  const finishMaze = useCallback(() => {
    setProfile(prev => {
      if (!prev) return prev
      const stats = {
        ...prev.stats,
        mazesCleared: (prev.stats?.mazesCleared || 0) + 1,
        playMs: (prev.stats?.playMs || 0) + (Date.now() - runRef.current.startedAt),
      }
      const next = { ...prev, stats }
      saveProfile(next)
      if (syncEnabled()) cloudPush(next)
      return next
    })
    setScreen('win')
  }, [])

  // --- Door answered correctly ----------------------------------------------
  const onCorrect = useCallback((ms, usedHint) => {
    const q = doorQ, cell = doorCell
    if (!q || !cell) return

    const rec = recordAnswer(profile, { ...q, hinted: usedHint }, true, ms, perks.swift)
    const earned = roundPts((q.curPts + rec.bonus) * perks.fortune)

    const before = rankFor(profile.totalPoints).rank
    const total = profile.totalPoints + earned
    const after = rankFor(total).rank

    commit({
      ...profile,
      totalPoints: total,
      facts: rec.facts,
      skill: rec.skill,
      opPlays: rec.opPlays,
      plays: rec.plays,
      stats: {
        ...profile.stats,
        doorsOpened: (profile.stats?.doorsOpened || 0) + 1,
        correct: (profile.stats?.correct || 0) + 1,
        hintsUsed: (profile.stats?.hintsUsed || 0) + (usedHint ? 1 : 0),
      },
    })
    if (after > before) setNewRank(after)

    setRun(r => ({
      ...r,
      points: r.points + earned,
      doors: r.doors + 1,
      answered: r.answered + 1,
      correct: r.correct + (q.wrongs === 0 ? 1 : 0),
      fast: r.fast + (rec.fast ? 1 : 0),
    }))

    setDoorQ(null); setDoorCell(null)
    setFlare(Date.now())
    say(`+${earned}${rec.fast ? ' ⚡QUICK!' : ''}`)

    // Let the door dissolve on screen before the grid actually opens up.
    const start = performance.now()
    setEffects(e => [...e, { kind: 'dissolve', mapX: cell.col, mapY: cell.row, start, dur: DISSOLVE_MS }])
    setTimeout(() => {
      setMaze(m => {
        if (!m) return m
        const grid = m.grid.map(r => [...r])
        grid[cell.row][cell.col] = PATH
        const dq = { ...m.dq }
        delete dq[cellKey(cell.row, cell.col)]
        revealFrom(m.seen, grid, cell.row, cell.col)
        return { ...m, grid, dq }
      })
      setPos(p => ({ ...p, row: cell.row, col: cell.col }))
      setEffects(e => e.filter(x => x.start !== start))
    }, DISSOLVE_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorQ, doorCell, profile, perks, commit, say])

  // --- Door answered wrongly ------------------------------------------------
  const onWrong = useCallback(() => {
    const cell = doorCell
    if (!cell) return
    setDoorQ(prev => {
      if (!prev) return prev
      // How much a miss costs is a perk — a forgiving form keeps more of it.
      const next = { ...prev, wrongs: prev.wrongs + 1, curPts: roundPts(prev.curPts * perks.mercy) }
      setMaze(m => m ? { ...m, dq: { ...m.dq, [cellKey(cell.row, cell.col)]: next } } : m)
      return next
    })
    setProfile(prev => {
      if (!prev) return prev
      const rec = recordAnswer(prev, doorQ, false, 0, perks.swift)
      const next = {
        ...prev,
        facts: rec.facts,
        skill: rec.skill,
        opPlays: rec.opPlays,
        plays: rec.plays,
        stats: { ...prev.stats, wrong: (prev.stats?.wrong || 0) + 1 },
      }
      saveProfile(next)
      return next
    })
    setRun(r => ({ ...r, answered: r.answered + 1 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorCell, doorQ, perks])

  /**
   * An encounter is over. Its answers are real practice, so they go through the
   * same curriculum path as door answers — the adaptive skill and the fact table
   * should not care where a question was asked.
   */
  const endEncounter = useCallback(({ outcome, earned, answers }) => {
    encPending.current = false
    setEncounter(null)
    if (!profile) return

    let next = profile
    let fastCount = 0
    for (const a of answers || []) {
      const rec = recordAnswer(next, a.q, a.correct, a.ms, perks.swift)
      if (rec.fast) fastCount += 1
      next = { ...next, facts: rec.facts, skill: rec.skill, opPlays: rec.opPlays, plays: rec.plays }
    }

    const reward = outcome === 'won' ? encounterReward(earned, perks) : { points: 0, stone: 0 }
    next = {
      ...next,
      totalPoints: next.totalPoints + reward.points,
      stones: (next.stones || 0) + reward.stone,
      stats: {
        ...next.stats,
        correct: (next.stats?.correct || 0) + (answers || []).filter(a => a.correct).length,
        wrong: (next.stats?.wrong || 0) + (answers || []).filter(a => !a.correct).length,
        encountersWon: (next.stats?.encountersWon || 0) + (outcome === 'won' ? 1 : 0),
      },
    }

    const before = rankFor(profile.totalPoints).rank
    const after = rankFor(next.totalPoints).rank
    commit(next)
    if (after > before) setNewRank(after)

    if (reward.points > 0) {
      setRun(r => ({
        ...r,
        points: r.points + reward.points,
        answered: r.answered + (answers || []).length,
        correct: r.correct + (answers || []).filter(a => a.correct).length,
        fast: r.fast + fastCount,
      }))
      setFlare(Date.now())
      say(`+${reward.points}${reward.stone ? '  🔮+1' : ''}`, 1700)
    }
  }, [profile, perks, commit, say])

  const spendStone = useCallback(() => {
    commit({ ...profile, stones: Math.max(0, (profile.stones || 0) - 1) })
  }, [profile, commit])

  const equip = useCallback(id => commit({ ...profile, equippedSkin: id }), [profile, commit])

  /**
   * Buy a form she passed over, with rune stones. The price and the three gates
   * are re-checked here rather than trusted from the button, so a stale render
   * can't hand out a free form or overdraw the runes.
   */
  const buy = useCallback(id => {
    const form = formById(id)
    const b = buyState(profile, form)
    if (!b.can) return
    commit({
      ...profile,
      stones: (profile.stones || 0) - b.cost,
      bought: [...(profile.bought || []), id],
      equippedSkin: id,
    })
    syncUp()
  }, [profile, commit, syncUp])

  /**
   * Buy a curio from the shop, and put it on straight away.
   *
   * Re-priced here rather than trusted from the button, exactly like buying a
   * robe: a stale render must not be able to hand out a free wand.
   */
  const buyTrinket = useCallback(id => {
    const tr = trinketById(id)
    const b = buyTrinketState(profile, tr)
    if (!b.can) return
    commit({
      ...profile,
      stones: (profile.stones || 0) - b.cost,
      trinkets: [...(profile.trinkets || []), id],
      wearing: [...(profile.wearing || []), id],
    })
    syncUp()
  }, [profile, commit, syncUp])

  /** Put one on or take it off. Anything she owns can be worn with anything else. */
  const wearTrinket = useCallback((id, on) => {
    if (on && !ownsTrinket(profile, id)) return
    const worn = (profile.wearing || []).filter(x => x !== id)
    commit({ ...profile, wearing: on ? [...worn, id] : worn })
  }, [profile, commit])

  const saveWizard = useCallback(id => {
    const wiz = wizardById(id)
    // On a FIRST pick she gets the colouring she was just looking at, so the
    // castle shows her the wizard she actually chose rather than that face in
    // somebody else's hair. Changing face later leaves her own colours alone.
    const appearance = profile.wizard
      ? profile.appearance
      : { ...profile.appearance, skin: wiz.skin, hairColor: wiz.hair, eyeColor: wiz.eye }
    commit({ ...profile, wizard: id, appearance })
    // Back to the castle, and the arrival effect carries her on to the nest if
    // she still needs one. One place decides the running order.
    setScreen('hub')
  }, [profile, commit])

  const saveNest = useCallback(id => {
    // Choosing a nest for the FIRST time is the first half of the Attunement,
    // so she goes straight on to the second rather than being dropped in the
    // castle and expected to find it. Changing nests later is just changing
    // nests — it does not drag her back through the ceremony.
    const arriving = !hasNest(profile) && !profile.attuned
    commit({ ...profile, nest: id })
    setScreen(arriving ? 'attune' : 'hub')
  }, [profile, commit])

  const saveLook = useCallback(look => {
    commit({ ...profile, appearance: look })
    setScreen('hub')
  }, [profile, commit])

  const choose = useCallback(id => {
    const rank = pending[0]
    commit({
      ...profile,
      chosen: { ...(profile.chosen || {}), [rank]: id },
      equippedSkin: id,
    })
    setNewRank(null)
    setScreen('hub')
  }, [pending, profile, commit])

  // --- Shell -----------------------------------------------------------------
  const form = profile ? formById(profile.equippedSkin || STARTER) : null
  const doorsLeft = maze ? Object.keys(maze.dq).length : 0

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: sans,
      position: 'relative', overflow: 'hidden', padding: 10,
    }}>
      <style>{CSS}</style>
      <StarField />

      {screen === 'login' && <Login onEnter={enter} />}

      {screen === 'pick' && profile && pending.length > 0 && (
        <SkinChoice
          rank={pending[0]} profile={profile} appearance={profile.appearance} onChoose={choose}
          points={profile.totalPoints} owed={pending.length}
          fresh={newRank === pending[0]}
        />
      )}

      {screen === 'hub' && profile && !pending.length && (
        <Hub
          profile={profile} ops={ops} diff={diff} pendingPicks={pending.length}
          onToggleOp={toggleOp} onSetDiff={setDiff}
          onStart={startGame}
          onWardrobe={() => { setScreen('wardrobe'); teach('wardrobe') }}
          onShop={() => { shopFrom.current = 'hub'; setScreen('shop') }}
          onReport={() => setScreen('report')}
          onLook={() => setScreen('look')}
          onNest={() => setScreen('nest')}
          onAttune={() => setScreen('attune')}
          onLogout={() => { setProfile(null); setScreen('login') }}
        />
      )}

      {screen === 'game' && maze && profile && (
        <GameView
          maze={maze} pos={pos} form={form} appearance={profile.appearance}
          runPoints={run.points} total={profile.totalPoints} stones={profile.stones || 0}
          doorsLeft={doorsLeft} effects={effects} gateMet={gateMet}
          showCompass={profile.settings?.showCompass}
          paused={!!doorQ || !!encounter}
          onAction={onAction}
          onExit={() => setScreen('hub')}
        />
      )}

      {screen === 'win' && profile && (
        <WinScreen
          profile={profile} run={run} newRank={newRank} form={form}
          onAgain={pending.length ? () => setScreen('pick') : startGame}
          onCastle={() => setScreen('hub')}
        />
      )}

      {screen === 'wardrobe' && profile && (
        <Wardrobe profile={profile} onEquip={equip} onBuy={buy}
          onShop={() => { shopFrom.current = 'wardrobe'; setScreen('shop') }}
          onClose={() => setScreen('hub')} />
      )}

      {screen === 'shop' && profile && (
        <Shop profile={profile} onBuy={buyTrinket} onWear={wearTrinket}
          from={shopFrom.current}
          onClose={() => setScreen(shopFrom.current)} />
      )}
      {screen === 'report' && profile && (
        <ParentReport profile={profile} onClose={() => setScreen('hub')} />
      )}
      {screen === 'nest' && profile && (
        <NestPicker
          current={profile.nest}
          onChoose={saveNest}
          onClose={hasNest(profile) ? () => setScreen('hub') : null}
        />
      )}
      {screen === 'wizard' && profile && (
        <WizardPicker
          profile={profile} form={form}
          onChoose={saveWizard}
          onClose={profile.wizard ? () => setScreen('hub') : null}
        />
      )}
      {screen === 'attune' && profile && (
        <Attunement
          profile={profile} ops={ops} form={form}
          onDone={commit}
          onCancel={() => setScreen('hub')}
        />
      )}
      {screen === 'look' && profile && (
        <LookPicker
          profile={profile}
          onSave={saveLook}
          onClose={() => setScreen('hub')}
          onNest={look => { if (look) commit({ ...profile, appearance: look }); setScreen('nest') }}
          onWizard={look => { if (look) commit({ ...profile, appearance: look }); setScreen('wizard') }}
        />
      )}

      {encounter && profile && (
        <Encounter
          kind={encounter.kind} creature={encounter.creature}
          ops={ops} diff={diff} profile={profile} form={form}
          appearance={profile.appearance}
          onDone={endEncounter}
        />
      )}

      {doorQ && profile && (
        <MathDoor
          // Keyed by the door, so a new puzzle can never inherit a half-typed
          // answer from the last one, whatever React decides to reuse.
          key={doorCell ? `${doorCell.row},${doorCell.col}` : 'door'}
          q={doorQ} stones={profile.stones || 0}
          swiftMs={perks.swift}
          bigKeypad={profile.settings?.bigKeypad}
          onCorrect={onCorrect}
          onWrong={onWrong}
          onSpendStone={spendStone}
          onStepBack={() => { setDoorQ(null); setDoorCell(null) }}
        />
      )}

      {flare > 0 && <div key={flare} className="flare" />}
      {tip && <Coach id={tip} onClose={learned} />}

      {popup && screen === 'game' && (
        <div key={popup.k} className={popup.long ? 'popLong' : 'pop'} style={{
          position: 'fixed', left: '50%', top: '42%', transform: 'translateX(-50%)',
          zIndex: 70, color: C.goldHi, fontFamily: serif, fontWeight: 900,
          fontSize: popup.long ? 21 : 28, lineHeight: 1.35, textAlign: 'center',
          textShadow: `0 0 22px ${C.gold}`,
          whiteSpace: 'pre-line', maxWidth: '86vw',
          background: popup.long ? 'rgba(8,6,28,.78)' : 'none',
          borderRadius: popup.long ? 14 : 0,
          padding: popup.long ? '10px 16px' : 0,
          border: popup.long ? `1.5px solid ${C.gold}66` : 'none',
        }}>{popup.text}</div>
      )}
    </div>
  )
}
