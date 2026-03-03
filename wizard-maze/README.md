# 🧙 Wizard Math Maze

A kids' educational math game built with React + Vite.

## Deploy to Vercel (Recommended)

### Option A — GitHub + Vercel (easiest)
1. Create a GitHub repo and push this folder to it
2. Go to [vercel.com](https://vercel.com) → "Add New Project"
3. Import your GitHub repo
4. Vercel auto-detects Vite — just click **Deploy**
5. Done! You'll get a live URL like `wizard-math-maze.vercel.app`

### Option B — Vercel CLI
```bash
npm install -g vercel
cd wizard-math-maze
npm install
vercel
```

## Run Locally
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Build for Production
```bash
npm run build
npm run preview
```

## Project Structure
```
wizard-math-maze/
├── index.html              # Entry HTML
├── vite.config.js          # Vite config
├── vercel.json             # Vercel deployment config
├── package.json
└── src/
    ├── main.jsx            # React entry point
    └── WizardMathMaze.jsx  # The full game
```
