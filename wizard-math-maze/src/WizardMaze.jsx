import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

const WALL=0,PATH=1,DOOR=2,START=3,END=4

const ALL_SKINS=[
  {id:'apprentice',threshold:0,    emoji:'🧙‍♂️',title:'Apprentice', wand:'🪄',color:'#a0a0cc',desc:'Your journey begins...'},
  {id:'mage',      threshold:300,  emoji:'🧙',  title:'Mage',       wand:'⚡',color:'#7ee8a2',desc:'The arcane arts awaken!'},
  {id:'enchanter', threshold:800,  emoji:'🧝',  title:'Enchanter',  wand:'🔮',color:'#74b9ff',desc:'Reality bends to your will.'},
  {id:'sorceress', threshold:2000, emoji:'🧝‍♀️',title:'Sorceress',  wand:'🌙',color:'#f78fb3',desc:'The stars know your name.'},
  {id:'archmage',  threshold:5000, emoji:'🧛',  title:'Archmage',   wand:'🌟',color:'#f9ca74',desc:'Mastery over all elements!'},
  {id:'legendary', threshold:12000,emoji:'👑',  title:'Grand Wizard',wand:'☄️',color:'#ff6bff',desc:'A legend of the ancient ages.'},
]
const getSkin=p=>[...ALL_SKINS].reverse().find(s=>p>=s.threshold)||ALL_SKINS[0]
const getUnlocked=p=>ALL_SKINS.filter(s=>p>=s.threshold)
const getNext=p=>ALL_SKINS.find(s=>s.threshold>p)||null

const DIFFS=[
  {key:'novice',    label:'Novice',    icon:'🌿',color:'#b8f0c0',mult:0.7, desc:'Small numbers',    ranges:{add:[1,8],  sub:[3,12], mul:[1,4], div:[1,4]}},
  {key:'apprentice',label:'Apprentice',icon:'🌱',color:'#7ee8a2',mult:1.0, desc:'Classic challenge', ranges:{add:[1,15], sub:[5,20], mul:[1,6], div:[1,6]}},
  {key:'sorcerer',  label:'Sorcerer',  icon:'🔥',color:'#f9ca74',mult:1.6, desc:'Numbers get serious',ranges:{add:[5,40], sub:[10,50],mul:[2,10],div:[2,10]}},
  {key:'archmage',  label:'Archmage',  icon:'⚡',color:'#f78fb3',mult:2.5, desc:'Large numbers',     ranges:{add:[10,80],sub:[20,100],mul:[3,12],div:[3,12]}},
  {key:'legendary', label:'Legendary', icon:'💀',color:'#ff6bff',mult:4.0, desc:'Only the bravest',  ranges:{add:[50,500],sub:[100,999],mul:[6,20],div:[6,15]}},
]

const OP_OPTIONS=[
  {key:'addition',      label:'Addition',      icon:'➕',color:'#7ee8a2'},
  {key:'subtraction',   label:'Subtraction',   icon:'−', color:'#f9ca74'},
  {key:'multiplication',label:'Multiplication',icon:'×', color:'#f78fb3'},
  {key:'division',      label:'Division',      icon:'÷', color:'#74b9ff'},
]

function calcPts(op,a,b,ans,m){
  let base
  if(op==='addition'){const mx=Math.max(a,b);base=mx<=8?5:mx<=15?9:mx<=30?14:mx<=60?20:28}
  else if(op==='subtraction'){base=a<=10?6:a<=20?10:a<=50?16:a<=100?22:30;if(a-b<3)base=Math.round(base*.85)}
  else if(op==='multiplication'){base=ans<=20?10:ans<=50?16:ans<=100?24:ans<=200?34:45;const mf=Math.min(a,b);if(mf>=6)base=Math.round(base*1.15);if(mf>=8)base=Math.round(base*1.25)}
  else{const pr=b*ans;base=pr<=20?10:pr<=50?16:pr<=100?24:pr<=200?34:45;if(b>=6)base=Math.round(base*1.15);if(b>=9)base=Math.round(base*1.2)}
  return Math.max(5,Math.round(Math.round(base*m)/5)*5)
}

