import { Link, NavLink, Outlet } from 'react-router-dom'
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

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm transition ${
      isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="w-full border-b bg-white/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="wrap py-2 flex items-center gap-3">
          <Link to="/" className="font-semibold">English Trainer</Link>

          <nav className="hidden sm:flex items-center gap-2">
            <NavLink to="/" className={navClass}>Inicio</NavLink>
            <NavLink to="/modes" className={navClass}>Modos</NavLink>
            <NavLink to="/study" className={navClass}>Estudio</NavLink>
            <NavLink to="/explorer" className={navClass}>Explorador</NavLink>
            <NavLink to="/settings" className={navClass}>Ajustes</NavLink>
            <NavLink to="/admin" className={navClass}>Admin</NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedCategory ?? 'Todas'}
              onChange={e => setSelectedCategory(e.target.value === 'Todas' ? null : e.target.value)}
              className="select"
              title="Filtrar por categoría"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button
              onClick={refreshFromXlsx}
              disabled={refreshing}
              className="btn"
              title="Recargar palabras"
            >
              {refreshing ? 'Actualizando…' : '↻ Recargar'}
            </button>

            <div className="badge">⭐ {points}</div>
            <div className="badge">🔥 {streak}</div>
          </div>
        </div>

        {/* Navegación móvil */}
        <div className="sm:hidden wrap pb-2 flex gap-2">
          <NavLink to="/" className={navClass}>Inicio</NavLink>
          <NavLink to="/modes" className={navClass}>Modos</NavLink>
          <NavLink to="/study" className={navClass}>Estudio</NavLink>
          <NavLink to="/explorer" className={navClass}>Explorador</NavLink>
          <NavLink to="/settings" className={navClass}>Ajustes</NavLink>
          <NavLink to="/admin" className={navClass}>Admin</NavLink>
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
