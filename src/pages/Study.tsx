import { useSearchParams } from 'react-router-dom'
import { useAppState } from '../state/appState'

export default function Study() {
  const [q] = useSearchParams()
  const mode = q.get('mode') || 'flashcards'
  const { filteredItems } = useAppState()

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-1">Estudio</h1>
      <p className="text-gray-600 mb-4">Modo: <span className="font-mono">{mode}</span> · Items cargados: {filteredItems.length}</p>

      <div className="rounded-xl border p-4 bg-gray-50">
        Este esqueleto está listo. En el siguiente paso enchufamos la lógica del modo <b>{mode}</b>.
      </div>
    </div>
  )
}
