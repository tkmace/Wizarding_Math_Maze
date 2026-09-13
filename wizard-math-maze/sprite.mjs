// Render a contact sheet of every form so the art can be eyeballed at once.
import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--disable-dev-shm-usage'] })
const page = await b.newPage({ viewport:{ width: 1000, height: 760 }, deviceScaleFactor: 2 })
const mod = await import('./src/game/skins.js')
await page.setContent(`<body style="margin:0;background:#0b0a22"><canvas id=c width=2000 height=1520></canvas></body>`)
await page.addScriptTag({ path: './src/engine/wizardSprite.js', type: 'module' }).catch(()=>{})
const code = (await import('fs')).readFileSync('./src/engine/wizardSprite.js','utf8').replace(/export /g,'')
await page.evaluate(({ code, forms }) => {
  eval(code)
  const ctx = document.getElementById('c').getContext('2d')
  ctx.scale(2,2)
  const cols = 7, cell = 140
  forms.forEach((f, i) => {
    const cx = (i % cols) * cell + cell/2, cy = Math.floor(i/cols) * cell + cell
    drawWizard(ctx, { x: cx, yBase: cy - 22, h: cell*0.72, form: f, t: 1200, moving: false, view: 'front' })
    ctx.fillStyle = '#c8a4ff'; ctx.font = '600 9px sans-serif'; ctx.textAlign='center'
    ctx.fillText(f.title, cx, cy - 8)
    ctx.fillStyle = '#5b5b96'; ctx.fillText('r'+f.rank+' · '+f.hat+' · '+f.staff+(f.aura?' · '+f.aura:''), cx, cy + 2)
  })
}, { code, forms: mod.FORMS })
await page.screenshot({ path: '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad/50-all-forms.png' })
// And a back view, as seen in the maze
await page.evaluate(({ code, forms }) => {
  eval(code)
  const ctx = document.getElementById('c').getContext('2d')
  ctx.clearRect(0,0,2000,1520)
  const cols = 7, cell = 140
  forms.forEach((f, i) => {
    const cx = (i % cols) * cell + cell/2, cy = Math.floor(i/cols) * cell + cell
    drawWizard(ctx, { x: cx, yBase: cy - 22, h: cell*0.72, form: f, t: 1200, moving: true, view: 'back' })
    ctx.fillStyle = '#c8a4ff'; ctx.font = '600 9px sans-serif'; ctx.textAlign='center'
    ctx.fillText(f.title, cx, cy - 8)
  })
}, { code, forms: mod.FORMS })
await page.screenshot({ path: '/tmp/claude-0/-home-claude/9e4f1146-1d92-5690-b689-30dcc0c1e170/scratchpad/51-all-forms-back.png' })
console.log('contact sheets rendered')
await b.close()
