import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ─── Cell types ────────────────────────────────────────────────
const WALL = 0, PATH = 1, DOOR = 2, START = 3, END = 4

// ─── All wizard skins ──────────────────────────────────────────
const ALL_SKINS = [
  { id: 'apprentice', threshold: 0,    emoji: '🧙‍♂️', title: 'Apprentice',    wand: '🪄',  color: '#a0a0cc', desc: 'Your journey begins...' },
  { id: 'mage',       threshold: 80,   emoji: '🧙',   title: 'Mage',          wand: '⚡',  color: '#7ee8a2', desc: 'The arcane arts awaken!' },
  { id: 'enchanter',  threshold: 250,  emoji: '🧝',   title: 'Enchanter',     wand: '🔮',  color: '#74b9ff', desc: 'Reality bends to your will.' },
  { id: 'sorceress',  threshold: 600,  emoji: '🧝‍♀️', title: 'Sorceress',     wand: '🌙',  color: '#f78fb3', desc: 'The stars know your name.' },
  { id: 'archmage',   threshold: 1400, emoji: '🧛',   title: 'Archmage',      wand: '🌟',  color: '#f9ca74', desc: 'Mastery over all elements!' },
  { id: 'legendary',  threshold: 3000, emoji: '👑',   title: 'Grand Wizard',  wand: '☄️',  color: '#ff6bff', desc: 'A legend of the ancient ages.' },
]

function getUnlockedSkins(pts) {
  return ALL_SKINS.filter(s => pts >= s.threshold)
}
function getNextSkin(pts) {
  return ALL_SKINS.find(s => s.threshold > pts) || null
}

// ─── 5 difficulty levels ───────────────────────────────────────
const DIFFICULTIES = [
  { key: 'novice',      label: 'Novice',       icon: '🌿', color: '#b8f0c0', mult: 0.7,
    desc: 'Small numbers, easy spells',
    ranges: { add:[1,8], sub:[3,12], mul:[1,4], div:[1,4] } },
  { key: 'apprentice',  label: 'Apprentice',   icon: '🌱', color: '#7ee8a2', mult: 1.0,
    desc: 'Classic starter challenge',
    ranges: { add:[1,15], sub:[5,20], mul:[1,6], div:[1,6] } },
  { key: 'sorcerer',    label: 'Sorcerer',     icon: '🔥', color: '#f9ca74', mult: 1.6,
    desc: 'Numbers get serious',
    ranges: { add:[5,40], sub:[10,50], mul:[2,10], div:[2,10] } },
  { key: 'archmage',    label: 'Archmage',     icon: '⚡', color: '#f78fb3', mult: 2.5,
    desc: 'Large numbers, big rewards',
    ranges: { add:[10,80], sub:[20,100], mul:[3,12], div:[3,12] } },
  { key: 'legendary',   label: 'Legendary',    icon: '💀', color: '#ff6bff', mult: 4.0,
    desc: 'Only the bravest dare enter',
    ranges: { add:[50,500], sub:[100,999], mul:[6,20], div:[6,15] } },
]

// ─── Variable point calculation (the core of #1) ───────────────
// Points reflect ACTUAL equation difficulty, not just difficulty level
function calcPoints(op, a, b, answer, diffMult) {
  let base
  switch (op) {
    case 'addition': {
      const mx = Math.max(a, b)
      base = mx <= 8 ? 5 : mx <= 15 ? 9 : mx <= 30 ? 14 : mx <= 60 ? 20 : 28
      break
    }
    case 'subtraction': {
      const diff = a - b, mx = a
      base = mx <= 10 ? 6 : mx <= 20 ? 10 : mx <= 50 ? 16 : mx <= 100 ? 22 : 30
      if (diff < 3) base = Math.round(base * 0.85) // trivial differences get slight penalty
      break
    }
    case 'multiplication': {
      base = answer <= 20 ? 10 : answer <= 50 ? 16 : answer <= 100 ? 24 : answer <= 200 ? 34 : 45
      // Bonus for harder factor combos (e.g. 7×8 harder than 2×10)
      const minF = Math.min(a, b)
      if (minF >= 6) base = Math.round(base * 1.15)
      if (minF >= 8) base = Math.round(base * 1.25)
      break
    }
    case 'division': {
      const prod = b * answer
      base = prod <= 20 ? 10 : prod <= 50 ? 16 : prod <= 100 ? 24 : prod <= 200 ? 34 : 45
      if (b >= 6) base = Math.round(base * 1.15)
      if (b >= 9) base = Math.round(base * 1.2)
      break
    }
    default: base = 8
  }
  // Round to nearest 5 so it looks clean on the door badge
  const raw = Math.round(base * diffMult)
  return Math.max(5, Math.round(raw / 5) * 5)
}

