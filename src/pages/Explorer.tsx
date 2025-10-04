import { useMemo, useState } from 'react'
import { useAppState } from '../state/appState'

export default function Explorer() {
  const { filteredItems } = useAppState()
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return filteredItems
    return filteredItems.filter(i =>
      i.word.toLowerCase().includes(s) ||
      i.definition_en.toLowerCase().includes(s) ||
      i.translation_es.toLowerCase().includes(s)
    )
  }, [q, filteredItems])

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-3">Explorador</h1>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Buscar palabra/definición/traducción…"
        className="w-full border rounded-md px-3 py-2 mb-3"
      />
      <ul className="space-y-2">
        {list.map(it => (
          <li key={it.id} className="border rounded-lg p-3">
            <div className="font-medium">{it.word} <span className="text-xs text-gray-500">[{it.category}]</span></div>
            <div className="text-sm text-gray-700">{it.definition_en}</div>
            {it.example_en && <div className="text-sm text-gray-500 italic">“{it.example_en}”</div>}
            <div className="text-sm text-gray-600">ES: {it.translation_es}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
