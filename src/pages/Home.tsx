import { useAppState } from '../state/appState'

export default function Home() {
  const { filteredItems, lastSync } = useAppState()
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">English Trainer</h1>
      <p className="text-gray-600 mb-4">Esqueleto listo. Selecciona un modo para empezar.</p>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Palabras cargadas" value={String(filteredItems.length)} />
        <Stat label="Última sincronización" value={lastSync || '-'} />
        <Stat label="Categoría activa" value="Filtro en cabecera" />
      </div>

      <div className="rounded-xl border p-4 bg-gray-50">
        Próximos pasos: SRS y Flashcards.
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}