// ─── Question generator ─────────────────────────────────────────
function generateQuestion(operations, diffKey) {
  const diff = DIFFICULTIES.find(d => d.key === diffKey) || DIFFICULTIES[1]
  const ops = [...operations]
  const op = ops[Math.floor(Math.random() * ops.length)]
  const { ranges, mult } = diff
  const rand = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo
  let a, b, answer, display, emoji

  switch (op) {
    case 'addition':
      a = rand(ranges.add[0], ranges.add[1])
      b = rand(ranges.add[0], ranges.add[1])
      answer = a + b; display = `${a} + ${b}`; emoji = '➕'
      break
    case 'subtraction':
      a = rand(ranges.sub[0], ranges.sub[1])
      b = rand(1, a)
      answer = a - b; display = `${a} − ${b}`; emoji = '✨'
      break
    case 'multiplication':
      a = rand(ranges.mul[0], ranges.mul[1])
      b = rand(ranges.mul[0], ranges.mul[1])
      answer = a * b; display = `${a} × ${b}`; emoji = '⭐'
      break
    case 'division':
      b = rand(ranges.div[0], ranges.div[1])
      answer = rand(1, ranges.div[1])
      a = b * answer
      display = `${a} ÷ ${b}`; emoji = '🔮'
      break
    default:
      a = rand(1,10); b = rand(1,10); answer = a+b; display=`${a}+${b}`; emoji='✨'
  }

  const points = calcPoints(op, a, b, answer, mult)
  return { display, answer, emoji, op, points }
}

// ─── Maze generator ─────────────────────────────────────────────
function generateMaze(operations, diffKey) {
  const ROOMS_R = 4, ROOMS_C = 4
  const H = ROOMS_R * 2 + 1, W = ROOMS_C * 2 + 1
  const grid = Array.from({ length: H }, () => Array(W).fill(WALL))

  for (let r = 0; r < ROOMS_R; r++)
    for (let c = 0; c < ROOMS_C; c++)
      grid[r*2+1][c*2+1] = PATH

  const visited = Array.from({ length: ROOMS_R }, () => Array(ROOMS_C).fill(false))
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]]
  function carve(r, c) {
    visited[r][c] = true
    for (const [dr, dc] of [...dirs].sort(() => Math.random() - 0.5)) {
      const nr = r+dr, nc = c+dc
      if (nr>=0 && nr<ROOMS_R && nc>=0 && nc<ROOMS_C && !visited[nr][nc]) {
        grid[r*2+1+dr][c*2+1+dc] = PATH
        carve(nr, nc)
      }
    }
  }
  carve(0, 0)

  // Extra passages → branching routes
  let extras = Math.floor(ROOMS_R * ROOMS_C * 0.3), attempts = 0
  while (extras > 0 && attempts < 400) {
    const r = 1 + Math.floor(Math.random() * (H-2))
    const c = 1 + Math.floor(Math.random() * (W-2))
    if (grid[r][c] === WALL) {
      const h = r%2===1 && c%2===0 && grid[r][c-1]===PATH && grid[r][c+1]===PATH
      const v = r%2===0 && c%2===1 && grid[r-1][c]===PATH && grid[r+1][c]===PATH
      if (h || v) { grid[r][c] = PATH; extras-- }
    }
    attempts++
  }

  grid[1][1] = START
  grid[H-2][W-2] = END

  // Scatter doors — pre-generate questions so points show on tile
  const pathCells = []
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++)
      if (grid[r][c] === PATH && !(r<=2 && c<=2) && !(r>=H-3 && c>=W-3))
        pathCells.push([r, c])
  pathCells.sort(() => Math.random() - 0.5)
  const numDoors = 3 + Math.floor(Math.random() * 3)

  const doorQuestions = {} // key = "row,col"
  for (const [r, c] of pathCells.slice(0, numDoors)) {
    grid[r][c] = DOOR
    const q = generateQuestion(operations, diffKey)
    doorQuestions[`${r},${c}`] = q
  }

  return { grid, doorQuestions }
}

// ─── Sparkle burst ─────────────────────────────────────────────
const SPARKLE_SHAPES = ['✨','⭐','🌟','💫','✦','·']
const SPARKLE_COLORS = ['#f9ca74','#c8a4ff','#7ee8a2','#f78fb3','#74b9ff','#fff']
function SparkleBlast({ onDone, big = false }) {
  const n = big ? 40 : 28
  const particles = useRef(Array.from({ length: n }, (_, i) => ({
    id: i,
    angle: (i/n)*360 + Math.random()*13,
    dist: (big ? 80 : 55) + Math.random() * (big ? 120 : 80),
    size: (big ? 16 : 12) + Math.random() * 12,
    delay: Math.random() * 0.15,
    shape: SPARKLE_SHAPES[Math.floor(Math.random() * SPARKLE_SHAPES.length)],
  }))).current
  useEffect(() => { const t = setTimeout(onDone, big ? 1200 : 900); return () => clearTimeout(t) }, [onDone, big])
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:50, overflow:'visible' }}>
      <style>{`@keyframes sfly{0%{opacity:1;transform:translate(-50%,-50%) translate(0,0) scale(1.3);}100%{opacity:0;transform:translate(-50%,-50%) translate(var(--dx),var(--dy)) scale(0.1);}}`}</style>
      {particles.map(p => {
        const rad = p.angle * Math.PI / 180
        return (
          <div key={p.id} style={{
            position:'absolute', left:'50%', top:'50%', fontSize:p.size, lineHeight:1,
            '--dx':`${Math.cos(rad)*p.dist}px`, '--dy':`${Math.sin(rad)*p.dist}px`,
            animation:`sfly ${big?1.1:0.85}s ${p.delay}s ease-out both`,
          }}>{p.shape}</div>
        )
      })}
    </div>
  )
}

