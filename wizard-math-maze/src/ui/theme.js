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
/* iPadOS treats a long press on a button as a text selection and throws up its
   own callout, which lands right on top of the movement pad when a child holds
   ▲ to walk down a corridor. Nothing in this game is text you'd want to select. */
button,canvas{-webkit-touch-callout:none;-webkit-user-select:none;
  -moz-user-select:none;-ms-user-select:none;user-select:none}
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
/* The same pop, but it HOLDS. "The exit is sealed" is an instruction, not a
   flourish: it has to stay up long enough to be read by someone who is still
   learning to read. */
.popLong{animation:ppl 3.6s ease-out forwards;pointer-events:none}
@keyframes ppl{0%{opacity:0;transform:translateY(8px) scale(.75)}
  9%{opacity:1;transform:translateY(-8px) scale(1.1)}
  16%,74%{opacity:1;transform:translateY(-8px) scale(1)}
  100%{opacity:0;transform:translateY(-40px) scale(1)}}
.spark{position:absolute;pointer-events:none;animation:sp 1s ease-out forwards}
@keyframes sp{0%{opacity:0;transform:translate(0,0) scale(.4)}25%{opacity:1}100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(1.5)}}
.flare{position:fixed;inset:0;pointer-events:none;animation:fl .6s ease-out forwards;
  background:radial-gradient(circle at 50% 55%,rgba(255,238,194,.55),rgba(249,202,116,.15) 40%,transparent 72%)}
@keyframes fl{from{opacity:1}to{opacity:0}}
.pulseRing{animation:pr 1.1s ease-in-out infinite}
@keyframes pr{0%,100%{box-shadow:0 0 0 0 rgba(249,202,116,.5)}50%{box-shadow:0 0 0 12px rgba(249,202,116,0)}}
.spinner{display:inline-block;animation:sn 1s linear infinite}
@keyframes sn{to{transform:rotate(360deg)}}

/* --- The rank-up celebration ---------------------------------------------
   Earning new robes is the reward the whole point ladder is built around, so
   it gets its own entrance rather than sharing the win screen's. The banner
   drops in and overshoots; the ribbon sweeps a shine across it; the confetti
   falls from above the fold. All of it stops under prefers-reduced-motion. */
.rankIn{animation:rkin .75s cubic-bezier(.18,1.3,.4,1) both}
@keyframes rkin{0%{opacity:0;transform:scale(.55) translateY(-26px) rotate(-4deg)}
  60%{opacity:1;transform:scale(1.06) translateY(0) rotate(1deg)}
  100%{opacity:1;transform:scale(1) translateY(0) rotate(0)}}
.rankGlow{animation:rkg 2.2s ease-in-out infinite}
@keyframes rkg{0%,100%{box-shadow:0 0 22px 2px rgba(249,202,116,.35), inset 0 0 26px rgba(249,202,116,.12)}
  50%{box-shadow:0 0 42px 8px rgba(249,202,116,.6), inset 0 0 40px rgba(249,202,116,.22)}}
.shine{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
.shine::after{content:'';position:absolute;top:-60%;left:-140%;width:60%;height:220%;
  transform:rotate(18deg);animation:shn 2.8s ease-in-out .6s infinite;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.36),transparent)}
@keyframes shn{0%{left:-140%}45%,100%{left:160%}}
.confetti{position:fixed;top:-6vh;pointer-events:none;z-index:40;
  animation:cfl var(--dur) linear var(--dl) forwards}
@keyframes cfl{0%{opacity:0;transform:translateY(0) rotate(0)}
  8%{opacity:1}
  100%{opacity:0;transform:translateY(112vh) rotate(var(--spin))}}
.bigStar{animation:bst 1.6s ease-in-out infinite}
@keyframes bst{0%,100%{transform:scale(1) rotate(-6deg)}50%{transform:scale(1.14) rotate(6deg)}}
@media (prefers-reduced-motion: reduce){
  .rankIn,.rankGlow,.shine::after,.confetti,.bigStar{animation:none}
  .confetti{display:none}
}
.scroll{overflow-y:auto;-webkit-overflow-scrolling:touch}
.scroll::-webkit-scrollbar{width:8px}
.scroll::-webkit-scrollbar-thumb{background:${C.lineHi};border-radius:8px}
@media (prefers-reduced-motion: reduce){
  .wf,.pulseRing,.star{animation:none}
}
`
