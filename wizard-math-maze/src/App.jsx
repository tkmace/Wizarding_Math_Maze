import { useState, useRef, useCallback, useEffect } from 'react'
import { genMaze, revealFrom, WALL, PATH, DOOR, END, FACING_DELTA, cellKey } from './game/maze.js'
import { recordAnswer } from './game/curriculum.js'
import { to5 } from './game/math.js'
import { getUnlocked } from './game/skins.js'
import { skinById } from './game/skins.js'
import { saveProfile } from './store/storage.js'
import { syncEnabled, push as cloudPush, pull as cloudPull, mergeProfiles } from './store/sync.js'
import { CSS, C, sans, serif } from './ui/theme.js'
import StarField from './ui/StarField.jsx'
import Login from './ui/Login.jsx'
import Hub from './ui/Hub.jsx'
import GameView from './ui/GameView.jsx'
import MathDoor from './ui/MathDoor.jsx'
import Wardrobe from './ui/Wardrobe.jsx'
import WinScreen from './ui/WinScreen.jsx'
import ParentReport from './ui/ParentReport.jsx'
import ScrollPanel from './ui/ScrollPanel.jsx'

const DISSOLVE_MS = 620
const blankRun = () => ({ points: 0, doors: 0, answered: 0, correct: 0, fast: 0, startedAt: Date.now() })

