export const C = {
  bg: '#080820',
  panel: '#0e0e35',
  panelHi: '#15154a',
  line: '#252558',
  lineHi: '#3a3a86',
  ink: '#ffffff',
  dim: '#c8a4ff',
  faint: '#5b5b96',
  gold: '#f9ca74',
  goldHi: '#ffeec2',
  amber: '#f0932b',
  good: '#7ee8a2',
  bad: '#ff5f6d',
  teal: '#5ad9ff',
}

export const serif = "'Cinzel', Georgia, serif"
export const sans = "'Nunito', system-ui, -apple-system, sans-serif"

export const panel = (extra = {}) => ({
  background: C.panel,
  border: `2px solid ${C.line}`,
  borderRadius: 20,
  padding: '20px 18px',
  ...extra,
})

export const btn = (tone = 'gold', extra = {}) => {
  const tones = {
    gold:  { background: `linear-gradient(135deg,${C.gold},${C.amber})`, color: '#180a00', shadow: `0 0 22px ${C.gold}55` },
    ghost: { background: C.panelHi, color: C.ink, shadow: 'none' },
    good:  { background: `linear-gradient(135deg,${C.good},#3fbf75)`, color: '#052013', shadow: `0 0 22px ${C.good}44` },
    teal:  { background: `linear-gradient(135deg,${C.teal},#2b8fd0)`, color: '#03202e', shadow: `0 0 22px ${C.teal}44` },
  }
  const t = tones[tone] || tones.gold
  return {
    padding: '14px 18px',
    minHeight: 50,
    borderRadius: 14,
    border: tone === 'ghost' ? `2px solid ${C.lineHi}` : 'none',
    background: t.background,
    color: t.color,
    boxShadow: t.shadow,
    fontFamily: serif,
    fontWeight: 900,
    fontSize: 16,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    ...extra,
  }
}

export const label = (extra = {}) => ({
  display: 'block',
  color: C.dim,
  fontFamily: serif,
  fontSize: 12.5,
  letterSpacing: 2,
  marginBottom: 7,
  ...extra,
})

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Nunito:wght@700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;background:${C.bg};color:${C.ink};font-family:${sans};
  -webkit-text-size-adjust:100%;overscroll-behavior:none}
button{font-family:${sans}}
input,button{font-size:16px}                /* stops iOS zooming on focus */
.star{position:absolute;border-radius:50%;background:#fff;opacity:.55;
  animation:tw var(--dr) ease-in-out var(--dl) infinite alternate;pointer-events:none}
@keyframes tw{from{opacity:.12;transform:scale(.7)}to{opacity:.85;transform:scale(1.25)}}
.appear{animation:ap .45s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes ap{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
.wf{animation:wfl 3.4s ease-in-out infinite}
@keyframes wfl{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-12px) rotate(2deg)}}
.shake{animation:sh .42s}
@keyframes sh{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
.bh{transition:transform .12s ease, filter .12s ease}
.bh:active{transform:scale(.95)}
.bh:hover{filter:brightness(1.08)}
.pop{animation:pp 1.4s ease-out forwards;pointer-events:none}
@keyframes pp{0%{opacity:0;transform:translateY(6px) scale(.7)}18%{opacity:1;transform:translateY(-10px) scale(1.18)}100%{opacity:0;transform:translateY(-64px) scale(1)}}
.spark{position:absolute;pointer-events:none;animation:sp 1s ease-out forwards}
@keyframes sp{0%{opacity:0;transform:translate(0,0) scale(.4)}25%{opacity:1}100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(1.5)}}
.flare{position:fixed;inset:0;pointer-events:none;animation:fl .6s ease-out forwards;
  background:radial-gradient(circle at 50% 55%,rgba(255,238,194,.55),rgba(249,202,116,.15) 40%,transparent 72%)}
@keyframes fl{from{opacity:1}to{opacity:0}}
.pulseRing{animation:pr 1.1s ease-in-out infinite}
@keyframes pr{0%,100%{box-shadow:0 0 0 0 rgba(249,202,116,.5)}50%{box-shadow:0 0 0 12px rgba(249,202,116,0)}}
.spinner{display:inline-block;animation:sn 1s linear infinite}
@keyframes sn{to{transform:rotate(360deg)}}
.scroll{overflow-y:auto;-webkit-overflow-scrolling:touch}
.scroll::-webkit-scrollbar{width:8px}
.scroll::-webkit-scrollbar-thumb{background:${C.lineHi};border-radius:8px}
@media (prefers-reduced-motion: reduce){
  .wf,.pulseRing,.star{animation:none}
}
`