// ─── Background stars ───────────────────────────────────────────
const BG_STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i, x: Math.random()*100, y: Math.random()*100,
  size: Math.random()*2.5+0.5, delay: Math.random()*4, dur: Math.random()*2+2,
}))

const OP_OPTIONS = [
  { key:'addition',       label:'Addition',       icon:'➕', color:'#7ee8a2' },
  { key:'subtraction',    label:'Subtraction',    icon:'−',  color:'#f9ca74' },
  { key:'multiplication', label:'Multiplication', icon:'×',  color:'#f78fb3' },
  { key:'division',       label:'Division',       icon:'÷',  color:'#74b9ff' },
]

// ─── Skin Shop component ────────────────────────────────────────
function SkinShop({ totalPoints, equippedId, onEquip, onClose, newlyUnlocked }) {
  const unlocked = getUnlockedSkins(totalPoints)
  const nextSkin = getNextSkin(totalPoints)
  return (
    <div style={{
      position:'fixed', inset:0, background:'#000000b8',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:400, backdropFilter:'blur(8px)', padding:16,
    }}>
      <div className="appear" style={{
        background:'linear-gradient(160deg,#100d3a,#1a1260)',
        border:'2px solid #c8a4ff', borderRadius:24,
        padding:'28px 24px', maxWidth:520, width:'100%',
        boxShadow:'0 0 80px #c8a4ff44, 0 24px 80px #00000090',
        maxHeight:'90vh', overflowY:'auto',
      }}>
        {newlyUnlocked && (
          <div style={{
            background:'linear-gradient(90deg,#c8a4ff22,#f9ca7422)',
            border:'1px solid #f9ca74', borderRadius:10,
            padding:'8px 16px', marginBottom:16, textAlign:'center',
            color:'#f9ca74', fontFamily:"'Cinzel',serif", fontSize:13, fontWeight:700,
          }}>
            ✨ New wizard unlocked! Pick your look! ✨
          </div>
        )}
        <h2 style={{
          fontFamily:"'Cinzel',serif", color:'#c8a4ff', fontSize:20,
          fontWeight:900, textAlign:'center', marginBottom:6, letterSpacing:1,
        }}>🧙 Wizard Wardrobe</h2>
        <p style={{ color:'#5050a0', fontSize:12, textAlign:'center', marginBottom:18 }}>
          Choose your wizard look — you've earned it!
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {ALL_SKINS.map(skin => {
            const owned  = totalPoints >= skin.threshold
            const active = skin.id === equippedId
            return (
              <button key={skin.id} onClick={() => owned && onEquip(skin.id)}
                style={{
                  padding:'14px 10px', borderRadius:14, textAlign:'center',
                  border:`2px solid ${active ? skin.color : owned ? skin.color+'66' : '#1e1e48'}`,
                  background: active ? `${skin.color}22` : owned ? '#141440' : '#0d0d2a',
                  cursor: owned ? 'pointer' : 'default',
                  opacity: owned ? 1 : 0.45,
                  transition:'all .2s', position:'relative',
                }}
              >
                {active && (
                  <div style={{
                    position:'absolute', top:-8, right:-8,
                    background:'#f9ca74', color:'#180a00',
                    borderRadius:999, padding:'2px 8px',
                    fontSize:9, fontWeight:900, fontFamily:"'Cinzel',serif",
                  }}>EQUIPPED</div>
                )}
                {!owned && (
                  <div style={{
                    position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)',
                    background:'#1e1e50', border:'1px solid #3a3a70',
                    color:'#5050a0', borderRadius:999, padding:'2px 10px',
                    fontSize:9, fontWeight:700,
                  }}>🔒 {skin.threshold} pts</div>
                )}
                <div style={{ fontSize:36, marginBottom:4 }}>{skin.emoji}</div>
                <div style={{
                  fontFamily:"'Cinzel',serif", color: owned ? skin.color : '#3a3a70',
                  fontWeight:700, fontSize:13, marginBottom:2,
                }}>{skin.title}</div>
                <div style={{ fontSize:20, marginBottom:4 }}>{skin.wand}</div>
                <div style={{ color: owned ? '#6060a0' : '#2a2a50', fontSize:10 }}>{skin.desc}</div>
              </button>
            )
          })}
        </div>

        {nextSkin && (
          <div style={{
            marginTop:16, padding:'10px 16px',
            background:'#0d0d28', border:'1px solid #2a2a50', borderRadius:10,
            color:'#4040a0', fontSize:11, textAlign:'center',
          }}>
            Next unlock: {nextSkin.emoji} <strong style={{color:nextSkin.color}}>{nextSkin.title}</strong> at {nextSkin.threshold} pts
            ({nextSkin.threshold - totalPoints} pts away)
          </div>
        )}

        <button className="btn-hover" onClick={onClose} style={{
          marginTop:16, width:'100%', padding:'12px',
          borderRadius:12, border:'none',
          background:'linear-gradient(135deg,#c8a4ff,#9b59b6)',
          color:'#100d3a', fontFamily:"'Cinzel',serif",
          fontWeight:900, fontSize:15, cursor:'pointer',
        }}>Close Wardrobe ✕</button>
      </div>
    </div>
  )
}