export default function App() {
  const [profile, setProfile] = useState(null)
  const [screen, setScreen] = useState('login')
  const [ops, setOps] = useState(new Set(['addition']))
  const [diff, setDiff] = useState('apprentice')

  const [maze, setMaze] = useState(null)
  const [pos, setPos] = useState({ row: 1, col: 1, facing: 0 })
  const posRef = useRef(pos)
  posRef.current = pos

  const [doorQ, setDoorQ] = useState(null)
  const [doorCell, setDoorCell] = useState(null)
  const [run, setRun] = useState(blankRun)
  const [effects, setEffects] = useState([])
  const [popup, setPopup] = useState(null)
  const [flare, setFlare] = useState(0)
  const [unlocked, setUnlocked] = useState(null)
  const [newSkin, setNewSkin] = useState(false)
  const mazeSeq = useRef(0)

  // ── Persist: every change to the profile is written straight through to local
  //    storage, so closing the tab mid-maze never loses points she just earned.
  //    The cloud copy is NOT written here — that would be one request per
  //    correct answer. See `syncUp` for when it goes up.
  const commit = useCallback(next => {
    setProfile(next)
    saveProfile(next)
    return next
  }, [])

  // Callbacks below fire from timers and event listeners, so they read the
  // profile through a ref rather than closing over it.
  const profileRef = useRef(null)
  profileRef.current = profile

  /** Mirror the current profile to the cloud. Best-effort, never awaited. */
  const syncUp = useCallback(() => {
    const p = profileRef.current
    if (p && syncEnabled()) cloudPush(p)
  }, [])

  const enter = useCallback(p => {
    setProfile(p)
    setOps(new Set(p.settings?.ops?.length ? p.settings.ops : ['addition']))
    setDiff(p.settings?.diff || 'apprentice')
    setScreen('hub')
  }, [])

  // Push at the natural resting points — back at the castle, and when the tab
  // goes away. Between those, local storage has already got everything.
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

  // Keep the chosen operations/difficulty on the profile so they survive a reload.
  useEffect(() => {
    if (!profile) return
    const settings = { ...profile.settings, ops: [...ops], diff }
    if (JSON.stringify(settings) === JSON.stringify(profile.settings)) return
    commit({ ...profile, settings })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops, diff])

  // ── Start a maze ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const m = genMaze(ops, diff, profile)
    m.id = ++mazeSeq.current
    setMaze(m)
    setPos({ row: 1, col: 1, facing: 0 })
    setRun(blankRun())
    setDoorQ(null); setDoorCell(null); setEffects([]); setUnlocked(null)
    setScreen('game')
  }, [ops, diff, profile])

  const toggleOp = useCallback(k => setOps(prev => {
    const n = new Set(prev)
    if (n.has(k)) { if (n.size > 1) n.delete(k) } else n.add(k)
    return n
  }), [])

  // ── Movement ────────────────────────────────────────────────────────────────
  const act = useCallback(action => {
    if (doorQ || !maze) return
    const cur = posRef.current
    let { row, col, facing } = cur

    if (action === 'turnLeft')  { setPos({ row, col, facing: (facing + 3) % 4 }); return }
    if (action === 'turnRight') { setPos({ row, col, facing: (facing + 1) % 4 }); return }

    const [dr, dc] = action === 'forward' ? FACING_DELTA[facing] : FACING_DELTA[(facing + 2) % 4]
    const nr = row + dr, nc = col + dc
    const cell = maze.grid[nr]?.[nc]
    if (cell === undefined || cell === WALL) return

    if (cell === DOOR) {
      const q = maze.dq[cellKey(nr, nc)]
      if (q) { setDoorQ(q); setDoorCell({ row: nr, col: nc }) }
      return
    }

    setPos({ row: nr, col: nc, facing })
    revealFrom(maze.seen, maze.grid, nr, nc)

    // Rune stone pickup
    const k = cellKey(nr, nc)
    if (maze.stones?.[k]) {
      delete maze.stones[k]
      commit({ ...profile, stones: (profile.stones || 0) + 1 })
      setPopup({ text: '🔮 +1 Rune Stone', k: Date.now() })
      setTimeout(() => setPopup(null), 1500)
    }

    if (cell === END) setTimeout(() => finishMaze(), 280)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorQ, maze, profile, commit])

  // The movement pad repeats on hold, so it must not capture `act` from the
  // render where the hold began — the maze can change underneath it.
  const actRef = useRef(act)
  actRef.current = act
  const onAction = useCallback(a => actRef.current(a), [])

  // ── Finish ──────────────────────────────────────────────────────────────────
  const finishMaze = useCallback(() => {
    setProfile(prev => {
      if (!prev) return prev
      const stats = {
        ...prev.stats,
        mazesCleared: (prev.stats?.mazesCleared || 0) + 1,
        playMs: (prev.stats?.playMs || 0) + (Date.now() - run.startedAt),
      }
      const next = { ...prev, stats }
      saveProfile(next)
      if (syncEnabled()) cloudPush(next)
      return next
    })
    setScreen('win')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.startedAt])

  // ── Door answered correctly ─────────────────────────────────────────────────
  const onCorrect = useCallback((ms, usedHint) => {
    const q = doorQ, cell = doorCell
    if (!q || !cell) return

    const rec = recordAnswer({ ...profile, settings: { ...profile.settings, diff } },
                             { ...q, hinted: usedHint }, true, ms)
    const earned = q.curPts + rec.bonus
    const before = getUnlocked(profile.totalPoints).map(s => s.id)
    const total = profile.totalPoints + earned
    const justUnlocked = getUnlocked(total).find(s => !before.includes(s.id))

    commit({
      ...profile,
      totalPoints: total,
      facts: rec.facts,
      plays: rec.plays,
      stats: {
        ...profile.stats,
        doorsOpened: (profile.stats?.doorsOpened || 0) + 1,
        correct: (profile.stats?.correct || 0) + 1,
        hintsUsed: (profile.stats?.hintsUsed || 0) + (usedHint ? 1 : 0),
      },
    })
    if (justUnlocked) { setUnlocked(justUnlocked.id); setNewSkin(true) }

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
    setPopup({ text: `+${earned}${rec.fast ? ' ⚡QUICK!' : ''}`, k: Date.now() })
    setTimeout(() => setPopup(null), 1500)

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
  }, [doorQ, doorCell, profile, diff, commit])

  // ── Door answered wrongly ───────────────────────────────────────────────────
  const onWrong = useCallback(() => {
    const cell = doorCell
    if (!cell) return
    setDoorQ(prev => {
      if (!prev) return prev
      const next = { ...prev, wrongs: prev.wrongs + 1, curPts: to5(prev.curPts * 0.5) }
      setMaze(m => m ? { ...m, dq: { ...m.dq, [cellKey(cell.row, cell.col)]: next } } : m)
      return next
    })
    setProfile(prev => {
      if (!prev) return prev
      const next = { ...prev, stats: { ...prev.stats, wrong: (prev.stats?.wrong || 0) + 1 } }
      saveProfile(next)
      return next
    })
    setRun(r => ({ ...r, answered: r.answered + 1 }))
  }, [doorCell])

  const spendStone = useCallback(() => {
    commit({ ...profile, stones: Math.max(0, (profile.stones || 0) - 1) })
  }, [profile, commit])

  const equip = useCallback(id => {
    commit({ ...profile, equippedSkin: id })
  }, [profile, commit])

  // ── Shell ───────────────────────────────────────────────────────────────────
  const skin = profile ? skinById(profile.equippedSkin) : null
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

      {screen === 'hub' && profile && (
        <Hub
          profile={profile} ops={ops} diff={diff} newSkin={newSkin}
          onToggleOp={toggleOp} onSetDiff={setDiff}
          onStart={startGame}
          onWardrobe={() => { setNewSkin(false); setScreen('wardrobe') }}
          onReport={() => setScreen('report')}
          onScroll={() => setScreen('scroll')}
          onLogout={() => { setProfile(null); setScreen('login') }}
        />
      )}

      {screen === 'game' && maze && profile && (
        <GameView
          maze={maze} pos={pos} skin={skin}
          runPoints={run.points} total={profile.totalPoints} stones={profile.stones || 0}
          doorsLeft={doorsLeft} effects={effects}
          showCompass={profile.settings?.showCompass}
          paused={!!doorQ}
          onAction={onAction}
          onExit={() => setScreen('hub')}
        />
      )}

      {screen === 'win' && profile && (
        <WinScreen
          profile={profile} run={run} unlocked={unlocked}
          onAgain={startGame} onCastle={() => setScreen('hub')}
        />
      )}

      {screen === 'wardrobe' && profile && (
        <Wardrobe profile={profile} onEquip={equip} onClose={() => setScreen('hub')} />
      )}
      {screen === 'report' && profile && (
        <ParentReport profile={profile} onClose={() => setScreen('hub')} />
      )}
      {screen === 'scroll' && profile && (
        <ScrollPanel profile={profile} onClose={() => setScreen('hub')} />
      )}

      {/* Door puzzle sits over the top of the maze */}
      {doorQ && profile && (
        <MathDoor
          q={doorQ} diff={diff} stones={profile.stones || 0}
          bigKeypad={profile.settings?.bigKeypad}
          onCorrect={onCorrect}
          onWrong={onWrong}
          onSpendStone={spendStone}
          onStepBack={() => { setDoorQ(null); setDoorCell(null) }}
        />
      )}

      {/* Transient feedback */}
      {flare > 0 && <div key={flare} className="flare" />}
      {popup && screen === 'game' && (
        <div key={popup.k} className="pop" style={{
          position: 'fixed', left: '50%', top: '46%', transform: 'translateX(-50%)',
          zIndex: 70, color: C.goldHi, fontFamily: serif, fontWeight: 900,
          fontSize: 30, textShadow: `0 0 22px ${C.gold}`, whiteSpace: 'nowrap',
        }}>{popup.text}</div>
      )}
    </div>
  )
}