function genQ(ops,dk){
  const d=DIFFS.find(x=>x.key===dk)||DIFFS[1]
  const op=[...ops][Math.floor(Math.random()*ops.size)]
  const {ranges:r,mult:m}=d
  const rnd=(lo,hi)=>Math.floor(Math.random()*(hi-lo+1))+lo
  let a,b,ans,disp,emoji
  if(op==='addition'){a=rnd(r.add[0],r.add[1]);b=rnd(r.add[0],r.add[1]);ans=a+b;disp=`${a} + ${b}`;emoji='➕'}
  else if(op==='subtraction'){a=rnd(r.sub[0],r.sub[1]);b=rnd(1,a);ans=a-b;disp=`${a} − ${b}`;emoji='✨'}
  else if(op==='multiplication'){a=rnd(r.mul[0],r.mul[1]);b=rnd(r.mul[0],r.mul[1]);ans=a*b;disp=`${a} × ${b}`;emoji='⭐'}
  else{b=rnd(r.div[0],r.div[1]);ans=rnd(1,r.div[1]);a=b*ans;disp=`${a} ÷ ${b}`;emoji='🔮'}
  const pts=calcPts(op,a,b,ans,m)
  return{disp,ans,emoji,op,basePts:pts,curPts:pts,wrongs:0}
}

function genMaze(ops,dk){
  const R=6,C=6,H=R*2+1,W=C*2+1
  const g=Array.from({length:H},()=>Array(W).fill(WALL))
  for(let r=0;r<R;r++)for(let c=0;c<C;c++)g[r*2+1][c*2+1]=PATH
  const vis=Array.from({length:R},()=>Array(C).fill(false))
  const dirs=[[0,1],[0,-1],[1,0],[-1,0]]
  function carve(r,c){
    vis[r][c]=true
    for(const[dr,dc]of[...dirs].sort(()=>Math.random()-.5)){
      const nr=r+dr,nc=c+dc
      if(nr>=0&&nr<R&&nc>=0&&nc<C&&!vis[nr][nc]){g[r*2+1+dr][c*2+1+dc]=PATH;carve(nr,nc)}
    }
  }
  carve(0,0)
  let ex=Math.floor(R*C*.35),at=0
  while(ex>0&&at<600){
    const r=1+Math.floor(Math.random()*(H-2)),c=1+Math.floor(Math.random()*(W-2))
    if(g[r][c]===WALL){
      const h=r%2===1&&c%2===0&&g[r][c-1]===PATH&&g[r][c+1]===PATH
      const v=r%2===0&&c%2===1&&g[r-1][c]===PATH&&g[r+1][c]===PATH
      if(h||v){g[r][c]=PATH;ex--}
    }
    at++
  }
  g[1][1]=START;g[H-2][W-2]=END
  const pc=[]
  for(let r=0;r<H;r++)for(let c=0;c<W;c++)
    if(g[r][c]===PATH&&!(r<=2&&c<=2)&&!(r>=H-3&&c>=W-3))pc.push([r,c])
  pc.sort(()=>Math.random()-.5)
  const nd=6+Math.floor(Math.random()*4),dq={}
  for(const[r,c]of pc.slice(0,nd)){g[r][c]=DOOR;dq[`${r},${c}`]=genQ(ops,dk)}
  return{grid:g,dq}
}

const SHAPES=['✨','⭐','🌟','💫']
function Sparkle({onDone}){
  const pts=useRef(Array.from({length:28},(_,i)=>({id:i,angle:(i/28)*360+Math.random()*13,dist:55+Math.random()*80,size:12+Math.random()*12,delay:Math.random()*.15,shape:SHAPES[Math.floor(Math.random()*4)]}))).current
  useEffect(()=>{const t=setTimeout(onDone,900);return()=>clearTimeout(t)},[onDone])
  return(
    <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:50,overflow:'visible'}}>
      <style>{`@keyframes sf{0%{opacity:1;transform:translate(-50%,-50%) translate(0,0) scale(1.3);}100%{opacity:0;transform:translate(-50%,-50%) translate(var(--dx),var(--dy)) scale(0.1);}}`}</style>
      {pts.map(p=>{const rad=p.angle*Math.PI/180;return(
        <div key={p.id} style={{position:'absolute',left:'50%',top:'50%',fontSize:p.size,lineHeight:1,'--dx':`${Math.cos(rad)*p.dist}px`,'--dy':`${Math.sin(rad)*p.dist}px`,animation:`sf .85s ${p.delay}s ease-out both`}}>{p.shape}</div>
      )})}
    </div>
  )
}

