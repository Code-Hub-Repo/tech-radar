import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../api/AuthContext'
import type { AuthContextValue } from '../api/AuthContext'
import { AdminPage } from './AdminPage'

function renderAdminPage(logout: AuthContextValue['logout'] = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const authValue: AuthContextValue = {
    token: 'jwt-value',
    isAuthenticated: true,
    login: vi.fn(),
    logout,
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <AdminPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('AdminPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the admin header with a link back to the public radar and a Logout control', () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })

    renderAdminPage()

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View public radar' })).toHaveAttribute('href', '/')
  })

  it('calls logout() when the Logout button is clicked', () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })
    const logout = vi.fn()

    renderAdminPage(logout)
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('shows the entry count once entries load', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([{}, {}, {}]) })

    renderAdminPage()

    expect(await screen.findByText('3 entries.')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve(null) })

    renderAdminPage()

    expect(await screen.findByRole('heading', { name: "Couldn't load entries" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry loading' })).toBeInTheDocument()
  })
})
