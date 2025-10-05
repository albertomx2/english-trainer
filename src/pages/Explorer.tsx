import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../state/appState'
import type { WordItem } from '../types'

type FlagsMap = Map<string, { favorite?: boolean; reviewToday?: boolean }>

export default function Explorer() {
  const { filteredItems, getFlags, toggleFavorite, toggleReviewToday } = useAppState()

  // búsqueda y filtros
  const [q, setQ] = useState('')
  const [onlyFavs, setOnlyFavs] = useState(false)
  const [onlyReview, setOnlyReview] = useState(false)

  // flags por item
  const [flags, setFlags] = useState<FlagsMap>(new Map())

  // cargar flags al entrar y cuando cambie el listado
  useEffect(() => {
    const ids = filteredItems.map(i => i.id)
    if (!ids.length) { setFlags(new Map()); return }
    getFlags(ids).then(setFlags)
  }, [filteredItems, getFlags])

  const filtered: WordItem[] = useMemo(() => {
    const s = q.trim().toLowerCase()
    let list = filteredItems
    if (s) {
      list = list.filter(i =>
        i.word.toLowerCase().includes(s) ||
        i.definition_en.toLowerCase().includes(s) ||
        i.translation_es.toLowerCase().includes(s)
      )
    }
    if (onlyFavs) {
      list = list.filter(i => flags.get(i.id)?.favorite)
    }
    if (onlyReview) {
      list = list.filter(i => flags.get(i.id)?.reviewToday)
    }
    return list
  }, [q, onlyFavs, onlyReview, filteredItems, flags])

  async function onToggleFav(id: string) {
    await toggleFavorite(id)
    setFlags(prev => new Map(prev).set(id, { ...prev.get(id), favorite: !prev.get(id)?.favorite }))
  }
  async function onToggleReview(id: string) {
    await toggleReviewToday(id)
    setFlags(prev => new Map(prev).set(id, { ...prev.get(id), reviewToday: !prev.get(id)?.reviewToday }))
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-3">Explorador</h1>

      <div className="flex flex-col md:flex-row gap-2 md:items-center mb-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar palabra/definición/traducción…"
          className="w-full md:flex-1 border rounded-md px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyFavs} onChange={e => setOnlyFavs(e.target.checked)} />
          ⭐ Favoritas
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyReview} onChange={e => setOnlyReview(e.target.checked)} />
          📌 Revisar hoy
        </label>
      </div>

      {!filtered.length ? (
        <div className="rounded-xl border p-4 text-sm text-gray-600">No hay resultados.</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map(it => {
            const f = flags.get(it.id)
            const isFav = !!f?.favorite
            const isRev = !!f?.reviewToday
            return (
              <li key={it.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {it.word}{' '}
                      <span className="text-xs text-gray-500">[{it.category}]</span>
                    </div>
                    <div className="text-sm text-gray-800">{it.definition_en}</div>
                    {it.example_en && <div className="text-sm text-gray-600 italic">“{it.example_en}”</div>}
                    <div className="text-sm text-gray-700">ES: {it.translation_es}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      className={`px-2 py-1 rounded-md border text-sm ${isFav ? 'bg-yellow-50 border-yellow-300' : 'bg-white hover:bg-gray-50'}`}
                      onClick={() => onToggleFav(it.id)}
                      title="Marcar como favorita"
                    >
                      {isFav ? '⭐ Fav' : '☆ Fav'}
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md border text-sm ${isRev ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'}`}
                      onClick={() => onToggleReview(it.id)}
                      title="Marcar para revisar hoy"
                    >
                      {isRev ? '📌 Hoy' : '📍 Hoy'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
