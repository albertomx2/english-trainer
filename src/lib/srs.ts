import type { ItemProgress, SRSData, SRSEaseQuality } from '../types'

export function defaultSRS(): SRSData {
  return {
    easiness: 2.5,       // SM-2 arranque
    interval: 0,
    repetitions: 0,
    lastReviewISO: null,
    nextReviewISO: null,
  }
}

/** Calcula la siguiente fecha (hoy + interval días) en ISO local */
function nextISOFromInterval(days: number): string {
  const d = new Date()
  d.setHours(3, 0, 0, 0) // fija hora baja para evitar cambios DST
  d.setDate(d.getDate() + Math.max(0, Math.round(days)))
  return d.toISOString()
}

/**
 * SM-2 simplificado para 3 botones:
 * - Difícil (3) → menor bajada de intervalo, baja easiness
 * - Medio   (4) → medio
 * - Fácil   (5) → sube más intervalo
 *
 * Notas:
 * - si quality < 3 (no lo usamos) ⇒ reset parcial
 * - clamps: easiness mínimo ~1.3
 */
export function updateSRS(prev: SRSData | undefined, quality: SRSEaseQuality): SRSData {
  const srs = prev ? { ...prev } : defaultSRS()

  // ajusta easiness (ecuación SM-2 original aproximada)
  const q = quality
  srs.easiness = srs.easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  srs.easiness = Math.max(1.3, srs.easiness)

  if (q < 3) {
    // no lo usamos, pero por si se quiere un botón “fallo” en el futuro
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

/** Crea/actualiza un progreso de ítem a partir de calidad (3/4/5). */
export function applyAnswer(
  prev: ItemProgress | undefined,
  itemId: string,
  quality: SRSEaseQuality,
  score: number
): ItemProgress {
  const srs = updateSRS(prev?.srs, quality)
  const totalAnswers = (prev?.totalAnswers || 0) + 1
  const correctStreak = quality >= 4 ? (prev?.correctStreak || 0) + 1 : 0
  return {
    id: itemId,
    srs,
    totalAnswers,
    correctStreak,
    lastScore: score,
  }
}

/** Devuelve si un ítem está “debido” (toca repasar) */
export function isDue(srs?: SRSData): boolean {
  if (!srs?.nextReviewISO) return true // nunca visto ⇒ due
  return new Date(srs.nextReviewISO).getTime() <= Date.now()
}
