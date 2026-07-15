import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../api/AuthContext'
import type { AuthContextValue } from '../api/AuthContext'
import type { Entry } from '../api/types'
import { ToastProvider } from '../components/Toast'
import { AdminPage } from './AdminPage'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    description: 'A pragmatic, statically typed language.',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

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
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin']}>
            <AdminPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('AdminPage shell', () => {
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

  it('shows the entries table once entries load', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })

    renderAdminPage()

    expect(await screen.findByText('Kotlin')).toBeInTheDocument()
  })

  it('shows an empty state with an add action when there are no entries at all', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })

    renderAdminPage()

    expect(await screen.findByRole('heading', { name: 'No entries yet' })).toBeInTheDocument()
    // Both the header's own trigger and the empty state's action button are on screen at once
    // and share the same label -- assert there are two, not one specific instance.
    expect(screen.getAllByRole('button', { name: 'Add technology' })).toHaveLength(2)
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve(null) })

    renderAdminPage()

    expect(await screen.findByRole('heading', { name: "Couldn't load entries" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry loading' })).toBeInTheDocument()
  })
})

describe('AdminPage entry management', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates an entry, toasts success, closes the modal, and refetches so the table reflects it (live invalidation)', async () => {
    const created = makeEntry({ id: 21, name: 'Svelte', quadrant: 'TOOLS', ring: 'ASSESS', isNew: true })
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) }) // initial GET
      .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(created) }) // POST
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([makeEntry(), created]) }) // refetch GET

    renderAdminPage()
    expect(await screen.findByText('Kotlin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add technology' }))
    const dialog = screen.getByRole('dialog', { name: 'Add technology' })
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Svelte' } })
    fireEvent.change(within(dialog).getByLabelText('Quadrant'), { target: { value: 'TOOLS' } })
    fireEvent.change(within(dialog).getByLabelText('Ring'), { target: { value: 'ASSESS' } })
    fireEvent.change(within(dialog).getByLabelText('Description'), {
      target: { value: 'A compiler-based UI framework.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add technology' }))

    expect(await screen.findByRole('status')).toHaveTextContent('"Svelte" created')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText('Svelte')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('edits an entry pre-filled and reflects the change after refetch', async () => {
    const original = makeEntry({ id: 1, name: 'Kotlin', ring: 'ADOPT' })
    const updated = { ...original, ring: 'TRIAL' as const }
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([original]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(updated) }) // PUT
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([updated]) }) // refetch

    renderAdminPage()
    expect(await screen.findByText('Kotlin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Kotlin' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Kotlin' })
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Kotlin')

    fireEvent.change(within(dialog).getByLabelText('Ring'), { target: { value: 'TRIAL' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('status')).toHaveTextContent('"Kotlin" updated')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [, putCall] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(JSON.parse(putCall.body as string).ring).toBe('TRIAL')
  })

  it('deletes an entry behind the confirm dialog and refetches', async () => {
    const entry = makeEntry({ id: 1, name: 'Kotlin' })
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([entry]) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve(undefined) }) // DELETE
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) }) // refetch

    renderAdminPage()
    expect(await screen.findByText('Kotlin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Kotlin' }))
    const confirmDialog = screen.getByRole('dialog', { name: "Delete 'Kotlin'?" })
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('status')).toHaveTextContent('"Kotlin" deleted')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByRole('heading', { name: 'No entries yet' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('maps a 409 duplicate-name response onto the form field without a generic toast', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({ error: { code: 'DUPLICATE_NAME', message: "An entry named 'Kotlin' already exists" } }),
      })

    renderAdminPage()
    expect(await screen.findByText('Kotlin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add technology' }))
    const dialog = screen.getByRole('dialog', { name: 'Add technology' })
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Kotlin' } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Duplicate attempt.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add technology' }))

    expect(await within(dialog).findByText("An entry named 'Kotlin' already exists")).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument() // stays open
    expect(screen.queryByRole('status')).toBeNull() // no toast for a field-mappable error
  })

  it('maps a 400 validation response onto the matching field(s)', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: { description: 'Description is required' } },
          }),
      })

    renderAdminPage()
    expect(await screen.findByText('Kotlin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add technology' }))
    const dialog = screen.getByRole('dialog', { name: 'Add technology' })
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Zig' } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'placeholder' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add technology' }))

    expect(await within(dialog).findByText('Description is required')).toBeInTheDocument()
  })

  it('logs out and shows a session-expired toast when a mutation gets a 401', async () => {
    const logout = vi.fn()
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Token is not valid or has expired' } }),
      })

    renderAdminPage(logout)
    expect(await screen.findByText('Kotlin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Kotlin' }))
    const confirmDialog = screen.getByRole('dialog', { name: "Delete 'Kotlin'?" })
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Session expired')
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
