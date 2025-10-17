import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrCreateUserByUsername, setActiveUser } from '../lib/supa'

export default function Login() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const u = username.trim()
    if (!u) { setError('Escribe un nombre de usuario.'); return }
    setLoading(true)
    try {
      const user = await getOrCreateUserByUsername(u)
      setActiveUser(user)
      nav('/', { replace: true })
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear/entrar con ese usuario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wrap p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Entrar</h1>
      <div className="text-sm text-gray-600 mb-4">
        No hay contraseñas. Solo elige un nombre de usuario para esta app.
      </div>

      {error && <div className="alert alert-error mb-3">{error}</div>}

      <form className="card space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="label">Nombre de usuario</label>
          <input
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="p. ej. alberto"
            autoFocus
          />
        </div>

        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar / Crear'}
        </button>
      </form>
    </div>
  )
}
