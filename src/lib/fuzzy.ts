// Normaliza texto: minúsculas, sin tildes, espacios únicos, guiones ≈ espacio
export function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’"]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Distancia de Levenshtein iterativa (memoria O(min(a,b)))
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const v0 = new Array(b.length + 1).fill(0)
  const v1 = new Array(b.length + 1).fill(0)
  for (let i = 0; i <= b.length; i++) v0[i] = i
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j]
  }
  return v1[b.length]
}

function allowedTypos(len: number): number {
  if (len <= 4) return 0
  if (len <= 7) return 1
  if (len <= 11) return 2
  if (len <= 15) return 3
  return Math.floor(len * 0.25)
}

export type Verdict = 'exact' | 'near' | 'fail'

export function gradeSpelling(given: string, target: string): {
  verdict: Verdict; score: 0|2|3; dist: number; threshold: number
} {
  const g = normalize(given)
  const t = normalize(target)
  if (!t) return { verdict: 'fail', score: 0, dist: 0, threshold: 0 }
  if (g === t) return { verdict: 'exact', score: 3, dist: 0, threshold: 0 }
  const d = levenshtein(g, t)
  const thr = allowedTypos(t.length)
  if (d <= thr) return { verdict: 'near', score: 2, dist: d, threshold: thr }
  return { verdict: 'fail', score: 0, dist: d, threshold: thr }
}

// Para “escribe la definición”: similitud por bolsa de palabras (sin stopwords)
const STOP = new Set(['the','a','an','of','to','and','in','on','for','with','at','by','from','as','is','are','was','were','be','been','being','it','that','this','these','those','or','not','but'])
function tokens(s: string): string[] {
  return normalize(s).split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w))
}
export function gradeDefinition(given: string, target: string): {
  verdict: Verdict; score: 0|2|3; ratio: number
} {
  const g = new Set(tokens(given))
  const t = new Set(tokens(target))
  if (!t.size) return { verdict: 'fail', score: 0, ratio: 0 }
  const inter = [...g].filter(x => t.has(x)).length
  const union = new Set([...g, ...t]).size
  const r = union ? inter / union : 0
  if (r >= 0.85) return { verdict: 'exact', score: 3, ratio: r }
  if (r >= 0.5)  return { verdict: 'near',  score: 2, ratio: r }
  return { verdict: 'fail', score: 0, ratio: r }
}
