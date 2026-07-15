import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../api/AuthContext'
import type { AuthContextValue } from '../../api/AuthContext'
import { RequireAuth } from './RequireAuth'

function LoginRouteProbe() {
  const [searchParams] = useSearchParams()
  return <div>Login page (returnTo={searchParams.get('returnTo') ?? 'none'})</div>
}

function renderGuarded(isAuthenticated: boolean, initialEntry = '/admin') {
  const authValue: AuthContextValue = {
    token: isAuthenticated ? 'jwt-value' : null,
    isAuthenticated,
    login: vi.fn(),
    logout: vi.fn(),
  }
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/login" element={<LoginRouteProbe />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <div>Protected content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireAuth', () => {
  it('renders its children when authenticated', () => {
    renderGuarded(true)

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('redirects to /admin/login when there is no token', () => {
    renderGuarded(false)

    expect(screen.queryByText('Protected content')).toBeNull()
    expect(screen.getByText(/Login page/)).toBeInTheDocument()
  })

  it('carries the attempted path as a returnTo query param on the redirect', () => {
    renderGuarded(false, '/admin')

    // RequireAuth encodeURIComponent's the path when building the redirect URL;
    // URLSearchParams.get() decodes it back, so the probe reads the plain path.
    expect(screen.getByText('Login page (returnTo=/admin)')).toBeInTheDocument()
  })
})
