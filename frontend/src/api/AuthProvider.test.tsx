import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './AuthContext'
import { AuthProvider } from './AuthProvider'

// A minimal consumer that exposes AuthContext's state/actions as clickable buttons + visible
// text -- the standard RTL way to test a context provider without a separate renderHook
// dependency (this project has none installed).
function AuthConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="auth-state">{auth.isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      <span data-testid="auth-token">{auth.token ?? 'none'}</span>
      <button type="button" onClick={() => void auth.login('admin', 'test-password')}>
        login
      </button>
      <button type="button" onClick={() => auth.logout()}>
        logout
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    window.localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts anonymous when nothing is stored', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous')
  })

  it('starts authenticated from a valid, non-expired stored token (survives a reload)', () => {
    window.localStorage.setItem('techradar.token', 'stored-jwt')
    window.localStorage.setItem('techradar.tokenExpiresAt', '2099-01-01T00:00:00.000Z')

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('auth-token')).toHaveTextContent('stored-jwt')
  })

  it('starts anonymous and clears storage when the stored token is already expired', () => {
    window.localStorage.setItem('techradar.token', 'stale-jwt')
    window.localStorage.setItem('techradar.tokenExpiresAt', '2020-01-01T00:00:00.000Z')

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous')
    expect(window.localStorage.getItem('techradar.token')).toBeNull()
  })

  it('login() calls the API, stores the token, and flips isAuthenticated', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ token: 'fresh-jwt', expiresAt: '2099-01-01T00:00:00.000Z' }),
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'login' }))

    expect(await screen.findByTestId('auth-token')).toHaveTextContent('fresh-jwt')
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    expect(window.localStorage.getItem('techradar.token')).toBe('fresh-jwt')
  })

  it('logout() clears the token from state and storage', () => {
    window.localStorage.setItem('techradar.token', 'stored-jwt')
    window.localStorage.setItem('techradar.tokenExpiresAt', '2099-01-01T00:00:00.000Z')

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'logout' }))

    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous')
    expect(window.localStorage.getItem('techradar.token')).toBeNull()
  })

  it('useAuth throws when used outside an AuthProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<AuthConsumer />)).toThrow('useAuth must be used within an AuthProvider')

    consoleErrorSpy.mockRestore()
  })
})
