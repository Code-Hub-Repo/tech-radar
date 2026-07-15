import { MemoryRouter, Route, Routes } from 'react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../api/AuthContext'
import type { AuthContextValue } from '../api/AuthContext'
import { ApiError } from '../api/client'
import { LoginPage } from './LoginPage'

function renderLoginPage(login: AuthContextValue['login'], initialEntry = '/admin/login') {
  const authValue: AuthContextValue = {
    token: null,
    isAuthenticated: false,
    login,
    logout: vi.fn(),
  }
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<div>Admin page reached</div>} />
          <Route path="/admin/entries/7" element={<div>Deep link target reached</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function fillCredentials(username: string, password: string) {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

describe('LoginPage', () => {
  it('disables Sign in until both fields are non-empty', () => {
    renderLoginPage(vi.fn())

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()

    fillCredentials('admin', 'codehub2026')

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('toggles the password field between hidden and visible', () => {
    renderLoginPage(vi.fn())

    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('logs in and redirects to /admin on success', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderLoginPage(login)

    fillCredentials('admin', 'codehub2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(login).toHaveBeenCalledWith('admin', 'codehub2026')
    await waitFor(() => expect(screen.getByText('Admin page reached')).toBeInTheDocument())
  })

  it('redirects to a same-app returnTo target after a successful login', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderLoginPage(login, '/admin/login?returnTo=%2Fadmin%2Fentries%2F7')

    fillCredentials('admin', 'codehub2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Deep link target reached')).toBeInTheDocument())
  })

  it('ignores an external returnTo target (open-redirect guard) and falls back to /admin', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    renderLoginPage(login, '/admin/login?returnTo=https%3A%2F%2Fevil.example')

    fillCredentials('admin', 'codehub2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Admin page reached')).toBeInTheDocument())
  })

  it('shows an inline error on a 401 and does not navigate away', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, 'Invalid username or password'))
    renderLoginPage(login)

    fillCredentials('admin', 'wrong')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
    expect(screen.queryByText('Admin page reached')).toBeNull()
  })

  it('shows a friendly message on a 429', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(429, 'Too many attempts, try again shortly'))
    renderLoginPage(login)

    fillCredentials('admin', 'wrong')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts, try again shortly')
  })

  it('shows a generic message for a non-ApiError failure (e.g. network error)', async () => {
    const login = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    renderLoginPage(login)

    fillCredentials('admin', 'codehub2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('shows a loading state while the request is in flight', async () => {
    let resolveLogin: () => void = () => {}
    const login = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve
        }),
    )
    renderLoginPage(login)

    fillCredentials('admin', 'codehub2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('aria-busy', 'true')

    resolveLogin()
    await waitFor(() => expect(screen.getByText('Admin page reached')).toBeInTheDocument())
  })
})
