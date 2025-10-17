import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'   // ⬅️ type-only import
import { Navigate, useLocation } from 'react-router-dom'
import { getActiveUser } from '../lib/supa'

export default function RequireUser({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [hasUser, setHasUser] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    const u = getActiveUser()
    setHasUser(!!u)
    setReady(true)
  }, [loc.pathname])

  if (!ready) return null
  if (!hasUser) return <Navigate to="/login" replace />
  return <>{children}</>
}
