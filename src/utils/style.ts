// Shared visual helpers for the "Heirloom Modern" design.

export const GEN_NAMES = [
  'Founder',
  '2nd generation',
  '3rd generation',
  '4th generation',
  '5th generation',
  '6th generation',
  '7th generation',
]

// Accent stripe colour per generation (depth). Founder is brass.
export const GEN_COLOR = [
  '#b0873f', // founder
  '#1f4d3f',
  '#2c6b56',
  '#4f7a8b',
  '#8a6d9c',
  '#a8607a',
  '#b5763b',
]

// Curated warm avatar gradients, chosen deterministically by name.
const AVA: Array<[string, string]> = [
  ['#2c6b56', '#1f4d3f'],
  ['#4f7a8b', '#355763'],
  ['#a8607a', '#7c3f54'],
  ['#8a6d9c', '#5f4a73'],
  ['#b0873f', '#7a5a24'],
  ['#5a8a6e', '#3c6650'],
  ['#c08a5a', '#8a5c2f'],
]

export function avatarColors(name: string): [string, string] {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVA[h % AVA.length]
}

export function avatarGradient(name: string): string {
  const [a, b] = avatarColors(name)
  return `linear-gradient(135deg, ${a}, ${b})`
}

export function genColor(depth: number): string {
  return GEN_COLOR[Math.min(Math.max(depth, 0), GEN_COLOR.length - 1)]
}

export function genName(depth: number): string {
  return GEN_NAMES[Math.min(Math.max(depth, 0), GEN_NAMES.length - 1)]
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