function SkinShop({pts,equipped,onEquip,onClose,isNew}){
  const next=getNext(pts)
  return(
    <div style={{position:'fixed',inset:0,background:'#000000b8',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400,backdropFilter:'blur(8px)',padding:16}}>
      <div style={{background:'linear-gradient(160deg,#100d3a,#1a1260)',border:'2px solid #c8a4ff',borderRadius:24,padding:'24px 20px',maxWidth:500,width:'100%',boxShadow:'0 0 80px #c8a4ff44',maxHeight:'90vh',overflowY:'auto'}}>
        {isNew&&<div style={{background:'linear-gradient(90deg,#c8a4ff22,#f9ca7422)',border:'1px solid #f9ca74',borderRadius:10,padding:'8px 16px',marginBottom:14,textAlign:'center',color:'#f9ca74',fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700}}>✨ New wizard unlocked! Pick your look! ✨</div>}
        <h2 style={{fontFamily:"'Cinzel',serif",color:'#c8a4ff',fontSize:19,fontWeight:900,textAlign:'center',marginBottom:14,letterSpacing:1}}>🧙 Wizard Wardrobe</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {ALL_SKINS.map(sk=>{
            const owned=pts>=sk.threshold,active=sk.id===equipped
            return(
              <button key={sk.id} onClick={()=>owned&&onEquip(sk.id)} style={{padding:'12px 8px',borderRadius:12,textAlign:'center',border:`2px solid ${active?sk.color:owned?sk.color+'66':'#1e1e48'}`,background:active?`${sk.color}22`:owned?'#141440':'#0d0d2a',cursor:owned?'pointer':'default',opacity:owned?1:.45,transition:'all .2s',position:'relative'}}>
                {active&&<div style={{position:'absolute',top:-7,right:-7,background:'#f9ca74',color:'#180a00',borderRadius:999,padding:'2px 7px',fontSize:8,fontWeight:900,fontFamily:"'Cinzel',serif"}}>EQUIPPED</div>}
                {!owned&&<div style={{position:'absolute',top:-7,left:'50%',transform:'translateX(-50%)',background:'#1e1e50',border:'1px solid #3a3a70',color:'#5050a0',borderRadius:999,padding:'2px 8px',fontSize:8,fontWeight:700}}>🔒 {sk.threshold.toLocaleString()}</div>}
                <div style={{fontSize:32,marginBottom:3}}>{sk.emoji}</div>
                <div style={{fontFamily:"'Cinzel',serif",color:owned?sk.color:'#3a3a70',fontWeight:700,fontSize:12,marginBottom:2}}>{sk.title}</div>
                <div style={{fontSize:18,marginBottom:3}}>{sk.wand}</div>
                <div style={{color:owned?'#6060a0':'#2a2a50',fontSize:9}}>{sk.desc}</div>
              </button>
            )
          })}
        </div>
        {next&&<div style={{marginTop:14,padding:'8px 14px',background:'#0d0d28',border:'1px solid #2a2a50',borderRadius:10,color:'#4040a0',fontSize:11,textAlign:'center'}}>Next: {next.emoji} <strong style={{color:next.color}}>{next.title}</strong> — {(next.threshold-pts).toLocaleString()} pts away</div>}
        <button onClick={onClose} style={{marginTop:14,width:'100%',padding:'11px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#c8a4ff,#9b59b6)',color:'#100d3a',fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:14,cursor:'pointer'}}>{isNew?'Equip & Continue! ✨':'Close Wardrobe ✕'}</button>
      </div>
    </div>
  )
}

