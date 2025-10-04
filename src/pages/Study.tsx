import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppState } from '../state/appState'
import type { WordItem } from '../types'
import { hasTTS, loadVoicesReady, pickEnglishVoice, speak, stop } from '../lib/tts'
import { gradeSpelling, gradeDefinition, type Verdict } from '../lib/fuzzy'

export default function Study() {
  const [q] = useSearchParams()
  const mode = q.get('mode') || 'flashcards'
  if (mode === 'typeit') return <TypeIt />
  if (mode === 'cloze') return <Cloze />
  if (mode === 'rapid') return <RapidFire />
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

/* ===================== FLASHCARDS SRS (con flip + TTS) ===================== */

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

  // Carga cola
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

  // Auto-TTS
  useEffect(() => {
    if (!ttsOn || !current) return
    if (front === 'word') {
      if (!showBack) speak(current.word, voice)
      else if (current.example_en) speak(current.example_en, voice)
    } else {
      if (!showBack) speak(current.definition_en || current.translation_es || '', voice)
      else speak(current.word, voice)
    }
    return () => stop()
  }, [current?.id, showBack, ttsOn, voice, front])

  // Atajos
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

/* ===================== TYPE-IT (entrada libre) ===================== */

type Target = 'word' | 'definition'

function TypeIt() {
  const { getDueQueue, answerGraded, dailyGoal, dailyCount } = useAppState()
  const [queue, setQueue] = useState<WordItem[]>([])
  const [idx, setIdx] = useState(0)
  const [target, setTarget] = useState<Target>('word')
  const [value, setValue] = useState('')
  const [result, setResult] = useState<null | { verdict: Verdict; score: 0|2|3; info: string }>(null)

  const current = queue[idx]

  useEffect(() => {
    (async () => {
      const q = await getDueQueue(100)
      setQueue(q)
      setIdx(0)
      setValue('')
      setResult(null)
    })()
  }, [getDueQueue])

  const progress = useMemo(() => {
    const studied = Math.min(dailyCount, dailyGoal)
    const pct = Math.round((studied / dailyGoal) * 100)
    return { studied, pct }
  }, [dailyCount, dailyGoal])

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === 'Enter') check() }

  function check() {
    if (!current || !value.trim()) return

    if (target === 'word') {
      const g = gradeSpelling(value, current.word)
      const msg =
        g.verdict === 'exact' ? '¡Perfecto!' :
        g.verdict === 'near'  ? `Casi: distancia ${g.dist} (umbral ${g.threshold}).` :
                                'Incorrecto.'
      setResult({ verdict: g.verdict, score: g.score, info: msg })
    } else {
      const g = gradeDefinition(value, current.definition_en || '')
      const msg =
        g.verdict === 'exact' ? 'Definición muy cercana.' :
        g.verdict === 'near'  ? `Bastante bien (similitud ${(g.ratio*100).toFixed(0)}%).` :
                                'Demasiado diferente.'
      setResult({ verdict: g.verdict, score: g.score, info: msg })
    }
  }

  async function next() {
    if (!current || !result) return
    await answerGraded(current.id, result.verdict, result.score)
    setIdx(i => Math.min(i + 1, queue.length))
    setValue('')
    setResult(null)
  }

  return (
    <div className="wrap p-4">
      <h1 className="text-2xl font-semibold mb-2">Type-it (entrada libre)</h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="badge">Due: {queue.length}</span>
        <span className="badge">Meta: {progress.studied}/{dailyGoal} ({progress.pct}%)</span>
        <select className="select" value={target} onChange={e => setTarget(e.target.value as Target)}>
          <option value="word">Escribe la palabra (EN)</option>
          <option value="definition">Escribe una definición breve (EN)</option>
        </select>
      </div>
      <div className="progress mb-6"><div className="progress-bar" style={{ width: `${progress.pct}%` }} /></div>

      {!current ? (
        <div className="card bg-green-50">
          <div className="font-medium">¡No hay más pendientes!</div>
          <div className="text-sm text-green-700">Vuelve más tarde o cambia la categoría.</div>
        </div>
      ) : (
        <div className="card space-y-4">
          <div className="text-sm text-gray-500">{idx + 1}/{queue.length}</div>

          {target === 'word' ? (
            <div>
              <div className="text-gray-800">{current.definition_en}</div>
              {current.translation_es && <div className="text-gray-700">ES: {current.translation_es}</div>}
              {current.example_en && <div className="text-gray-600 italic">“{current.example_en}”</div>}
            </div>
          ) : (
            <div>
              <div className="text-2xl font-semibold">{current.word}</div>
              {current.example_en && <div className="text-gray-600 italic">“{current.example_en}”</div>}
            </div>
          )}

          <input
            className="input"
            placeholder={target === 'word' ? 'Escribe la palabra en inglés…' : 'Escribe una definición breve en inglés…'}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKey}
            autoFocus
          />

          {!result ? (
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={check}>Corregir (Enter)</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`badge ${result.verdict === 'exact' ? 'bg-green-100' : result.verdict === 'near' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                Resultado: {result.verdict.toUpperCase()}
              </div>
              <div className="text-sm text-gray-700">{result.info}</div>
              <div className="text-sm">
                Correcto era: <b>{target === 'word' ? current.word : (current.definition_en || '—')}</b>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={next}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ===================== CLOZE (huecos con Example EN) ===================== */

function Cloze() {
  const { getDueQueue, answerGraded, dailyGoal, dailyCount } = useAppState()
  const [queue, setQueue] = useState<WordItem[]>([])
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [usedFirst, setUsedFirst] = useState(false)
  const [usedLen, setUsedLen] = useState(false)
  const [result, setResult] = useState<null | { verdict: Verdict; base: 0|2|3; finalScore: 0|2|3; info: string }>(null)

  const current = queue[idx]

  useEffect(() => {
    (async () => {
      const q = await getDueQueue(100)
      // Para Cloze, prioriza ítems con example_en
      const onlyWithExample = q.filter(it => !!it.example_en)
      setQueue(onlyWithExample.length ? onlyWithExample : q)
      setIdx(0)
      resetWork()
    })()
  }, [getDueQueue])

  function resetWork() {
    setValue('')
    setUsedFirst(false)
    setUsedLen(false)
    setResult(null)
  }

  const progress = useMemo(() => {
    const studied = Math.min(dailyCount, dailyGoal)
    const pct = Math.round((studied / dailyGoal) * 100)
    return { studied, pct }
  }, [dailyCount, dailyGoal])

  function maskExample(example: string, word: string): string {
    if (!example) return ''
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
    const re = new RegExp(esc, 'gi')
    if (!re.test(example)) return example
    return example.replace(re, (m) => {
      return m.split(/\s+/).map(tok => '_'.repeat(Math.min(tok.replace(/[^a-zA-Z]/g,'').length || 3, 8))).join(' ')
    })
  }

  const masked = current?.example_en ? maskExample(current.example_en, current.word) : undefined
  const firstLetter = current?.word?.[0] || ''

  function useHintFirst() { setUsedFirst(true) }
  function useHintLen() { setUsedLen(true) }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === 'Enter') check() }

  function check() {
    if (!current || !value.trim()) return
    const g = gradeSpelling(value, current.word)
    const penalty = (usedFirst ? 1 : 0) + (usedLen ? 1 : 0)
    const base = g.score // 3 | 2 | 0
    const after = Math.max(0, base - penalty)
    const rounded: 0|2|3 = after >= 3 ? 3 : after >= 2 ? 2 : 0
    const msg =
      g.verdict === 'exact'
        ? (penalty ? `Correcto, pero con ${penalty} ayuda(s).` : '¡Perfecto!')
        : g.verdict === 'near'
        ? (penalty ? `Bastante bien (con ${penalty} ayuda/s).` : 'Bastante bien.')
        : 'Incorrecto.'
    setResult({ verdict: g.verdict, base: g.score, finalScore: rounded, info: msg })
  }

  async function next() {
    if (!current || !result) return
    await answerGraded(current.id, result.verdict, result.finalScore)
    setIdx(i => Math.min(i + 1, queue.length))
    resetWork()
  }

  return (
    <div className="wrap p-4">
      <h1 className="text-2xl font-semibold mb-2">Cloze (rellena el hueco)</h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="badge">Due: {queue.length}</span>
        <span className="badge">Meta: {progress.studied}/{dailyGoal} ({progress.pct}%)</span>
      </div>
      <div className="progress mb-6"><div className="progress-bar" style={{ width: `${progress.pct}%` }} /></div>

      {!current ? (
        <div className="card bg-green-50">
          <div className="font-medium">¡No hay más pendientes!</div>
          <div className="text-sm text-green-700">Vuelve más tarde o cambia la categoría.</div>
        </div>
      ) : (
        <div className="card space-y-4">
          <div className="text-sm text-gray-500">{idx + 1}/{queue.length}</div>

          <div className="text-gray-800">
            {masked
              ? <span className="italic">“{masked}”</span>
              : (
                <div>
                  <div className="text-sm text-gray-500 mb-1">(Sin ejemplo para cloze; usa definición)</div>
                  <div className="italic">“{current.definition_en}”</div>
                </div>
              )
            }
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={usedFirst} onClick={useHintFirst} title="Muestra la primera letra (−1 punto)">
              💡 Primera letra
            </button>
            <button className="btn" disabled={usedLen} onClick={useHintLen} title="Muestra la longitud (−1 punto)">
              📏 Longitud
            </button>
            {(usedFirst || usedLen) && (
              <span className="badge">
                Penalización: {(usedFirst?1:0)+(usedLen?1:0)}
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600">
            {usedFirst && <>Empieza por: <b>{firstLetter.toUpperCase()}</b> · </>}
            {usedLen && <>Longitud: <b>{current.word.length}</b></>}
          </div>

          <input
            className="input"
            placeholder="Escribe la palabra/expresión exacta…"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKey}
            autoFocus
          />

          {!result ? (
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={check}>Corregir (Enter)</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`badge ${result.verdict === 'exact' ? 'bg-green-100' : result.verdict === 'near' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                Resultado: {result.verdict.toUpperCase()} · Puntos: {result.finalScore} (base {result.base}{(usedFirst||usedLen)?` − ${(usedFirst?1:0)+(usedLen?1:0)} por ayudas`:''})
              </div>
              <div className="text-sm text-gray-700">{result.info}</div>
              <div className="text-sm">
                Correcto era: <b>{current.word}</b>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={next}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ===================== RAPID FIRE (30/60s) ===================== */

function RapidFire() {
  const { getDueQueue, answerGraded, dailyGoal, dailyCount } = useAppState()
  const [queue, setQueue] = useState<WordItem[]>([])
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [duration, setDuration] = useState<30 | 60>(30)
  const [running, setRunning] = useState(false)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(Date.now())

  const [sessionPts, setSessionPts] = useState(0)
  const [hits, setHits] = useState(0)
  const [near, setNear] = useState(0)
  const [miss, setMiss] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'near' | 'fail' | null>(null)

  const timerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const current = queue[idx]

  // Cargar cola
  useEffect(() => {
    (async () => {
      const q = await getDueQueue(200)
      setQueue(q.length ? q : await getDueQueue(100))
      setIdx(0)
    })()
  }, [getDueQueue])

  // Tick de reloj
  useEffect(() => {
    if (!running || !endAt) return
    const i = window.setInterval(() => setNow(Date.now()), 100)
    timerRef.current = i as unknown as number
    return () => window.clearInterval(i)
  }, [running, endAt])

  // Auto stop
  useEffect(() => {
    if (!running || !endAt) return
    if (Date.now() >= endAt) stopRun()
  }, [now, running, endAt])

  const timeLeftMs = endAt ? Math.max(0, endAt - (now || Date.now())) : 0
  const pct = endAt ? Math.max(0, Math.min(100, (timeLeftMs / (duration * 1000)) * 100)) : 0

  const progress = useMemo(() => {
    const studied = Math.min(dailyCount, dailyGoal)
    const p = Math.round((studied / dailyGoal) * 100)
    return { studied, pct: p }
  }, [dailyCount, dailyGoal])

  function startRun() {
    setSessionPts(0); setHits(0); setNear(0); setMiss(0)
    setValue(''); setIdx(0); setFlash(null)
    setRunning(true)
    setEndAt(Date.now() + duration * 1000)
    setNow(Date.now())
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function stopRun() {
    setRunning(false)
    setEndAt(null)
    if (timerRef.current) window.clearInterval(timerRef.current)
  }

  function nextIdx() {
    setIdx(i => (!queue.length ? 0 : (i + 1) % queue.length))
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') check()
  }

  async function check() {
    if (!running || !current) return
    const s = value.trim()
    if (!s) return
    const g = gradeSpelling(s, current.word) // exact=3, near=2, fail=0
    setFlash(g.verdict === 'exact' ? 'ok' : g.verdict === 'near' ? 'near' : 'fail')

    // cuenta sesión
    if (g.verdict === 'exact') setHits(h => h + 1)
    else if (g.verdict === 'near') setNear(h => h + 1)
    else setMiss(h => h + 1)
    setSessionPts(p => p + g.score)

    // actualiza SRS/racha/puntos globales
    await answerGraded(current.id, g.verdict, g.score)

    // siguiente
    setValue('')
    nextIdx()
    // feedback rápido
    window.setTimeout(() => setFlash(null), 200)
    // si se acabó el tiempo justo al enviar, paramos
    if (endAt && Date.now() >= endAt) stopRun()
  }

  async function skip() {
    if (!running || !current) return
    // saltar = fallo (0 puntos)
    await answerGraded(current.id, 'fail', 0)
    setMiss(h => h + 1)
    setValue('')
    nextIdx()
  }

  return (
    <div className="wrap p-4">
      <h1 className="text-2xl font-semibold mb-2">Rapid Fire</h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="badge">Cola: {queue.length}</span>
        <span className="badge">Sesión: ⭐ {sessionPts} · ✅ {hits} · ~ {near} · ❌ {miss}</span>
        <select
          className="select"
          value={duration}
          onChange={e => setDuration(Number(e.target.value) as 30 | 60)}
          disabled={running}
          title="Duración del reto"
        >
          <option value={30}>30 s</option>
          <option value={60}>60 s</option>
        </select>
        {!running ? (
          <button className="btn btn-primary" onClick={startRun} disabled={!queue.length}>
            ▶️ Empezar
          </button>
        ) : (
          <button className="btn" onClick={stopRun}>⏹️ Parar</button>
        )}
      </div>

      {/* Barra de tiempo */}
      <div className="progress mb-2">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Tiempo restante: <b>{(timeLeftMs/1000).toFixed(1)}s</b> · Meta diaria: {progress.studied}/{dailyGoal} ({progress.pct}%)
      </div>

      {!running ? (
        <div className="card bg-gray-50">
          <div className="font-medium mb-1">Arranca un reto de {duration}s.</div>
          <div className="text-sm text-gray-700">
            Se muestra la <b>definición</b> y debes escribir la <b>palabra</b>. Puntuación: <b>exacto=3</b>, <b>cercano=2</b>, <b>fallo=0</b>.
            Puedes <b>Enter</b> para enviar o <b>Skip</b> para pasar (cuenta como fallo). Tus puntos y racha globales se actualizan.
          </div>
        </div>
      ) : !current ? (
        <div className="card bg-yellow-50">
          Sin ítems en cola ahora mismo. Cambia de categoría o recarga.
        </div>
      ) : (
        <div className={`card space-y-4 ${flash === 'ok' ? 'ring-2 ring-green-300' : flash === 'near' ? 'ring-2 ring-yellow-300' : flash === 'fail' ? 'ring-2 ring-red-300' : ''}`}>
          <div className="text-gray-800">{current.definition_en || '—'}</div>
          {current.translation_es && <div className="text-gray-700">ES: {current.translation_es}</div>}
          {current.example_en && <div className="text-gray-600 italic">“{current.example_en}”</div>}

          <input
            ref={inputRef}
            className="input"
            placeholder="Escribe la palabra en inglés…"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKey}
            autoFocus
          />

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={check}>Enter / Corregir</button>
            <button className="btn" onClick={skip} title="Cuenta como fallo (0 puntos)">Saltar</button>
          </div>
        </div>
      )}
    </div>
  )
}
