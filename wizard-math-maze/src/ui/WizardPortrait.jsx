import { useId } from 'react'
import { resolveLook } from '../game/appearance.js'
import { portraitById, shade } from '../game/portraits.js'

// An original, front-facing SVG portrait renderer. The game still uses its
// canvas sprite in the maze; this component is purpose-built for choice cards,
// the hub, and the wardrobe where a player should be able to see their face.
export default function WizardPortrait({ appearance, form, size = 190, className, style, title }) {
  const look = resolveLook(appearance)
  const portrait = portraitById(appearance?.portrait)
  const uid = useId().replace(/:/g, '')
  const robe = form?.robe || '#6f6fae'
  const trim = form?.trim || '#a9a9d8'
  const hat = form?.hat || 'pointed'
  const label = title || `${portrait.name} wizard portrait`
  const hair = look.hairHex
  const skin = look.skinHex

  return (
    <svg viewBox="0 0 200 240" role="img" aria-label={label} className={className}
      width={size} height={size * 1.2} style={{ display: 'block', ...style }}>
      <defs>
        <linearGradient id={`${uid}-robe`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={shade(robe, 22)} /><stop offset="0.52" stopColor={robe} /><stop offset="1" stopColor={shade(robe, -35)} />
        </linearGradient>
        <linearGradient id={`${uid}-skin`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={shade(skin, 16)} /><stop offset="0.6" stopColor={skin} /><stop offset="1" stopColor={shade(skin, -18)} />
        </linearGradient>
        <radialGradient id={`${uid}-cheek`}><stop stopColor="#d97b70" stopOpacity=".22" /><stop offset="1" stopColor="#d97b70" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${uid}-hat`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={shade(robe, 28)} /><stop offset="1" stopColor={shade(robe, -46)} /></linearGradient>
        <clipPath id={`${uid}-faceclip`}><path d={portrait.face} /></clipPath>
      </defs>

      <g strokeLinecap="round" strokeLinejoin="round">
        <Shoulders robe={robe} trim={trim} gradient={`${uid}-robe`} />
        <Neck skin={skin} gradient={`${uid}-skin`} />
        <HairBack color={hair} styleId={look.hairStyle} />
        <Ears skin={skin} />
        <path d={portrait.face} fill={`url(#${uid}-skin)`} stroke={shade(skin, -42)} strokeWidth="2" />
        <FacePlanes portrait={portrait} clip={`${uid}-faceclip`} skin={skin} cheek={`${uid}-cheek`} />
        <Features portrait={portrait} look={look} />
        <HairFront portrait={portrait} color={hair} styleId={look.hairStyle} />
        <Hat kind={hat} robe={robe} trim={trim} />
      </g>
    </svg>
  )
}

function Shoulders({ robe, trim, gradient }) {
  return <>
    <path d="M27 239 L34 189 Q40 170 70 163 L100 174 L130 163 Q160 170 166 189 L173 239 Z" fill={`url(#${gradient})`} stroke={shade(robe, -48)} strokeWidth="2.4" />
    <path d="M42 188 Q64 164 100 169 Q136 164 158 188 L145 201 Q123 188 100 191 Q77 188 55 201 Z" fill={shade(robe, 28)} stroke={shade(robe, -35)} strokeWidth="1.8" />
    <path d="M68 168 L100 198 L132 168 L123 164 L100 177 L77 164 Z" fill={trim} opacity=".95" />
    <path d="M42 232 Q100 215 158 232" fill="none" stroke={shade(robe, -48)} strokeOpacity=".4" strokeWidth="2" />
    <circle cx="100" cy="188" r="6" fill={trim} stroke={shade(trim, -45)} strokeWidth="2" />
    <circle cx="98" cy="186" r="1.7" fill="#fff" opacity=".75" />
  </>
}

function Neck({ skin, gradient }) {
  return <path d="M83 139 Q85 157 76 166 Q88 181 100 181 Q112 181 124 166 Q115 157 117 139 Z" fill={`url(#${gradient})`} stroke={shade(skin, -38)} strokeWidth="1.6" />
}

function Ears({ skin }) {
  return <>
    <ellipse cx="60" cy="108" rx="8" ry="13" fill={shade(skin, -7)} stroke={shade(skin, -42)} strokeWidth="1.7" />
    <ellipse cx="140" cy="108" rx="8" ry="13" fill={shade(skin, -7)} stroke={shade(skin, -42)} strokeWidth="1.7" />
  </>
}

function FacePlanes({ portrait, clip, skin, cheek }) {
  return <g clipPath={`url(#${clip})`}>
    {portrait.cheek.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="19" ry="13" fill={`url(#${cheek})`} />)}
    <path d="M58 130 Q100 155 142 130 L142 160 L58 160 Z" fill={shade(skin, -34)} opacity=".16" />
    <path d="M60 75 Q100 58 140 75" fill="none" stroke="#ffffff" strokeOpacity=".13" strokeWidth="9" />
  </g>
}

function Features({ portrait, look }) {
  const [nx, ny, nw, nh] = portrait.nose
  const [mx, my, mw, lift] = portrait.mouth
  const smile = portrait.expression === 'thoughtful' ? 1 : portrait.expression === 'mischievous' ? 3.5 : lift
  return <>
    {portrait.eyes.map(([x, y, rx, ry, rotation], i) => <g key={i} transform={`rotate(${rotation} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fffaf4" stroke="#4a302a" strokeWidth="1.7" />
      <ellipse cx={x} cy={y + .5} rx={ry * .77} ry={ry * .77} fill={look.eyeHex} stroke={shade(look.eyeHex, -55)} strokeWidth="1" />
      <circle cx={x} cy={y + .6} r={ry * .38} fill="#1b1517" />
      <circle cx={x - ry * .23} cy={y - ry * .29} r={ry * .17} fill="#fff" />
      <path d={`M${x - rx} ${y - .5} Q${x} ${y - ry - 2.5} ${x + rx} ${y - .5}`} fill="none" stroke="#3b2623" strokeWidth="2.4" />
    </g>)}
    {portrait.brows.map(([x1, y1, x2, y2], i) => <path key={i} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 4} ${x2} ${y2}`} fill="none" stroke={shade(look.hairHex, -32)} strokeWidth="4" />)}
    <path d={`M${nx - 1} ${ny - nh} Q${nx - 3} ${ny - 2} ${nx - nw} ${ny + 1} Q${nx} ${ny + 4} ${nx + nw} ${ny + 1}`} fill="none" stroke={shade(look.skinHex, -52)} strokeOpacity=".55" strokeWidth="1.8" />
    <ellipse cx={nx} cy={ny + 1} rx={nw} ry="3.4" fill={shade(look.skinHex, -26)} opacity=".8" />
    <path d={`M${mx - mw} ${my - 1} Q${mx} ${my + smile} ${mx + mw} ${my - 1}`} fill="none" stroke="#7a403c" strokeWidth="2.4" />
    {look.beard?.id > 0 && <FacialHair portrait={portrait} color={look.hairHex} long={look.beard.id > 2} />}
  </>
}

function FacialHair({ portrait, color, long }) {
  const [mx, my, mw] = portrait.mouth
  return <g fill={shade(color, -5)} stroke={shade(color, -40)} strokeWidth="1.4">
    <path d={`M${mx - mw} ${my - 5} Q${mx - 7} ${my - 10} ${mx} ${my - 4} Q${mx + 7} ${my - 10} ${mx + mw} ${my - 5} Q${mx + 7} ${my + 1} ${mx} ${my - 1} Q${mx - 7} ${my + 1} ${mx - mw} ${my - 5} Z`} />
    {long && <path d={`M${mx - 18} ${my + 5} Q${mx - 19} ${my + 29} ${mx} ${my + 35} Q${mx + 19} ${my + 29} ${mx + 18} ${my + 5} Q${mx} ${my + 13} ${mx - 18} ${my + 5} Z`} opacity=".96" />}
  </g>
}

function HairBack({ color, styleId }) {
  const depth = [11, 17, 27, 39][styleId] || 17
  return <path d={`M60 82 Q55 115 63 ${145 + depth} Q72 ${165 + depth} 83 151 L117 151 Q128 ${165 + depth} 137 ${145 + depth} Q145 115 140 82 Q129 48 100 48 Q71 48 60 82 Z`} fill={shade(color, -15)} stroke={shade(color, -47)} strokeWidth="2" />
}

function HairFront({ portrait, color, styleId }) {
  const paths = {
    part: 'M62 84 Q66 51 97 49 Q82 69 78 86 Q88 76 99 60 Q113 75 128 84 Q133 65 121 51 Q141 58 139 88',
    soft: 'M61 85 Q61 52 94 48 Q79 67 82 87 Q94 71 103 55 Q113 75 130 86 Q133 63 121 51 Q141 58 139 88',
    curl: 'M59 90 Q55 55 82 50 Q76 62 83 72 Q89 51 102 51 Q110 61 116 70 Q124 52 139 59 Q143 76 139 92',
    centre: 'M63 84 Q67 48 99 45 Q93 63 99 77 Q105 62 116 49 Q138 55 138 88',
    sweep: 'M60 88 Q66 49 103 48 Q95 62 79 77 Q105 65 127 55 Q141 65 138 91',
    side: 'M62 88 Q67 51 104 48 Q94 62 78 81 Q101 65 131 62 Q140 72 138 92',
  }
  const d = paths[portrait.hairline] || paths.part
  const lock = styleId > 1 ? <><path d="M68 85 Q61 119 71 143" fill="none" /><path d="M132 85 Q139 119 129 143" fill="none" /></> : null
  return <g fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"><path d={d} />{lock}</g>
}

function Hat({ kind, robe, trim }) {
  const fill = shade(robe, -4), edge = shade(robe, -48)
  if (kind === 'hood') return <g><path d="M48 167 Q44 90 72 46 Q100 25 128 46 Q156 90 152 167 L131 150 Q143 113 126 75 Q100 58 74 75 Q57 113 69 150 Z" fill={fill} stroke={edge} strokeWidth="3" /><path d="M68 151 Q61 111 76 75 Q100 60 124 75 Q139 111 132 151" fill="none" stroke={trim} strokeWidth="4" opacity=".8" /></g>
  if (kind === 'wide') return <g><path d="M57 76 Q69 25 100 20 Q131 25 143 76 Z" fill={fill} stroke={edge} strokeWidth="3" /><path d="M28 81 Q54 66 100 69 Q146 66 172 81 Q150 95 100 94 Q50 95 28 81 Z" fill={fill} stroke={edge} strokeWidth="3" /><path d="M57 73 Q100 82 143 73" fill="none" stroke={trim} strokeWidth="7" /></g>
  if (kind === 'horned') return <g><path d="M62 77 Q68 28 100 22 Q132 28 138 77 Z" fill={fill} stroke={edge} strokeWidth="3" /><path d="M64 55 Q46 28 50 16 Q72 28 78 53 M136 55 Q154 28 150 16 Q128 28 122 53" fill={trim} stroke={edge} strokeWidth="2" /><path d="M43 80 Q72 68 100 70 Q128 68 157 80 Q140 91 100 91 Q60 91 43 80 Z" fill={fill} stroke={edge} strokeWidth="3" /></g>
  if (kind === 'crown') return <g><path d="M55 73 L61 39 L79 56 L100 30 L121 56 L139 39 L145 73 Z" fill={trim} stroke={shade(trim, -48)} strokeWidth="3" /><path d="M48 77 Q100 64 152 77 Q135 92 100 91 Q65 92 48 77 Z" fill={fill} stroke={edge} strokeWidth="3" /></g>
  return <g><path d="M61 76 Q67 31 91 17 L106 42 Q119 25 131 31 Q138 53 139 76 Z" fill={fill} stroke={edge} strokeWidth="3" /><path d="M35 80 Q59 67 100 69 Q141 67 165 80 Q146 94 100 93 Q54 94 35 80 Z" fill={fill} stroke={edge} strokeWidth="3" /><path d="M59 72 Q100 81 141 72" fill="none" stroke={trim} strokeWidth="7" /></g>
}
