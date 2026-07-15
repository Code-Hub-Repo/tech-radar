// Tiny auth provider holding the admin JWT (CONTEXT.md's documented localStorage trade-off,
// 8h expiry) -- the single source of truth RequireAuth (guard), LoginPage, and every admin
// mutation hook (api/hooks.ts) read from via useAuth() (AuthContext.ts). Deliberately not a
// reducer/store: one token field and two functions is the entire admin session's state.
import { useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { login as apiLogin } from './client'
import { clearStoredToken, getStoredToken, isTokenExpired, setStoredToken } from '../lib/authStorage'

// Covers the "returned after 8h with a stale localStorage token" case at mount. A token that
// expires mid-session (tab left open) is instead caught reactively -- the next admin mutation
// gets a real 401 from the server, which isUnauthorizedError + the calling page's onError
// already handle (ADMN-02) -- no separate client-side expiry timer needed.
function readInitialToken(): string | null {
  const stored = getStoredToken()
  if (!stored) {
    return null
  }
  if (isTokenExpired(stored.expiresAt)) {
    clearStoredToken()
    return null
  }
  return stored.token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readInitialToken)

  async function login(username: string, password: string): Promise<void> {
    const result = await apiLogin(username, password)
    setStoredToken(result.token, result.expiresAt)
    setToken(result.token)
  }

  function logout(): void {
    clearStoredToken()
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: token !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
