// Persists the admin JWT + its expiry across reloads (CONTEXT.md's documented localStorage
// trade-off for a single-admin internal tool, 8h expiry). Wrapped in try/catch because
// localStorage access can throw (private browsing, exhausted quota, disabled storage) — mirrors
// lib/introDismissal.ts's own defensive pattern; a visitor in that state simply can't stay
// logged in across reloads instead of the app crashing.
const TOKEN_KEY = 'techradar.token'
const TOKEN_EXPIRES_AT_KEY = 'techradar.tokenExpiresAt'

export interface StoredToken {
  token: string
  expiresAt: string
}

export function getStoredToken(): StoredToken | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const token = window.localStorage.getItem(TOKEN_KEY)
    const expiresAt = window.localStorage.getItem(TOKEN_EXPIRES_AT_KEY)
    if (!token || !expiresAt) {
      return null
    }
    return { token, expiresAt }
  } catch {
    return null
  }
}

export function setStoredToken(token: string, expiresAt: string): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
    window.localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt)
  } catch {
    // Storage unavailable -- the session simply won't persist across reloads.
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(TOKEN_EXPIRES_AT_KEY)
  } catch {
    // Storage unavailable -- nothing to clear.
  }
}

// A token past its own expiresAt is treated as absent everywhere it's read (AuthContext's
// initial state) -- never kept alive in the UI only to have the first admin API call reject it.
export function isTokenExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now()
}
