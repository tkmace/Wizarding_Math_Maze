// --- Portrait identities -----------------------------------------------------
// These are intentionally not costumes. A portrait describes the stable face
// geometry of a wizard; `skins.js` still owns every earned robe, hat, and aura.

export const PORTRAITS = [
  {
    id: 'sage', name: 'Sage',
    face: 'M100 45 C132 46 143 70 140 105 C138 130 124 150 100 154 C76 150 62 130 60 105 C57 70 68 46 100 45 Z',
    eyes: [[78, 94, 13, 6, -4], [122, 93, 13, 6, 4]],
    brows: [[66, 81, 88, 78], [112, 78, 134, 81]], nose: [100, 104, 5, 11], mouth: [100, 125, 16, 4],
    cheek: [[78, 113], [123, 112]], expression: 'calm', hairline: 'part',
  },
  {
    id: 'river', name: 'River',
    face: 'M100 44 C130 45 143 70 141 105 C140 134 125 153 100 155 C75 153 60 134 59 105 C57 70 70 45 100 44 Z',
    eyes: [[78, 96, 12, 6.5, -2], [122, 96, 12, 6.5, 2]],
    brows: [[67, 83, 88, 82], [112, 82, 133, 83]], nose: [100, 107, 4.5, 10], mouth: [100, 127, 15, 4],
    cheek: [[77, 115], [123, 115]], expression: 'warm', hairline: 'soft',
  },
  {
    id: 'ember', name: 'Ember',
    face: 'M100 47 C136 46 148 73 144 107 C140 135 126 151 100 153 C74 151 60 135 56 107 C52 73 64 46 100 47 Z',
    eyes: [[76, 95, 13, 6.8, -2], [124, 95, 13, 6.8, 2]],
    brows: [[63, 81, 87, 80], [113, 80, 137, 81]], nose: [100, 106, 5.5, 9], mouth: [100, 126, 18, 5],
    cheek: [[75, 113], [125, 113]], expression: 'friendly', hairline: 'curl',
  },
  {
    id: 'meadow', name: 'Meadow',
    face: 'M100 38 C128 39 140 66 138 106 C137 137 122 160 100 163 C78 160 63 137 62 106 C60 66 72 39 100 38 Z',
    eyes: [[79, 96, 12, 5.5, -3], [121, 96, 12, 5.5, 3]],
    brows: [[67, 82, 88, 80], [112, 80, 133, 82]], nose: [100, 109, 4.3, 13], mouth: [100, 134, 14, 3],
    cheek: [[78, 119], [122, 119]], expression: 'thoughtful', hairline: 'centre',
  },
  {
    id: 'comet', name: 'Comet',
    face: 'M100 49 C133 48 145 72 142 105 C139 131 125 148 100 150 C75 148 61 131 58 105 C55 72 67 48 100 49 Z',
    eyes: [[77, 94, 13, 7, -2], [123, 94, 13, 7, 2]],
    brows: [[65, 80, 87, 78], [113, 78, 135, 80]], nose: [100, 105, 4.5, 9], mouth: [100, 125, 16, 5],
    cheek: [[76, 111], [124, 111]], expression: 'playful', hairline: 'sweep',
  },
  {
    id: 'riddle', name: 'Riddle',
    face: 'M99 43 C130 43 143 68 140 104 C138 132 123 154 98 156 C74 154 60 132 59 104 C57 68 69 43 99 43 Z',
    eyes: [[77, 95, 12, 6, -4], [122, 94, 13, 6.3, 4]],
    brows: [[66, 79, 87, 77], [111, 82, 134, 82]], nose: [99, 106, 4.5, 10], mouth: [99, 128, 16, 3],
    cheek: [[76, 114], [122, 113]], expression: 'mischievous', hairline: 'side',
  },
]

export const DEFAULT_PORTRAIT = 'sage'

export function portraitById(id) {
  return PORTRAITS.find(p => p.id === id) || PORTRAITS[0]
}

// Kept here rather than borrowing the canvas renderer helpers so the SVG
// renderer remains self-contained and can later be used server-side.
export function shade(hex, amount) {
  const value = String(hex || '#808080').replace('#', '')
  const channel = offset => Math.max(0, Math.min(255, parseInt(value.slice(offset, offset + 2), 16) + amount))
  return `#${[channel(0), channel(2), channel(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
