import { useAppState } from '../state/appState'

export default function Settings() {
  const { points, streak, markDailyGoalDone } = useAppState()
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Ajustes</h1>
      <div className="rounded-xl border p-4">
        <div className="text-sm text-gray-600 mb-2">Métricas rápidas</div>
        <div className="flex gap-3 text-sm">
          <span>⭐ Puntos: {points}</span>
          <span>🔥 Racha: {streak}</span>
        </div>
        <button
          className="mt-3 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm"
          onClick={markDailyGoalDone}
          title="Marca la meta diaria como cumplida (sumará racha si es día nuevo)"
        >
          Marcar meta diaria cumplida
        </button>
      </div>
    </div>
  )
}
