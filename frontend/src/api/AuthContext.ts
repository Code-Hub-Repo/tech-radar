// Context object + useAuth() hook only -- kept out of AuthProvider.tsx so that file exports
// nothing but the AuthProvider component itself (react-refresh/only-export-components: Fast
// Refresh can't hot-swap a file that mixes a component export with other exports).
import { createContext, useContext } from 'react'

export interface AuthContextValue {
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
