import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppState } from '../state/appState'
import type { WordItem } from '../types'

export default function Study() {
  const [q] = useSearchParams()
  const mode = q.get('mode') || 'flashcards'
  if (mode !== 'flashcards') return <OtherModes mode={mode} />
  return <Flashcards />
}

function OtherModes({ mode }: { mode: string }) {
  const { filteredItems } = useAppState()
  return (
    <div className="wrap p-4">
      <h1 className="text-2xl font-semibold mb-1">Estudio</h1>
      <p className="text-gray-600 mb-4">
        Modo: <span className="font-mono">{mode}</span> · Items cargados: {filteredItems.length}
      </p>
      <div className="card bg-gray-50">
        Próximamente enchufamos la lógica de <b>{mode}</b>.
      </div>
    </div>
  )
}

/* ============ FLASHCARDS SRS ============ */

function Flashcards() {
  const { getDueQueue, answerItem, dailyGoal, dailyCount } = useAppState()
  const [queue, setQueue] = useState<WordItem[]>([])
  const [idx, setIdx] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const current = queue[idx]

  useEffect(() => {
    (async () => {
      const q = await getDueQueue(100)
      setQueue(q)
      setIdx(0)
      setShowBack(false)
    })()
  }, [getDueQueue])

  function nextCard() {
    setShowBack(false)
    setIdx(i => Math.min(i + 1, queue.length))
  }

  async function onAnswer(quality: 3 | 4 | 5) {
    if (!current) return
    const score = quality === 5 ? 3 : quality === 4 ? 2 : 1
    await answerItem(current.id, quality, score)
    nextCard()
  }

  const progress = useMemo(() => {
    const studied = Math.min(dailyCount, dailyGoal)
    const pct = Math.round((studied / dailyGoal) * 100)
    return { studied, pct }
  }, [dailyCount, dailyGoal])

  return (
    <div className="wrap p-4">
      <h1 className="text-2xl font-semibold mb-2">Flashcards (SRS)</h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="badge">Due: {queue.length}</span>
        <span className="badge">Meta: {progress.studied}/{dailyGoal} ({progress.pct}%)</span>
      </div>
      <div className="progress mb-6">
        <div className="progress-bar" style={{ width: `${progress.pct}%` }} />
      </div>

      {!current ? (
        <div className="card bg-green-50">
          <div className="font-medium">¡No hay más tarjetas pendientes ahora mismo!</div>
          <div className="text-sm text-green-700">Vuelve más tarde o cambia la categoría.</div>
        </div>
      ) : (
        <div className="card">
          <div className="text-sm text-gray-500 mb-2">{idx + 1}/{queue.length}</div>

          <div className="text-2xl font-semibold mb-3">{current.word}</div>

          {showBack ? (
            <div className="space-y-2">
              <div className="text-gray-800">{current.definition_en}</div>
              {current.example_en && (
                <div className="text-gray-600 italic">“{current.example_en}”</div>
              )}
              {current.translation_es && (
                <div className="text-gray-700">ES: {current.translation_es}</div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              Pulsa “Ver respuesta” para revelar definición y ejemplo.
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {!showBack ? (
              <button className="btn" onClick={() => setShowBack(true)}>
                Ver respuesta
              </button>
            ) : (
              <>
                <button className="btn" onClick={() => onAnswer(3)} title="Difícil">Difícil</button>
                <button className="btn" onClick={() => onAnswer(4)} title="Medio">Medio</button>
                <button className="btn btn-primary" onClick={() => onAnswer(5)} title="Fácil">Fácil</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
