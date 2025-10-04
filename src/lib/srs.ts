import type { ItemProgress, SRSData } from '../types'

export function defaultSRS(): SRSData {
  return {
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    lastReviewISO: null,
    nextReviewISO: null,
  }
}

function nextISOFromInterval(days: number): string {
  const d = new Date()
  d.setHours(3, 0, 0, 0)
  d.setDate(d.getDate() + Math.max(0, Math.round(days)))
  return d.toISOString()
}

export function updateSRS(prev: SRSData | undefined, quality: 3|4|5): SRSData {
  const srs = prev ? { ...prev } : defaultSRS()
  const q = quality
  srs.easiness = srs.easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  srs.easiness = Math.max(1.3, srs.easiness)

  if (q < 3) {
    srs.repetitions = 0
    srs.interval = 1
  } else {
    srs.repetitions = (srs.repetitions || 0) + 1
    if (srs.repetitions === 1) srs.interval = 1
    else if (srs.repetitions === 2) srs.interval = 6
    else srs.interval = Math.round(srs.interval * srs.easiness)
  }

  srs.lastReviewISO = new Date().toISOString()
  srs.nextReviewISO = nextISOFromInterval(srs.interval)
  return srs
}

export function applyAnswer(
  prev: ItemProgress | undefined,
  itemId: string,
  quality: 3|4|5,
  score: number
): ItemProgress {
  const srs = updateSRS(prev?.srs, quality)
  const totalAnswers = (prev?.totalAnswers || 0) + 1
  const correctStreak = quality >= 4 ? (prev?.correctStreak || 0) + 1 : 0
  return { id: itemId, srs, totalAnswers, correctStreak, lastScore: score }
}

// Fallo explícito: baja un poco la easiness, repeticiones 0, intervalo 1 (mañana)
export function applyFailure(
  prev: ItemProgress | undefined,
  itemId: string
): ItemProgress {
  const base = prev?.srs || defaultSRS()
  const srs: SRSData = {
    ...base,
    easiness: Math.max(1.3, (base.easiness || 2.5) - 0.2),
    repetitions: 0,
    interval: 1,
    lastReviewISO: new Date().toISOString(),
    nextReviewISO: nextISOFromInterval(1),
  }
  const totalAnswers = (prev?.totalAnswers || 0) + 1
  return { id: itemId, srs, totalAnswers, correctStreak: 0, lastScore: 0 }
}

export function isDue(srs?: SRSData): boolean {
  if (!srs?.nextReviewISO) return true
  return new Date(srs.nextReviewISO).getTime() <= Date.now()
}
