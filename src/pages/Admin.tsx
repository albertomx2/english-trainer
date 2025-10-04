import { useAppState } from '../state/appState'

export default function Admin() {
  const { lastSync, refreshFromXlsx, refreshing } = useAppState()
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Admin (simple)</h1>
      <p className="text-sm text-gray-600 mb-4">Última sincronización: {lastSync || '-'}</p>
      <button
        className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-60"
        disabled={refreshing}
        onClick={refreshFromXlsx}
      >
        {refreshing ? 'Procesando…' : 'Procesar Excel ahora'}
      </button>
      <p className="text-xs text-gray-500 mt-3">El Excel debe estar en <code>/public/dataset.xlsx</code>.</p>
    </div>
  )
}
