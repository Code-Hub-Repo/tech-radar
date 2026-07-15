// Guards /admin (ADMN-02): no token (or an expired one AuthProvider already cleared at mount) ->
// redirect to /admin/login, carrying the attempted path as ?returnTo so LoginPage can send the
// admin back where they meant to go after a successful login. A 401 from an admin mutation
// clears the token via AuthContext's logout() too -- once that happens this component's own
// re-render (it consumes useAuth()) sees isAuthenticated flip false and redirects the same way,
// without any separate 401-specific navigation logic.
import { Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '../../api/AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/admin/login?returnTo=${returnTo}`} replace />
  }

  return <>{children}</>
}
