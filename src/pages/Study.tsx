import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppState } from '../state/appState'
import type { WordItem } from '../types'
import { hasTTS, loadVoicesReady, pickEnglishVoice, speak, stop } from '../lib/tts'

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

/* ============ FLASHCARDS SRS (con flip + TTS) ============ */

type FrontSide = 'word' | 'definition'

function Flashcards() {
  const { getDueQueue, answerItem, dailyGoal, dailyCount } = useAppState()

  // Cola de estudio
  const [queue, setQueue] = useState<WordItem[]>([])
  const [idx, setIdx] = useState(0)
  const current = queue[idx]

  // Lado de estudio y revelado
  const [front, setFront] = useState<FrontSide>('word')
  const [showBack, setShowBack] = useState(false)

  // TTS
  const [ttsOn, setTtsOn] = useState<boolean>(() => localStorage.getItem('et_tts') === '1')
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)

  // Carga cola (estable gracias a useCallback en AppState)
  useEffect(() => {
    (async () => {
      const q = await getDueQueue(100)
      setQueue(q)
      setIdx(0)
      setShowBack(false)
    })()
  }, [getDueQueue])

  // Inicializa voces TTS
  useEffect(() => {
    if (!hasTTS()) return
    loadVoicesReady().then(vs => setVoice(pickEnglishVoice(vs)))
  }, [])

  // Auto-TTS: pronuncia al mostrar frente/reverso si está activado
  useEffect(() => {
    if (!ttsOn || !current) return
    if (front === 'word') {
      if (!showBack) speak(current.word, voice)
      else if (current.example_en) speak(current.example_en, voice)
    } else {
      if (!showBack) speak(current.definition_en || current.translation_es || '', voice)
      else speak(current.word, voice)
    }
    // al cambiar de tarjeta paramos/relanzamos
    return () => stop()
  }, [current?.id, showBack, ttsOn, voice, front])

  // Atajos: Space = flip, 1/2/3 = difícil/medio/fácil, S = speak
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return
      if (e.key === ' ') { e.preventDefault(); setShowBack(s => !s); return }
      if (e.key === '1' && showBack) onAnswer(3)
      if (e.key === '2' && showBack) onAnswer(4)
      if (e.key === '3' && showBack) onAnswer(5)
      if (e.key.toLowerCase() === 's') manualSpeak()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, showBack, voice, ttsOn, front])

  function nextCard() {
    setShowBack(false)
    setIdx(i => Math.min(i + 1, queue.length))
    stop()
  }

  async function onAnswer(quality: 3 | 4 | 5) {
    if (!current) return
    const score = quality === 5 ? 3 : quality === 4 ? 2 : 1
    await answerItem(current.id, quality, score)
    nextCard()
  }

  function flipSide() {
    setShowBack(false)
    setFront(f => (f === 'word' ? 'definition' : 'word'))
  }

  function toggleTTS() {
    const next = !ttsOn
    setTtsOn(next)
    localStorage.setItem('et_tts', next ? '1' : '0')
    if (!next) stop()
  }

  function manualSpeak() {
    if (!current) return
    const text = !showBack
      ? (front === 'word' ? current.word : (current.definition_en || current.translation_es || ''))
      : (front === 'word' ? (current.example_en || current.definition_en || '') : current.word)
    speak(text, voice)
  }

  const progress = useMemo(() => {
    const studied = Math.min(dailyCount, dailyGoal)
    const pct = Math.round((studied / dailyGoal) * 100)
    return { studied, pct }
  }, [dailyCount, dailyGoal])

  // Render helpers del frente/reverso
  function FrontView({ item }: { item: WordItem }) {
    if (front === 'word') return <div className="text-2xl font-semibold mb-3">{item.word}</div>
    return (
      <div className="space-y-2">
        <div className="text-gray-800">{item.definition_en || '—'}</div>
        {item.translation_es && <div className="text-gray-700">ES: {item.translation_es}</div>}
      </div>
    )
  }
  function BackView({ item }: { item: WordItem }) {
    if (front === 'word') {
      return (
        <div className="space-y-2">
          <div className="text-gray-800">{item.definition_en}</div>
          {item.example_en && <div className="text-gray-600 italic">“{item.example_en}”</div>}
          {item.translation_es && <div className="text-gray-700">ES: {item.translation_es}</div>}
        </div>
      )
    }
    return <div className="text-2xl font-semibold mb-3">{item.word}</div>
  }

  return (
    <div className="wrap p-4">
      <h1 className="text-2xl font-semibold mb-2">Flashcards (SRS)</h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="badge">Due: {queue.length}</span>
        <span className="badge">Meta: {progress.studied}/{dailyGoal} ({progress.pct}%)</span>
        <button className="btn btn-ghost" onClick={flipSide} title="Invertir lado (Word ↔ Definition)">
          ⇆ Lado: {front === 'word' ? 'Palabra→Def' : 'Def→Palabra'}
        </button>
        {hasTTS() && (
          <>
            <button className={`btn ${ttsOn ? 'btn-primary' : ''}`} onClick={toggleTTS} title="Activar/desactivar TTS">
              🔊 {ttsOn ? 'TTS ON' : 'TTS OFF'}
            </button>
            <button className="btn" onClick={manualSpeak} title="Reproducir (S)">
              ▶️ Reproducir
            </button>
          </>
        )}
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

          {!showBack ? <FrontView item={current} /> : <BackView item={current} />}

          <div className="mt-4 flex flex-wrap gap-2">
            {!showBack ? (
              <>
                <button className="btn" onClick={() => setShowBack(true)} title="Mostrar respuesta (Espacio)">
                  Ver respuesta
                </button>
                <button className="btn btn-ghost" onClick={manualSpeak} title="Reproducir (S)">
                  ▶️
                </button>
              </>
            ) : (
              <>
                <button className="btn" onClick={() => onAnswer(3)} title="Difícil (1)">Difícil</button>
                <button className="btn" onClick={() => onAnswer(4)} title="Medio (2)">Medio</button>
                <button className="btn btn-primary" onClick={() => onAnswer(5)} title="Fácil (3)">Fácil</button>
              </>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Atajos: <kbd>Espacio</kbd> = ver respuesta · <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> = difícil/medio/fácil · <kbd>S</kbd> = reproducir
          </div>
        </div>
      )}
    </div>
  )
}