// ─── Main CSS ───────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Nunito:wght@400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#080820;-webkit-tap-highlight-color:transparent;}
  @keyframes twinkle{0%,100%{opacity:.15;transform:scale(1);}50%{opacity:1;transform:scale(1.4);}}
  @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}
  @keyframes pulse-door{
    0%,100%{box-shadow:0 0 8px #f9ca74,0 0 18px #f9ca74aa;}
    50%{box-shadow:0 0 16px #f9ca74,0 0 40px #f9ca74aa,0 0 65px #f9ca7440;}
  }
  @keyframes shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-9px);}40%{transform:translateX(9px);}60%{transform:translateX(-7px);}80%{transform:translateX(7px);}}
  @keyframes appear{from{opacity:0;transform:scale(.7) translateY(18px);}to{opacity:1;transform:scale(1) translateY(0);}}
  @keyframes victory{0%{opacity:0;transform:scale(.5);}60%{opacity:1;transform:scale(1.08);}100%{opacity:1;transform:scale(1);}}
  @keyframes slideup{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}
  .star{position:absolute;border-radius:50%;background:#fff;animation:twinkle var(--dur) var(--delay) infinite ease-in-out;}
  .wizard-float{animation:float 3s ease-in-out infinite;display:inline-block;}
  .door-pulse{animation:pulse-door 1.6s ease-in-out infinite;}
  .shake{animation:shake .5s ease-in-out;}
  .appear{animation:appear .4s ease-out;}
  .victory-anim{animation:victory .6s ease-out;}
  .slideup{animation:slideup .4s ease-out;}
  .btn-hover:hover{transform:translateY(-2px);filter:brightness(1.18);transition:all .14s;}
  .btn-hover:active{transform:translateY(1px);}
  input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
  input[type=number]{-moz-appearance:textfield;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:#0d0d30;}
  ::-webkit-scrollbar-thumb{background:#3a3a70;border-radius:4px;}
`

// ══════════════════════════════════════════════════════════════════
export default function WizardMathMaze() {
  const [screen, setScreen]             = useState('start')
  const [operations, setOperations]     = useState(new Set(['addition']))
  const [difficulty, setDifficulty]     = useState('apprentice')
  const [mazeData, setMazeData]         = useState(null)
  const [playerPos, setPlayerPos]       = useState({ row:1, col:1 })

  // Math modal
  const [showMath, setShowMath]         = useState(false)
  const [question, setQuestion]         = useState(null)
  const [pendingMove, setPendingMove]   = useState(null)
  const [answer, setAnswer]             = useState('')
  const [wrong, setWrong]               = useState(false)

  // Scoring
  const [sessionScore, setSessionScore] = useState(0)
  const [totalPoints, setTotalPoints]   = useState(0)

  // Skin system
  const [equippedSkinId, setEquippedSkinId] = useState('apprentice')
  const [showShop, setShowShop]             = useState(false)
  const [shopNewlyUnlocked, setShopNewlyUnlocked] = useState(false)

  // FX
  const [showSparkle, setShowSparkle]   = useState(false)
  const [pointsPopup, setPointsPopup]   = useState(null) // {value, key}

  // Responsive cell size
  const [cellSize, setCellSize] = useState(58)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight
      const available = Math.min(w - 48, h - 300, 520)
      setCellSize(Math.max(42, Math.min(66, Math.floor(available / 9))))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const inputRef = useRef(null)
  const equippedSkin = ALL_SKINS.find(s => s.id === equippedSkinId) || ALL_SKINS[0]
  const nextSkin = getNextSkin(totalPoints)
  const prevPtsRef = useRef(totalPoints)

  const progressPct = useMemo(() => {
    const cur = ALL_SKINS.slice().reverse().find(s => totalPoints >= s.threshold) || ALL_SKINS[0]
    const nxt = getNextSkin(totalPoints)
    if (!nxt) return 100
    return Math.min(100, Math.round((totalPoints - cur.threshold) / (nxt.threshold - cur.threshold) * 100))
  }, [totalPoints])

  const startGame = () => {
    const m = generateMaze(operations, difficulty)
    setMazeData(m)
    setPlayerPos({ row:1, col:1 })
    setSessionScore(0)
    setScreen('game')
  }

  const toggleOp = (key) => {
    setOperations(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) }
      else next.add(key)
      return next
    })
  }

  const tryMove = useCallback((drow, dcol) => {
    if (showMath || showSparkle || !mazeData) return
    const nr = playerPos.row + drow, nc = playerPos.col + dcol
    const { grid, doorQuestions } = mazeData
    if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) return
    const cell = grid[nr][nc]
    if (cell === WALL) return
    if (cell === DOOR) {
      const q = doorQuestions[`${nr},${nc}`] || generateQuestion(operations, difficulty)
      setQuestion(q)
      setPendingMove({ row:nr, col:nc })
      setAnswer(''); setWrong(false); setShowMath(true)
      return
    }
    setPlayerPos({ row:nr, col:nc })
    if (cell === END) setTimeout(() => setScreen('win'), 300)
  }, [mazeData, playerPos, showMath, showSparkle, operations, difficulty])

  useEffect(() => {
    if (screen !== 'game') return
    const handler = (e) => {
      const map = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] }
      const move = map[e.key]
      if (move) { e.preventDefault(); tryMove(...move) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, tryMove])

  useEffect(() => {
    if (showMath && inputRef.current) setTimeout(() => inputRef.current?.focus(), 130)
  }, [showMath])

  const submitAnswer = () => {
    const num = parseInt(answer, 10)
    if (!isNaN(num) && num === question.answer) {
      const { grid, doorQuestions } = mazeData
      const newGrid = grid.map(r => [...r])
      newGrid[pendingMove.row][pendingMove.col] = PATH
      const newDoorQ = { ...doorQuestions }
      delete newDoorQ[`${pendingMove.row},${pendingMove.col}`]
      setMazeData({ grid: newGrid, doorQuestions: newDoorQ })

      const earned = question.points
      setSessionScore(s => s + earned)
      const prevTotal = totalPoints
      const newTotal  = prevTotal + earned
      setTotalPoints(newTotal)

      // Check for new skin unlock
      const prevUnlocked = getUnlockedSkins(prevTotal).map(s=>s.id)
      const newUnlocked  = getUnlockedSkins(newTotal).map(s=>s.id)
      const justUnlocked = newUnlocked.find(id => !prevUnlocked.includes(id))
      if (justUnlocked) {
        setTimeout(() => {
          setShopNewlyUnlocked(true)
          setShowShop(true)
        }, 900)
      }

      setShowMath(false)
      setPlayerPos(pendingMove)
      setShowSparkle(true)

      // Floating +pts popup
      setPointsPopup({ value: earned, key: Date.now() })
      setTimeout(() => setPointsPopup(null), 1400)

      if (newGrid[pendingMove.row][pendingMove.col] === END)
        setTimeout(() => setScreen('win'), 1100)
    } else {
      setWrong(true); setAnswer('')
      setTimeout(() => setWrong(false), 700)
    }
  }

  const diffInfo = DIFFICULTIES.find(d => d.key === difficulty) || DIFFICULTIES[1]

  if (!mazeData && screen === 'game') return null
  const { grid = [], doorQuestions = {} } = mazeData || {}
  const rows = grid.length, cols = grid[0]?.length || 0
  const CELL = cellSize

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:'100dvh', background:'#080820',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily:"'Nunito',sans-serif", position:'relative', overflow:'hidden', padding:16,
    }}>
      <style>{CSS}</style>
      {BG_STARS.map(s => (
        <div key={s.id} className="star" style={{
          left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size,
          '--dur':`${s.dur}s`, '--delay':`${s.delay}s`,
        }}/>
      ))}

      {/* ════════ START SCREEN ════════ */}
      {screen === 'start' && (
        <div className="appear" style={{ textAlign:'center', zIndex:10, maxWidth:600, width:'100%' }}>
          <div style={{ fontSize:70, marginBottom:4 }} className="wizard-float">{equippedSkin.emoji}</div>
          <h1 style={{
            fontFamily:"'Cinzel',serif", fontSize:'clamp(22px,5vw,36px)', fontWeight:900,
            color:'#f9ca74', letterSpacing:2, textShadow:'0 0 20px #f9ca74aa,0 0 50px #f9ca7440',
            marginBottom:4,
          }}>Wizard Math Maze</h1>

          {/* Lifetime points bar */}
          <div style={{
            background:'#0e0e35', border:'1px solid #252558', borderRadius:16,
            padding:'12px 20px', margin:'12px auto 16px',
            display:'inline-flex', alignItems:'center', gap:14, maxWidth:400, width:'100%',
          }}>
            <span style={{ fontSize:28 }}>{equippedSkin.wand}</span>
            <div style={{ flex:1, textAlign:'left' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontFamily:"'Cinzel',serif", color:equippedSkin.color, fontWeight:700, fontSize:13 }}>
                  {equippedSkin.title}
                </span>
                <span style={{ fontFamily:"'Cinzel',serif", color:'#f9ca74', fontWeight:900, fontSize:14 }}>
                  ⭐ {totalPoints} pts
                </span>
              </div>
              <div style={{ height:6, background:'#1a1a42', borderRadius:4, marginTop:6 }}>
                <div style={{
                  height:'100%', borderRadius:4,
                  background:`linear-gradient(90deg,${equippedSkin.color},${nextSkin?.color||'#f9ca74'})`,
                  width:`${progressPct}%`, transition:'width .6s ease',
                }}/>
              </div>
              <div style={{ fontSize:10, color:'#404080', marginTop:3 }}>
                {nextSkin ? `${nextSkin.threshold-totalPoints} pts to ${nextSkin.emoji} ${nextSkin.title}` : '🌟 Maximum rank!'}
              </div>
            </div>
            <button className="btn-hover" onClick={() => { setShopNewlyUnlocked(false); setShowShop(true) }} style={{
              background:'#1a1a50', border:'1px solid #4040a0', borderRadius:10,
              padding:'6px 10px', color:'#c8a4ff', cursor:'pointer',
              fontSize:11, fontFamily:"'Cinzel',serif", fontWeight:700, whiteSpace:'nowrap',
            }}>👗 Wardrobe</button>
          </div>

          {/* Op checkboxes */}
          <div style={{ marginBottom:16 }}>
            <div style={{ color:'#c8a4ff', fontFamily:"'Cinzel',serif", fontSize:11, marginBottom:9, letterSpacing:2 }}>
              CHOOSE YOUR SPELLS
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
              {OP_OPTIONS.map(({ key, label, icon, color }) => {
                const on = operations.has(key)
                return (
                  <button key={key} className="btn-hover" onClick={() => toggleOp(key)} style={{
                    padding:'9px 13px', borderRadius:11, cursor:'pointer',
                    border:`2px solid ${on ? color : '#1e1e50'}`,
                    background: on ? `${color}18` : '#0c0c2e',
                    color: on ? color : '#3a3a70',
                    fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13,
                    transition:'all .2s', display:'flex', alignItems:'center', gap:7,
                  }}>
                    <span style={{
                      width:16, height:16, borderRadius:3,
                      border:`2px solid ${on ? color : '#30306a'}`,
                      background: on ? color : 'transparent',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, color:'#0c0c2e', fontWeight:900, flexShrink:0, transition:'all .2s',
                    }}>{on ? '✓' : ''}</span>
                    <span style={{ fontSize:14 }}>{icon}</span> {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Difficulty — 5 levels */}
          <div style={{ marginBottom:24 }}>
            <div style={{ color:'#c8a4ff', fontFamily:"'Cinzel',serif", fontSize:11, marginBottom:9, letterSpacing:2 }}>
              DIFFICULTY
            </div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center' }}>
              {DIFFICULTIES.map(({ key, label, icon, color, desc }) => (
                <button key={key} className="btn-hover" onClick={() => setDifficulty(key)} style={{
                  padding:'9px 12px', borderRadius:11,
                  border:`2px solid ${difficulty===key ? color : '#1e1e50'}`,
                  background: difficulty===key ? `${color}18` : '#0c0c2e',
                  color: difficulty===key ? color : '#3a3a70',
                  cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12,
                  transition:'all .2s', textAlign:'center', minWidth:80,
                }}>
                  <div style={{ fontSize:16 }}>{icon}</div>
                  <div>{label}</div>
                  <div style={{ fontSize:9, opacity:.6, marginTop:2, maxWidth:80 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button className="btn-hover" onClick={startGame} style={{
            padding:'14px 42px', borderRadius:16, border:'none',
            background:'linear-gradient(135deg,#f9ca74,#f0932b)',
            color:'#180a00', fontFamily:"'Cinzel',serif", fontWeight:900,
            fontSize:17, cursor:'pointer', letterSpacing:1, boxShadow:'0 0 30px #f9ca7478',
          }}>
            Begin the Quest! 🗺️
          </button>
        </div>
      )}

      {/* ════════ GAME SCREEN ════════ */}
      {screen === 'game' && mazeData && (
        <div style={{ zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>

          {/* Lifetime bar */}
          <div style={{
            background:'#0d0d30', border:'1px solid #20204a', borderRadius:14,
            padding:'8px 16px', display:'flex', alignItems:'center', gap:12,
            width:'100%', maxWidth:Math.min(window?.innerWidth - 32, 560),
          }}>
            <div style={{ fontSize:24 }} className="wizard-float">{equippedSkin.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:"'Cinzel',serif", color:equippedSkin.color, fontWeight:700, fontSize:12 }}>
                  {equippedSkin.wand} {equippedSkin.title}
                </span>
                <span style={{ fontFamily:"'Cinzel',serif", color:'#f9ca74', fontWeight:900, fontSize:14 }}>
                  ⭐ {totalPoints}
                </span>
              </div>
              <div style={{ height:4, background:'#16163a', borderRadius:3, marginTop:4 }}>
                <div style={{
                  height:'100%', borderRadius:3,
                  background:`linear-gradient(90deg,${equippedSkin.color},${nextSkin?.color||'#f9ca74'})`,
                  width:`${progressPct}%`, transition:'width .5s ease',
                }}/>
              </div>
            </div>
            <button className="btn-hover" onClick={() => { setShopNewlyUnlocked(false); setShowShop(true) }}
              style={{
                background:'#161650', border:'1px solid #3a3a80', borderRadius:8,
                padding:'5px 9px', color:'#c8a4ff', cursor:'pointer', fontSize:10,
                fontFamily:"'Cinzel',serif", fontWeight:700, whiteSpace:'nowrap',
              }}>👗</button>
          </div>

          {/* Session HUD */}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{
              background:'#0e0e32', border:'1px solid #252560', borderRadius:10,
              padding:'6px 14px', color:'#7ee8a2', fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:13,
            }}>Run: +{sessionScore}</div>
            <div style={{
              background:'#0e0e32', border:'1px solid #252560', borderRadius:10,
              padding:'6px 12px', color:diffInfo.color, fontSize:11, fontWeight:700,
            }}>{diffInfo.icon} {diffInfo.label}</div>
            <button className="btn-hover" onClick={() => setScreen('start')} style={{
              background:'#0c0c2a', border:'1px solid #1e1e50', borderRadius:9,
              padding:'6px 12px', color:'#404080', cursor:'pointer', fontSize:11,
            }}>← Menu</button>
          </div>

          {/* Maze grid */}
          <div style={{ position:'relative' }}>
            {showSparkle && <SparkleBlast onDone={() => setShowSparkle(false)} />}
            {pointsPopup && (
              <div key={pointsPopup.key} style={{
                position:'absolute', top:'-10px', left:'50%', transform:'translateX(-50%)',
                color:'#f9ca74', fontFamily:"'Cinzel',serif", fontWeight:900,
                fontSize:22, zIndex:60, pointerEvents:'none', whiteSpace:'nowrap',
                animation:'slideup .3s ease-out, victory 1.4s .3s ease-out forwards',
                textShadow:'0 0 12px #f9ca74',
              }}>+{pointsPopup.value} ⭐</div>
            )}
            <div style={{
              display:'grid',
              gridTemplateColumns:`repeat(${cols},${CELL}px)`,
              gridTemplateRows:`repeat(${rows},${CELL}px)`,
              gap:2, padding:10,
              background:'#080820', borderRadius:16,
              border:'2px solid #1a1a45',
              boxShadow:'0 0 50px #08082840, inset 0 0 30px #04041040',
            }}>
              {grid.map((row, ri) => row.map((cell, ci) => {
                const isPlayer = playerPos.row===ri && playerPos.col===ci
                const doorQ    = cell===DOOR ? doorQuestions[`${ri},${ci}`] : null
                return (
                  <div key={`${ri}-${ci}`} style={{
                    width:CELL, height:CELL, borderRadius:6,
                    background: cell===WALL
                      ? 'linear-gradient(135deg,#0b0b25,#10102c)'
                      : 'linear-gradient(135deg,#14144a,#18184e)',
                    border: cell===WALL ? '1px solid #0d0d26' : '1px solid #20204c',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    position:'relative',
                  }}>
                    {cell===DOOR && doorQ && (
                      <div className="door-pulse" style={{
                        width:CELL-8, height:CELL-8, borderRadius:7,
                        background:'linear-gradient(135deg,#261500,#351e00)',
                        border:'2px solid #f9ca74',
                        display:'flex', flexDirection:'column',
                        alignItems:'center', justifyContent:'center', gap:1,
                      }}>
                        <span style={{ fontSize: CELL>52 ? 20 : 15 }}>🔐</span>
                        <span style={{
                          fontSize: CELL>52 ? 10 : 8, fontWeight:900, color:'#f9ca74',
                          fontFamily:"'Cinzel',serif", letterSpacing:.4, lineHeight:1,
                        }}>+{doorQ.points}pts</span>
                      </div>
                    )}
                    {cell===END && !isPlayer && (
                      <div style={{
                        width:CELL-10, height:CELL-10, borderRadius:'50%',
                        background:'radial-gradient(circle,#f9ca7438,#6a0dad38)',
                        border:'2px solid #c8a4ff',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize: CELL>52 ? 26 : 20,
                        boxShadow:'0 0 18px #c8a4ffaa, 0 0 40px #c8a4ff44',
                      }}>🏆</div>
                    )}
                    {isPlayer && (
                      <div className="wizard-float" style={{
                        fontSize: CELL>52 ? 33 : 26, zIndex:2,
                        filter:'drop-shadow(0 0 8px #c8a4ff)',
                      }}>{equippedSkin.emoji}</div>
                    )}
                  </div>
                )
              }))}
            </div>
          </div>

          {/* D-Pad — bigger on tablet */}
          {(() => {
            const bsz = Math.max(52, Math.min(64, cellSize))
            const bs = {
              width:bsz, height:bsz, fontSize:22, background:'#0e0e30',
              border:'2px solid #20205a', borderRadius:12, cursor:'pointer',
              touchAction:'manipulation',
            }
            return (
              <div style={{ display:'grid', gridTemplateColumns:`${bsz}px ${bsz}px ${bsz}px`, gridTemplateRows:`${bsz}px ${bsz}px`, gap:8 }}>
                <button className="btn-hover" onClick={() => tryMove(-1,0)} style={{...bs, gridColumn:2, gridRow:1}}>⬆️</button>
                <button className="btn-hover" onClick={() => tryMove(0,-1)} style={{...bs, gridColumn:1, gridRow:2}}>⬅️</button>
                <button className="btn-hover" onClick={() => tryMove(1, 0)} style={{...bs, gridColumn:2, gridRow:2}}>⬇️</button>
                <button className="btn-hover" onClick={() => tryMove(0, 1)} style={{...bs, gridColumn:3, gridRow:2}}>➡️</button>
              </div>
            )
          })()}
          <p style={{ color:'#252548', fontSize:11 }}>Arrow keys or buttons • Walk into 🔐 to cast a spell</p>
        </div>
      )}

      {/* ════════ MATH POPUP ════════ */}
      {showMath && question && (
        <div style={{
          position:'fixed', inset:0, background:'#00000092',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:200, backdropFilter:'blur(5px)',
        }}>
          <div className={`appear ${wrong ? 'shake' : ''}`} style={{
            background:'linear-gradient(160deg,#0f1048,#171858)',
            border:'2px solid #f9ca74', borderRadius:24,
            padding:'clamp(20px,4vw,36px) clamp(20px,5vw,44px)',
            textAlign:'center', boxShadow:'0 0 70px #f9ca7438, 0 24px 64px #00000090',
            minWidth:280, maxWidth:'90vw', width:'min(380px,90vw)', position:'relative',
          }}>
            <div style={{ fontSize:40, marginBottom:6 }}>{question.emoji}</div>
            <h2 style={{
              fontFamily:"'Cinzel',serif", color:'#c8a4ff', fontSize:15,
              marginBottom:10, letterSpacing:1,
            }}>🔐 Unlock the Door!</h2>

            {/* Points for this specific equation */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:6,
              background:'#171740', border:'1px solid #f9ca7438', borderRadius:8,
              padding:'5px 14px', marginBottom:14,
              color:'#f9ca74', fontSize:13, fontWeight:800,
            }}>
              <span>Solve it →</span>
              <span style={{ fontSize:17 }}>+{question.points}</span>
              <span>⭐</span>
            </div>

            <div style={{
              fontSize:'clamp(28px,8vw,48px)', fontWeight:900,
              color:'#f9ca74', fontFamily:"'Cinzel',serif",
              marginBottom:16, textShadow:'0 0 20px #f9ca7478',
            }}>{question.display} = ?</div>

            <input
              ref={inputRef} type="number" value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') submitAnswer(); if(e.key==='Escape') setShowMath(false) }}
              style={{
                width:'100%', padding:'11px 16px', fontSize:26, fontWeight:800,
                background:'#0a0a2c', border:`2px solid ${wrong?'#ff5555':'#35358a'}`,
                borderRadius:12, color:wrong?'#ff5555':'#fff', textAlign:'center',
                marginBottom:12, outline:'none', fontFamily:"'Nunito',sans-serif",
                transition:'border-color .2s',
              }}
              placeholder="?"
            />
            {wrong && (
              <div style={{ color:'#ff5555', fontWeight:700, marginBottom:10, fontSize:13 }}>
                🚫 Try again, young wizard!
              </div>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn-hover" onClick={submitAnswer} style={{
                padding:'12px 24px', borderRadius:12, border:'none',
                background:'linear-gradient(135deg,#f9ca74,#f0932b)',
                color:'#180a00', fontFamily:"'Cinzel',serif",
                fontWeight:900, fontSize:15, cursor:'pointer',
                boxShadow:'0 0 20px #f9ca7458',
              }}>Cast Spell! ✨</button>
              <button className="btn-hover" onClick={() => setShowMath(false)} style={{
                padding:'12px 14px', borderRadius:12,
                border:'1px solid #35358a', background:'#0a0a2c',
                color:'#505098', fontFamily:"'Nunito',sans-serif",
                fontWeight:700, fontSize:14, cursor:'pointer',
              }}>Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ SKIN SHOP ════════ */}
      {showShop && (
        <SkinShop
          totalPoints={totalPoints}
          equippedId={equippedSkinId}
          onEquip={(id) => { setEquippedSkinId(id); setShowShop(false); setShopNewlyUnlocked(false) }}
          onClose={() => { setShowShop(false); setShopNewlyUnlocked(false) }}
          newlyUnlocked={shopNewlyUnlocked}
        />
      )}

      {/* ════════ WIN SCREEN ════════ */}
      {screen === 'win' && (
        <div className="victory-anim" style={{ textAlign:'center', zIndex:10, maxWidth:480, padding:'0 16px' }}>
          <div style={{ fontSize:70, marginBottom:8 }}>🏆</div>
          <h1 style={{
            fontFamily:"'Cinzel',serif", fontSize:'clamp(22px,6vw,36px)', fontWeight:900,
            color:'#f9ca74', textShadow:'0 0 30px #f9ca74aa', marginBottom:6,
          }}>Quest Complete!</h1>
          <p style={{ color:'#c8a4ff', fontSize:17, marginBottom:14 }}>
            The maze is defeated! {equippedSkin.emoji} {equippedSkin.wand}
          </p>
          <div style={{
            background:'#0e0e35', border:'2px solid #f9ca74', borderRadius:18,
            padding:'16px 30px', margin:'0 auto 18px', display:'inline-block',
          }}>
            <div style={{ color:'#7ee8a2', fontFamily:"'Cinzel',serif", fontSize:20, fontWeight:900 }}>
              +{sessionScore} this run
            </div>
            <div style={{ color:'#f9ca74', fontFamily:"'Cinzel',serif", fontSize:26, fontWeight:900, marginTop:4 }}>
              ⭐ {totalPoints} total
            </div>
            <div style={{ color:equippedSkin.color, fontSize:12, marginTop:4 }}>
              {equippedSkin.wand} {equippedSkin.title}
              {nextSkin ? ` · ${nextSkin.threshold-totalPoints} pts to ${nextSkin.emoji} ${nextSkin.title}` : ' · Max rank!'}
            </div>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-hover" onClick={startGame} style={{
              padding:'13px 24px', borderRadius:14, border:'none',
              background:'linear-gradient(135deg,#f9ca74,#f0932b)',
              color:'#180a00', fontFamily:"'Cinzel',serif",
              fontWeight:900, fontSize:16, cursor:'pointer', boxShadow:'0 0 20px #f9ca7458',
            }}>Play Again! 🗺️</button>
            <button className="btn-hover" onClick={() => setScreen('start')} style={{
              padding:'13px 24px', borderRadius:14,
              border:'2px solid #c8a4ff', background:'#0e0e35',
              color:'#c8a4ff', fontFamily:"'Cinzel',serif",
              fontWeight:700, fontSize:16, cursor:'pointer',
            }}>Change Settings</button>
            <button className="btn-hover" onClick={() => { setShopNewlyUnlocked(false); setShowShop(true) }} style={{
              padding:'13px 24px', borderRadius:14,
              border:'2px solid #7ee8a2', background:'#0e0e35',
              color:'#7ee8a2', fontFamily:"'Cinzel',serif",
              fontWeight:700, fontSize:16, cursor:'pointer',
            }}>👗 Wardrobe</button>
          </div>
        </div>
      )}
    </div>
  )
}
