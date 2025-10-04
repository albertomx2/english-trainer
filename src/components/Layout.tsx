import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../state/appState'

export default function Layout() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    points,
    streak,
    refreshing,
    refreshFromXlsx,
  } = useAppState()
  const loc = useLocation()

  const active = (p: string) =>
    ({ isActive }: { isActive: boolean }) =>
      `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/" className="font-semibold">English Trainer</Link>

          <nav className="hidden sm:flex items-center gap-2">
            <NavLink to="/" className={active('/')}>Inicio</NavLink>
            <NavLink to="/modes" className={active('/modes')}>Modos</NavLink>
            <NavLink to="/study" className={active('/study')}>Estudio</NavLink>
            <NavLink to="/explorer" className={active('/explorer')}>Explorador</NavLink>
            <NavLink to="/settings" className={active('/settings')}>Ajustes</NavLink>
            <NavLink to="/admin" className={active('/admin')}>Admin</NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Filtro por categoría */}
            <select
              value={selectedCategory ?? 'Todas'}
              onChange={e => setSelectedCategory(e.target.value === 'Todas' ? null : e.target.value)}
              className="border rounded-md text-sm px-2 py-1"
              title="Filtrar por categoría"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Recargar */}
            <button
              onClick={refreshFromXlsx}
              disabled={refreshing}
              className="border rounded-md text-sm px-2 py-1 bg-white hover:bg-gray-50 disabled:opacity-60"
              title="Recargar palabras"
            >
              {refreshing ? 'Actualizando…' : '↻ Recargar'}
            </button>

            {/* Puntos / Racha */}
            <div className="text-xs text-gray-600 px-2 py-1 rounded-md border bg-white">
              ⭐ {points} · 🔥 {streak}
            </div>
          </div>
        </div>

        {/* Navegación móvil */}
        <div className="sm:hidden px-3 pb-2 flex gap-2">
          <NavLink to="/" className={active('/')}>Inicio</NavLink>
          <NavLink to="/modes" className={active('/modes')}>Modos</NavLink>
          <NavLink to="/study" className={active('/study')}>Estudio</NavLink>
          <NavLink to="/explorer" className={active('/explorer')}>Explorador</NavLink>
          <NavLink to="/settings" className={active('/settings')}>Ajustes</NavLink>
          <NavLink to="/admin" className={active('/admin')}>Admin</NavLink>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-10 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} · Personal use
      </footer>
    </div>
  )
}
