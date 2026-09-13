// Harness for the one thing that made a maze walk itself: the movement pad's
// hold-to-repeat outliving the pad. Mounts Controls, holds a button, then tears
// the component down mid-press with no pointer-up — exactly what stepping onto
// the exit does — and watches whether the moves keep coming.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Controls from './src/ui/Controls.jsx'

window.__moves = 0
function Harness() {
  const [mounted, setMounted] = useState(true)
  const [disabled, setDisabled] = useState(false)
  window.__unmount = () => setMounted(false)
  window.__disable = () => setDisabled(true)
  return mounted ? <Controls onAction={() => { window.__moves++ }} disabled={disabled} /> : null
}
createRoot(document.getElementById('root')).render(<Harness />)
window.__done = true
