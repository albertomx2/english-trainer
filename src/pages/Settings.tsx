import { useAppState } from '../state/appState'

export default function Settings() {
  const {
    points, streak, bestStreak,
    dailyGoal, setDailyGoal, markDailyGoalDone,
    ttsOn, setTtsOn,
    defaultDifficulty, setDefaultDifficulty,
    theme, setTheme,
  } = useAppState()

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Ajustes</h1>

      {/* Métricas */}
      <section className="rounded-2xl border p-4 mb-4 bg-white shadow-sm">
        <div className="text-sm text-gray-600 mb-2">Métricas rápidas</div>
        <div className="flex gap-4 text-sm">
          <span>⭐ Puntos: {points}</span>
          <span>🔥 Racha: {streak}</span>
          <span>🏁 Mejor racha: {bestStreak}</span>
        </div>
        <button
          className="mt-3 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm"
          onClick={markDailyGoalDone}
        >
          Marcar meta diaria cumplida
        </button>
      </section>

      {/* Meta diaria */}
      <section className="rounded-2xl border p-4 mb-4 bg-white shadow-sm">
        <div className="font-medium mb-2">Meta diaria</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={dailyGoal}
            onChange={e => setDailyGoal(Number(e.target.value))}
            className="w-24 border rounded-md px-2 py-1"
          />
          <span className="text-sm text-gray-600">tarjetas/día</span>
        </div>
      </section>

      {/* TTS */}
      <section className="rounded-2xl border p-4 mb-4 bg-white shadow-sm">
        <div className="font-medium mb-2">Texto a voz (TTS)</div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ttsOn} onChange={e => setTtsOn(e.target.checked)} />
          Activar TTS por defecto
        </label>
        <div className="text-xs text-gray-500 mt-1">
          (Flashcards respetará este ajuste; si no cambia en vivo, recarga la pestaña del modo estudio.)
        </div>
      </section>

      {/* Dificultad por defecto */}
      <section className="rounded-2xl border p-4 mb-4 bg-white shadow-sm">
        <div className="font-medium mb-2">Dificultad por defecto</div>
        <div className="flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="defdiff"
              checked={defaultDifficulty === 'easy'}
              onChange={() => setDefaultDifficulty('easy')}
            />
            Fácil
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="defdiff"
              checked={defaultDifficulty === 'medium'}
              onChange={() => setDefaultDifficulty('medium')}
            />
            Medio
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="defdiff"
              checked={defaultDifficulty === 'hard'}
              onChange={() => setDefaultDifficulty('hard')}
            />
            Difícil
          </label>
        </div>
      </section>

      {/* Tema */}
      <section className="rounded-2xl border p-4 mb-2 bg-white shadow-sm">
        <div className="font-medium mb-2">Tema</div>
        <select
          className="border rounded-md px-2 py-1 text-sm"
          value={theme}
          onChange={e => setTheme(e.target.value as any)}
        >
          <option value="light">Claro</option>
          <option value="dark">Oscuro</option>
        </select>
        <div className="text-xs text-gray-500 mt-1">
          El tema se aplica globalmente (persistente).
        </div>
      </section>
    </div>
  )
}
