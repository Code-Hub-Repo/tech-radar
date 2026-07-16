import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../api/AuthContext'
import type { AuthContextValue } from '../api/AuthContext'
import type { Entry, Proposal } from '../api/types'
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

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 4,
    name: 'Ktor Client',
    quadrant: 'TOOLS',
    ring: 'ASSESS',
    description: 'A lightweight, coroutine-based HTTP client.',
    submitterName: 'Jane',
    status: 'PENDING',
    entryId: null,
    createdAt: '2026-07-14T00:00:00Z',
    reviewedAt: null,
    ...overrides,
  }
}

function renderAdminPage(logout: AuthContextValue['logout'] = vi.fn(), initialEntries = ['/admin']) {
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
          <MemoryRouter initialEntries={initialEntries}>
            <AdminPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

// AdminPage now fires a second, concurrent GET /api/proposals?status=PENDING query (the tab
// badge, PROP-02) alongside its existing GET /api/entries -- routing it to its own mock instead
// of the shared `fetchMock` keeps every existing test's call-order/call-count assertions
// (`fetchMock.mock.calls[N]`, `toHaveBeenCalledTimes`) exactly as they were before this feature
// existed. Tests that care about proposals data configure `proposalsFetchMock` themselves;
// everything else gets a harmless empty PENDING queue (badge hidden, tab shows its empty state).
function stubAdminFetch() {
  const entriesFetchMock = vi.fn()
  const proposalsFetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/proposals')) {
      return proposalsFetchMock(url, init)
    }
    return entriesFetchMock(url, init)
  })
  return { entriesFetchMock, proposalsFetchMock }
}

describe('AdminPage shell', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;({ entriesFetchMock: fetchMock } = stubAdminFetch())
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
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;({ entriesFetchMock: fetchMock } = stubAdminFetch())
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

describe('AdminPage proposals moderation', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let proposalsFetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;({ entriesFetchMock: fetchMock, proposalsFetchMock } = stubAdminFetch())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a pending-count badge on the Proposals tab, and hides it when there are no pending proposals', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeProposal()]) })

    renderAdminPage()

    expect(await screen.findByRole('tab', { name: 'Proposals, 1 pending' })).toBeInTheDocument()
  })

  it('hides the badge when there are no pending proposals', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })

    renderAdminPage()

    expect(await screen.findByRole('tab', { name: 'Proposals' })).toBeInTheDocument()
  })

  it('switches to the Proposals tab on click and shows its pending list, hiding the Technologies content', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeProposal()]) })

    const { container } = renderAdminPage()
    expect(await screen.findByText('Kotlin')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('tab', { name: 'Proposals, 1 pending' }))

    expect(await screen.findByText('Ktor Client')).toBeInTheDocument()
    // A hidden element has no computed accessible name (by spec), so asserting on it goes
    // straight to the DOM node via its stable id rather than a role+name query.
    expect(container.querySelector('#admin-tabpanel-technologies')).toHaveAttribute('hidden')
    expect(container.querySelector('#admin-tabpanel-proposals')).not.toHaveAttribute('hidden')
  })

  it('opens directly on the Proposals tab when the URL carries ?tab=proposals (deep link)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeProposal()]) })

    renderAdminPage(vi.fn(), ['/admin?tab=proposals'])

    expect(await screen.findByText('Ktor Client')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Proposals, 1 pending' })).toHaveAttribute('aria-selected', 'true')
  })

  it('approves a proposal with an edit via the approve endpoint (never createEntry), toasts success, and drops the badge', async () => {
    const proposal = makeProposal()
    const approvedEntry = makeEntry({ id: 21, name: 'Ktor Client', quadrant: 'TOOLS', ring: 'TRIAL', isNew: true })
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([proposal]) }) // initial GET ?status=PENDING
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            proposal: { ...proposal, status: 'APPROVED', entryId: 21, reviewedAt: '2026-07-16T00:00:00Z' },
            entry: approvedEntry,
          }),
      }) // POST .../approve
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) }) // refetch GET, now empty

    renderAdminPage(vi.fn(), ['/admin?tab=proposals'])
    expect(await screen.findByText('Ktor Client')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = screen.getByRole('dialog', { name: 'Review "Ktor Client"' })
    fireEvent.change(within(dialog).getByLabelText('Ring'), { target: { value: 'TRIAL' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(await screen.findByRole('status')).toHaveTextContent('"Ktor Client" approved')
    expect(screen.queryByRole('dialog')).toBeNull()

    const approveCall = proposalsFetchMock.mock.calls[1] as [string, RequestInit]
    expect(approveCall[0].endsWith('/api/proposals/4/approve')).toBe(true)
    expect(approveCall[1].method).toBe('POST')
    expect(JSON.parse(approveCall[1].body as string)).toEqual({
      name: 'Ktor Client',
      quadrant: 'TOOLS',
      ring: 'TRIAL',
      description: 'A lightweight, coroutine-based HTTP client.',
    })
    // Never routes through createEntry -- no POST to /api/entries anywhere in this flow.
    const hitCreateEntry = fetchMock.mock.calls.some((call) => {
      const [url, init] = call as [string, RequestInit?]
      return url.endsWith('/api/entries') && init?.method === 'POST'
    })
    expect(hitCreateEntry).toBe(false)

    expect(await screen.findByRole('tab', { name: 'Proposals' })).toBeInTheDocument() // badge gone
  })

  it('maps a 409 duplicate-name approve response onto the name field, leaving the proposal pending', async () => {
    const proposal = makeProposal()
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([proposal]) })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({ error: { code: 'DUPLICATE_NAME', message: "An entry named 'Ktor Client' already exists" } }),
      })

    renderAdminPage(vi.fn(), ['/admin?tab=proposals'])
    expect(await screen.findByText('Ktor Client')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = screen.getByRole('dialog', { name: 'Review "Ktor Client"' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(await within(dialog).findByText("An entry named 'Ktor Client' already exists")).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument() // stays open, proposal still pending
    expect(screen.queryByRole('status')).toBeNull() // no toast for a field-mappable error
  })

  it('rejects a proposal behind a confirm dialog, toasts success, and drops the badge', async () => {
    const proposal = makeProposal()
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([proposal]) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...proposal, status: 'REJECTED', reviewedAt: '2026-07-16T00:00:00Z' }),
      }) // POST .../reject
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) }) // refetch, now empty

    renderAdminPage(vi.fn(), ['/admin?tab=proposals'])
    expect(await screen.findByText('Ktor Client')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    const confirmDialog = screen.getByRole('dialog', { name: "Reject 'Ktor Client'?" })
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Reject' }))

    expect(await screen.findByRole('status')).toHaveTextContent('"Ktor Client" rejected')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByRole('tab', { name: 'Proposals' })).toBeInTheDocument() // badge gone
  })

  it('logs out and shows a session-expired toast when approve gets a 401', async () => {
    const proposal = makeProposal()
    const logout = vi.fn()
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeEntry()]) })
    proposalsFetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([proposal]) })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Token is not valid or has expired' } }),
      })

    renderAdminPage(logout, ['/admin?tab=proposals'])
    expect(await screen.findByText('Ktor Client')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = screen.getByRole('dialog', { name: 'Review "Ktor Client"' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Session expired')
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