const BGSTARS=Array.from({length:60},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,sz:Math.random()*2.5+.5,dl:Math.random()*4,dr:Math.random()*2+2}))
const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Nunito:wght@700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  @keyframes twinkle{0%,100%{opacity:.15}50%{opacity:1}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes pdoor{0%,100%{box-shadow:0 0 8px #f9ca74,0 0 18px #f9ca74aa}50%{box-shadow:0 0 16px #f9ca74,0 0 40px #f9ca74aa}}
  @keyframes pwarn{0%,100%{box-shadow:0 0 8px #ff8855,0 0 18px #ff885588}50%{box-shadow:0 0 16px #ff8855,0 0 40px #ff885588}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}
  @keyframes appear{from{opacity:0;transform:scale(.7) translateY(18px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes victory{0%{opacity:0;transform:scale(.5)}60%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
  @keyframes sup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fout{0%{opacity:1}70%{opacity:1}100%{opacity:0}}
  .star{position:absolute;border-radius:50%;background:#fff;animation:twinkle var(--dr) var(--dl) infinite ease-in-out;}
  .wf{animation:float 3s ease-in-out infinite;display:inline-block;}
  .dp{animation:pdoor 1.6s ease-in-out infinite;}
  .dw{animation:pwarn 1.2s ease-in-out infinite;}
  .shake{animation:shake .5s ease-in-out;}
  .appear{animation:appear .4s ease-out;}
  .victory{animation:victory .6s ease-out;}
  .bh:hover{transform:translateY(-2px);filter:brightness(1.18);transition:all .14s;}
  .bh:active{transform:translateY(1px);}
  input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
  input[type=number]{-moz-appearance:textfield;}
  ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0d0d30;}::-webkit-scrollbar-thumb{background:#3a3a70;border-radius:4px;}
`

export default function WizardMaze(){
  const [screen,setScreen]=useState('start')
  const [ops,setOps]=useState(new Set(['addition']))
  const [diff,setDiff]=useState('apprentice')
  const [maze,setMaze]=useState(null)
  const [pos,setPos]=useState({row:1,col:1})
  const [showMath,setShowMath]=useState(false)
  const [q,setQ]=useState(null)
  const [pending,setPending]=useState(null)
  const [ans,setAns]=useState('')
  const [wrong,setWrong]=useState(false)
  const [run,setRun]=useState(0)
  const [total,setTotal]=useState(0)
  const [skin,setSkin]=useState('apprentice')
  const [shop,setShop]=useState(false)
  const [shopNew,setShopNew]=useState(false)
  const [pendingSkin,setPendingSkin]=useState(null)
  const [sparkle,setSparkle]=useState(false)
  const [popup,setPopup]=useState(null)
  const [cell,setCell]=useState(46)
  const iref=useRef(null)

  useEffect(()=>{
    const upd=()=>{const av=Math.min(window.innerWidth-40,window.innerHeight-280,640);setCell(Math.max(30,Math.min(52,Math.floor(av/13))))}
    upd();window.addEventListener('resize',upd);return()=>window.removeEventListener('resize',upd)
  },[])

  const eqSkin=ALL_SKINS.find(s=>s.id===skin)||ALL_SKINS[0]
  const nextSkin=getNext(total)
  const pct=useMemo(()=>{const c=getSkin(total),n=getNext(total);if(!n)return 100;return Math.min(100,Math.round((total-c.threshold)/(n.threshold-c.threshold)*100))},[total])
  const di=DIFFS.find(d=>d.key===diff)||DIFFS[1]

  const startGame=()=>{setMaze(genMaze(ops,diff));setPos({row:1,col:1});setRun(0);setPendingSkin(null);setScreen('game')}
  const toggleOp=k=>setOps(prev=>{const n=new Set(prev);n.has(k)?n.size>1&&n.delete(k):n.add(k);return n})

  const move=useCallback((dr,dc)=>{
    if(showMath||sparkle||!maze)return
    const nr=pos.row+dr,nc=pos.col+dc
    const{grid,dq}=maze
    if(nr<0||nr>=grid.length||nc<0||nc>=grid[0].length)return
    const c=grid[nr][nc]
    if(c===WALL)return
    if(c===DOOR){const qq=dq[`${nr},${nc}`]||genQ(ops,diff);setQ(qq);setPending({row:nr,col:nc});setAns('');setWrong(false);setShowMath(true);return}
    setPos({row:nr,col:nc})
    if(c===END)setTimeout(()=>setScreen('win'),300)
  },[maze,pos,showMath,sparkle,ops,diff])

  useEffect(()=>{
    if(screen!=='game')return
    const h=e=>{const m={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[e.key];if(m){e.preventDefault();move(...m)}}
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[screen,move])

  useEffect(()=>{if(showMath&&iref.current)setTimeout(()=>iref.current?.focus(),130)},[showMath])

  const submit=()=>{
    const n=parseInt(ans,10)
    if(!isNaN(n)&&n===q.ans){
      const ng=maze.grid.map(r=>[...r]);ng[pending.row][pending.col]=PATH
      const ndq={...maze.dq};delete ndq[`${pending.row},${pending.col}`]
      setMaze({grid:ng,dq:ndq})
      const earned=q.curPts;setRun(s=>s+earned)
      const pt=total,nt=pt+earned;setTotal(nt)
      const pi=getUnlocked(pt).map(s=>s.id),ni=getUnlocked(nt).map(s=>s.id)
      const ju=ni.find(id=>!pi.includes(id));if(ju)setPendingSkin(ju)
      setShowMath(false);setPos(pending);setSparkle(true)
      setPopup({v:earned,k:Date.now()});setTimeout(()=>setPopup(null),1500)
      if(ng[pending.row][pending.col]===END)setTimeout(()=>setScreen('win'),1100)
    } else {
      setWrong(true);setAns('')
      setQ(prev=>{
        const nw=prev.wrongs+1,red=Math.max(5,Math.round(prev.curPts*.5/5)*5)
        setMaze(md=>{if(!md)return md;const k=`${pending.row},${pending.col}`;return{...md,dq:{...md.dq,[k]:{...md.dq[k],curPts:red,wrongs:nw}}}})
        return{...prev,curPts:red,wrongs:nw}
      })
      setTimeout(()=>setWrong(false),700)
    }
  }

  if(!maze&&screen==='game')return null
  const{grid=[],dq={}}=maze||{},rows=grid.length,cols=grid[0]?.length||0,C=cell

  return(
    <div style={{minHeight:'100vh',background:'#080820',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'Nunito',sans-serif",position:'relative',overflow:'hidden',padding:12}}>
      <style>{CSS}</style>
      {BGSTARS.map(s=><div key={s.id} className="star" style={{left:`${s.x}%`,top:`${s.y}%`,width:s.sz,height:s.sz,'--dr':`${s.dr}s`,'--dl':`${s.dl}s`}}/>)}

      {screen==='start'&&(
        <div className="appear" style={{textAlign:'center',zIndex:10,maxWidth:620,width:'100%'}}>
          <div style={{fontSize:66,marginBottom:4}} className="wf">{eqSkin.emoji}</div>
          <h1 style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(22px,5vw,36px)',fontWeight:900,color:'#f9ca74',letterSpacing:2,textShadow:'0 0 20px #f9ca74aa',marginBottom:4}}>Wizard Math Maze</h1>

          <div style={{background:'#0e0e35',border:'1px solid #252558',borderRadius:16,padding:'11px 16px',margin:'10px auto 12px',display:'inline-flex',alignItems:'center',gap:12,maxWidth:420,width:'100%'}}>
            <span style={{fontSize:24}}>{eqSkin.wand}</span>
            <div style={{flex:1,textAlign:'left'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontFamily:"'Cinzel',serif",color:eqSkin.color,fontWeight:700,fontSize:12}}>{eqSkin.title}</span>
                <span style={{fontFamily:"'Cinzel',serif",color:'#f9ca74',fontWeight:900,fontSize:13}}>⭐ {total.toLocaleString()} pts</span>
              </div>
              <div style={{height:6,background:'#1a1a42',borderRadius:4,marginTop:5}}>
                <div style={{height:'100%',borderRadius:4,background:`linear-gradient(90deg,${eqSkin.color},${nextSkin?.color||'#f9ca74'})`,width:`${pct}%`,transition:'width .6s ease'}}/>
              </div>
              <div style={{fontSize:10,color:'#404080',marginTop:2}}>{nextSkin?`${(nextSkin.threshold-total).toLocaleString()} pts to ${nextSkin.emoji} ${nextSkin.title}`:'🌟 Maximum rank!'}</div>
            </div>
            <button className="bh" onClick={()=>{setShopNew(false);setShop(true)}} style={{background:'#1a1a50',border:'1px solid #4040a0',borderRadius:10,padding:'5px 9px',color:'#c8a4ff',cursor:'pointer',fontSize:11,fontFamily:"'Cinzel',serif",fontWeight:700,whiteSpace:'nowrap'}}>👗 Wardrobe</button>
          </div>

          <div style={{background:'#0d0d2a',border:'1px dashed #2a2a55',borderRadius:10,padding:'6px 14px',margin:'0 auto 12px',maxWidth:340,color:'#404080',fontSize:11,fontStyle:'italic'}}>🔑 Player sign-in & progress saving coming soon!</div>

          <div style={{marginBottom:13}}>
            <div style={{color:'#c8a4ff',fontFamily:"'Cinzel',serif",fontSize:11,marginBottom:7,letterSpacing:2}}>CHOOSE YOUR SPELLS</div>
            <div style={{display:'flex',gap:7,flexWrap:'wrap',justifyContent:'center'}}>
              {OP_OPTIONS.map(({key,label,icon,color})=>{const on=ops.has(key);return(
                <button key={key} className="bh" onClick={()=>toggleOp(key)} style={{padding:'8px 12px',borderRadius:11,cursor:'pointer',border:`2px solid ${on?color:'#1e1e50'}`,background:on?`${color}18`:'#0c0c2e',color:on?color:'#3a3a70',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,transition:'all .2s',display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:15,height:15,borderRadius:3,border:`2px solid ${on?color:'#30306a'}`,background:on?color:'transparent',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#0c0c2e',fontWeight:900,flexShrink:0}}>{on?'✓':''}</span>
                  <span style={{fontSize:13}}>{icon}</span>{label}
                </button>
              )})}
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <div style={{color:'#c8a4ff',fontFamily:"'Cinzel',serif",fontSize:11,marginBottom:7,letterSpacing:2}}>DIFFICULTY</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
              {DIFFS.map(({key,label,icon,color,desc})=>(
                <button key={key} className="bh" onClick={()=>setDiff(key)} style={{padding:'7px 10px',borderRadius:11,border:`2px solid ${diff===key?color:'#1e1e50'}`,background:diff===key?`${color}18`:'#0c0c2e',color:diff===key?color:'#3a3a70',cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,transition:'all .2s',textAlign:'center',minWidth:72}}>
                  <div style={{fontSize:14}}>{icon}</div><div>{label}</div><div style={{fontSize:8,opacity:.6,marginTop:1}}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button className="bh" onClick={startGame} style={{padding:'13px 40px',borderRadius:16,border:'none',background:'linear-gradient(135deg,#f9ca74,#f0932b)',color:'#180a00',fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:17,cursor:'pointer',letterSpacing:1,boxShadow:'0 0 30px #f9ca7478'}}>Begin the Quest! 🗺️</button>
        </div>
      )}

      {screen==='game'&&maze&&(
        <div style={{zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
          <div style={{background:'#0d0d30',border:'1px solid #20204a',borderRadius:12,padding:'6px 13px',display:'flex',alignItems:'center',gap:11,width:'100%',maxWidth:600}}>
            <div style={{fontSize:20}} className="wf">{eqSkin.emoji}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontFamily:"'Cinzel',serif",color:eqSkin.color,fontWeight:700,fontSize:11}}>{eqSkin.wand} {eqSkin.title}</span>
                <span style={{fontFamily:"'Cinzel',serif",color:'#f9ca74',fontWeight:900,fontSize:13}}>⭐ {total.toLocaleString()}</span>
              </div>
              <div style={{height:4,background:'#16163a',borderRadius:3,marginTop:3}}>
                <div style={{height:'100%',borderRadius:3,background:`linear-gradient(90deg,${eqSkin.color},${nextSkin?.color||'#f9ca74'})`,width:`${pct}%`,transition:'width .5s ease'}}/>
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:7,alignItems:'center'}}>
            <div style={{background:'#0e0e32',border:'1px solid #252560',borderRadius:10,padding:'5px 12px',color:'#7ee8a2',fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:12}}>Run: +{run}</div>
            <div style={{background:'#0e0e32',border:'1px solid #252560',borderRadius:10,padding:'5px 10px',color:di.color,fontSize:11,fontWeight:700}}>{di.icon} {di.label}</div>
            <button className="bh" onClick={()=>setScreen('start')} style={{background:'#0c0c2a',border:'1px solid #1e1e50',borderRadius:9,padding:'5px 10px',color:'#404080',cursor:'pointer',fontSize:11}}>← Menu</button>
          </div>

          <div style={{position:'relative'}}>
            {sparkle&&<Sparkle onDone={()=>setSparkle(false)}/>}
            {popup&&<div key={popup.k} style={{position:'absolute',top:'-8px',left:'50%',transform:'translateX(-50%)',color:'#f9ca74',fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:20,zIndex:60,pointerEvents:'none',whiteSpace:'nowrap',animation:'sup .3s ease-out, fout 1.5s .2s forwards',textShadow:'0 0 12px #f9ca74'}}>+{popup.v} ⭐</div>}
            <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},${C}px)`,gridTemplateRows:`repeat(${rows},${C}px)`,gap:2,padding:8,background:'#080820',borderRadius:14,border:'2px solid #1a1a45',boxShadow:'0 0 50px #08082840'}}>
              {grid.map((row,ri)=>row.map((cv,ci)=>{
                const ip=pos.row===ri&&pos.col===ci
                const dqv=cv===DOOR?dq[`${ri},${ci}`]:null
                const dw=dqv&&dqv.wrongs>0
                return(
                  <div key={`${ri}-${ci}`} style={{width:C,height:C,borderRadius:5,background:cv===WALL?'linear-gradient(135deg,#0b0b25,#10102c)':'linear-gradient(135deg,#14144a,#18184e)',border:cv===WALL?'1px solid #0d0d26':'1px solid #20204c',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    {cv===DOOR&&dqv&&(
                      <div className={dw?'dw':'dp'} style={{width:C-6,height:C-6,borderRadius:6,background:dw?'linear-gradient(135deg,#2a1000,#3a1800)':'linear-gradient(135deg,#261500,#351e00)',border:`2px solid ${dw?'#ff8855':'#f9ca74'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1}}>
                        <span style={{fontSize:C>44?15:11}}>🔐</span>
                        <span style={{fontSize:C>44?8:7,fontWeight:900,color:dw?'#ff8855':'#f9ca74',fontFamily:"'Cinzel',serif",lineHeight:1}}>+{dqv.curPts}pts</span>
                        {dw&&<span style={{fontSize:7,color:'#ff8855',lineHeight:1}}>{'⚠️'.repeat(Math.min(dqv.wrongs,3))}</span>}
                      </div>
                    )}
                    {cv===END&&!ip&&<div style={{width:C-8,height:C-8,borderRadius:'50%',background:'radial-gradient(circle,#f9ca7438,#6a0dad38)',border:'2px solid #c8a4ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:C>44?22:16,boxShadow:'0 0 18px #c8a4ffaa'}}>🏆</div>}
                    {ip&&<div className="wf" style={{fontSize:C>44?28:22,zIndex:2,filter:'drop-shadow(0 0 8px #c8a4ff)'}}>{eqSkin.emoji}</div>}
                  </div>
                )
              }))}
            </div>
          </div>

          {(()=>{const bsz=Math.max(46,Math.min(58,cell+8)),bs={width:bsz,height:bsz,fontSize:20,background:'#0e0e30',border:'2px solid #20205a',borderRadius:11,cursor:'pointer',touchAction:'manipulation'};return(
            <div style={{display:'grid',gridTemplateColumns:`${bsz}px ${bsz}px ${bsz}px`,gridTemplateRows:`${bsz}px ${bsz}px`,gap:7}}>
              <button className="bh" onClick={()=>move(-1,0)} style={{...bs,gridColumn:2,gridRow:1}}>⬆️</button>
              <button className="bh" onClick={()=>move(0,-1)} style={{...bs,gridColumn:1,gridRow:2}}>⬅️</button>
              <button className="bh" onClick={()=>move(1,0)}  style={{...bs,gridColumn:2,gridRow:2}}>⬇️</button>
              <button className="bh" onClick={()=>move(0,1)}  style={{...bs,gridColumn:3,gridRow:2}}>➡️</button>
            </div>
          )})()}
          <p style={{color:'#252548',fontSize:10}}>Arrow keys or buttons • Walk into 🔐 to cast a spell</p>
        </div>
      )}

      {showMath&&q&&(
        <div style={{position:'fixed',inset:0,background:'#00000092',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(5px)'}}>
          <div className={`appear${wrong?' shake':''}`} style={{background:'linear-gradient(160deg,#0f1048,#171858)',border:`2px solid ${q.wrongs>0?'#ff8855':'#f9ca74'}`,borderRadius:24,padding:'clamp(18px,4vw,34px) clamp(18px,5vw,42px)',textAlign:'center',boxShadow:'0 0 70px #f9ca7438,0 24px 64px #00000090',minWidth:280,maxWidth:'90vw',width:'min(380px,90vw)'}}>
            <div style={{fontSize:36,marginBottom:5}}>{q.emoji}</div>
            <h2 style={{fontFamily:"'Cinzel',serif",color:'#c8a4ff',fontSize:14,marginBottom:8,letterSpacing:1}}>🔐 Unlock the Door!</h2>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:q.wrongs>0?'#2a1000':'#171740',border:`1px solid ${q.wrongs>0?'#ff885550':'#f9ca7438'}`,borderRadius:8,padding:'4px 12px',marginBottom:10,color:q.wrongs>0?'#ff8855':'#f9ca74',fontSize:13,fontWeight:800}}>
              {q.wrongs>0&&<span>⚠️</span>}<span>Solve it →</span><span style={{fontSize:17}}>+{q.curPts}</span><span>⭐</span>
              {q.wrongs>0&&<span style={{fontSize:10,opacity:.8}}>(−{q.wrongs} guess{q.wrongs>1?'es':''})</span>}
            </div>
            {q.wrongs>0&&q.curPts>5&&<div style={{fontSize:10,color:'#ff885588',marginBottom:7}}>Wrong again → drops to +{Math.max(5,Math.round(q.curPts*.5/5)*5)} ⭐</div>}
            <div style={{fontSize:'clamp(26px,7vw,46px)',fontWeight:900,color:q.wrongs>0?'#ff8855':'#f9ca74',fontFamily:"'Cinzel',serif",marginBottom:13,textShadow:`0 0 20px ${q.wrongs>0?'#ff885578':'#f9ca7478'}`}}>{q.disp} = ?</div>
            <input ref={iref} type="number" value={ans} onChange={e=>setAns(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit();if(e.key==='Escape')setShowMath(false)}} style={{width:'100%',padding:'10px 14px',fontSize:26,fontWeight:800,background:'#0a0a2c',border:`2px solid ${wrong?'#ff5555':'#35358a'}`,borderRadius:12,color:wrong?'#ff5555':'#fff',textAlign:'center',marginBottom:11,outline:'none',fontFamily:"'Nunito',sans-serif",transition:'border-color .2s'}} placeholder="?"/>
            {wrong&&<div style={{color:'#ff5555',fontWeight:700,marginBottom:9,fontSize:13}}>🚫 Try again! Points reduced by half!</div>}
            <div style={{display:'flex',gap:9,justifyContent:'center'}}>
              <button className="bh" onClick={submit} style={{padding:'11px 22px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#f9ca74,#f0932b)',color:'#180a00',fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:14,cursor:'pointer',boxShadow:'0 0 20px #f9ca7458'}}>Cast Spell! ✨</button>
              <button className="bh" onClick={()=>setShowMath(false)} style={{padding:'11px 13px',borderRadius:12,border:'1px solid #35358a',background:'#0a0a2c',color:'#505098',fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:'pointer'}}>Back</button>
            </div>
          </div>
        </div>
      )}

      {shop&&<SkinShop pts={total} equipped={skin} onEquip={id=>{setSkin(id);setShop(false);setShopNew(false)}} onClose={()=>{setShop(false);setShopNew(false)}} isNew={shopNew}/>}

      {screen==='win'&&(
        <div className="victory" style={{textAlign:'center',zIndex:10,maxWidth:500,padding:'0 16px'}}>
          <div style={{fontSize:66,marginBottom:8}}>🏆</div>
          <h1 style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(22px,6vw,36px)',fontWeight:900,color:'#f9ca74',textShadow:'0 0 30px #f9ca74aa',marginBottom:6}}>Quest Complete!</h1>
          {pendingSkin&&(()=>{const ns=ALL_SKINS.find(s=>s.id===pendingSkin);return ns?(<div style={{background:`${ns.color}18`,border:`2px solid ${ns.color}`,borderRadius:14,padding:'10px 20px',margin:'0 auto 12px',display:'inline-block'}}><div style={{fontFamily:"'Cinzel',serif",color:'#f9ca74',fontSize:11,letterSpacing:2}}>✨ NEW WIZARD UNLOCKED!</div><div style={{fontSize:38,margin:'4px 0'}}>{ns.emoji}</div><div style={{fontFamily:"'Cinzel',serif",color:ns.color,fontWeight:900,fontSize:17}}>{ns.title} {ns.wand}</div></div>):null})()}
          <p style={{color:'#c8a4ff',fontSize:15,marginBottom:12}}>The maze is defeated! {eqSkin.emoji} {eqSkin.wand}</p>
          <div style={{background:'#0e0e35',border:'2px solid #f9ca74',borderRadius:16,padding:'13px 26px',margin:'0 auto 14px',display:'inline-block'}}>
            <div style={{color:'#7ee8a2',fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:900}}>+{run} this run</div>
            <div style={{color:'#f9ca74',fontFamily:"'Cinzel',serif",fontSize:24,fontWeight:900,marginTop:3}}>⭐ {total.toLocaleString()} total</div>
            <div style={{color:eqSkin.color,fontSize:11,marginTop:3}}>{eqSkin.wand} {eqSkin.title}{nextSkin?` · ${(nextSkin.threshold-total).toLocaleString()} pts to ${nextSkin.emoji} ${nextSkin.title}`:' · Max rank!'}</div>
          </div>
          <div style={{display:'flex',gap:9,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="bh" onClick={startGame} style={{padding:'11px 20px',borderRadius:14,border:'none',background:'linear-gradient(135deg,#f9ca74,#f0932b)',color:'#180a00',fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:14,cursor:'pointer',boxShadow:'0 0 20px #f9ca7458'}}>Play Again! 🗺️</button>
            <button className="bh" onClick={()=>setScreen('start')} style={{padding:'11px 20px',borderRadius:14,border:'2px solid #c8a4ff',background:'#0e0e35',color:'#c8a4ff',fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:14,cursor:'pointer'}}>Settings</button>
            <button className="bh" onClick={()=>{setShopNew(!!pendingSkin);setShop(true)}} style={{padding:'11px 20px',borderRadius:14,border:`2px solid ${pendingSkin?'#f9ca74':'#7ee8a2'}`,background:'#0e0e35',color:pendingSkin?'#f9ca74':'#7ee8a2',fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:14,cursor:'pointer',boxShadow:pendingSkin?'0 0 16px #f9ca7444':'none'}}>{pendingSkin?'✨ New Wizard!':'👗 Wardrobe'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
