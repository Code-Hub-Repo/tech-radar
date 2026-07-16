import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  approveProposal,
  createEntry,
  deleteEntry,
  fetchEntries,
  fetchEntryHistory,
  fetchProposals,
  isUnauthorizedError,
  login,
  rejectProposal,
  submitProposal,
  updateEntry,
} from './client'
import type { Entry, EntryRequest, HistoryEntry, Proposal, ProposalRequest } from './types'

const mockEntries: Entry[] = [
  {
    id: 1,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    description: 'A pragmatic, statically typed language.',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

describe('fetchEntries', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves to the parsed Entry[] on a 200 response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockEntries),
    })

    await expect(fetchEntries()).resolves.toEqual(mockEntries)
  })

  it('throws carrying the status when the response is not ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null),
    })

    await expect(fetchEntries()).rejects.toThrow('500')
  })

  it('requests a URL ending with /api/entries', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockEntries),
    })

    await fetchEntries()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    expect(calledUrl.endsWith('/api/entries')).toBe(true)
  })
})

const validationErrorEnvelope = {
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Validation failed',
    details: { name: 'Name is required' },
  },
}

describe('login', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves to {token, expiresAt} on a 200 response and never sends the password in the URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ token: 'jwt-value', expiresAt: '2026-07-15T18:00:00Z' }),
    })

    await expect(login('admin', 'test-password')).resolves.toEqual({
      token: 'jwt-value',
      expiresAt: '2026-07-15T18:00:00Z',
    })

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).not.toContain('test-password')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ username: 'admin', password: 'test-password' })
  })

  it('throws an ApiError with the envelope message on a 401 response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Invalid username or password' } }),
    })

    await expect(login('admin', 'wrong')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password',
    })
  })

  it('falls back to a friendly message on a 429 with an empty body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    })

    await expect(login('admin', 'wrong')).rejects.toMatchObject({
      status: 429,
      message: 'Too many attempts, try again shortly',
    })
  })
})

describe('admin mutation functions', () => {
  const fetchMock = vi.fn()
  const request: EntryRequest = {
    name: 'Svelte',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ASSESS',
    description: 'A compiler-based UI framework.',
  }

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createEntry POSTs to /api/entries with a Bearer token and the entry body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 21, ...request, isNew: true, movement: 'NONE' }),
    })

    await createEntry('jwt-value', request)

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/entries')).toBe(true)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-value')
    expect(JSON.parse(init.body as string)).toEqual(request)
  })

  it('createEntry rejects a 409 duplicate-name response as an ApiError with no field details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({ error: { code: 'DUPLICATE_NAME', message: "An entry named 'Kotlin' already exists" } }),
    })

    const error = await createEntry('jwt-value', request).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(409)
    expect((error as ApiError).details).toBeUndefined()
  })

  it('createEntry rejects a 400 response carrying field-level details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve(validationErrorEnvelope),
    })

    const error = await createEntry('jwt-value', request).catch((caught: unknown) => caught)

    expect((error as ApiError).details).toEqual({ name: 'Name is required' })
  })

  it('updateEntry PUTs to /api/entries/{id}', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 7, ...request, isNew: false, movement: 'NONE' }),
    })

    await updateEntry('jwt-value', 7, request)

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/entries/7')).toBe(true)
    expect(init.method).toBe('PUT')
  })

  it('deleteEntry DELETEs to /api/entries/{id} and resolves with no body on 204', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(undefined) })

    await expect(deleteEntry('jwt-value', 7)).resolves.toBeUndefined()

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/entries/7')).toBe(true)
    expect(init.method).toBe('DELETE')
  })

  it('a 401 from any mutation rejects with an ApiError isUnauthorizedError recognizes', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Token is not valid or has expired' } }),
    })

    const error = await deleteEntry('jwt-value', 7).catch((caught: unknown) => caught)

    expect(isUnauthorizedError(error)).toBe(true)
    expect(isUnauthorizedError(new Error('some other error'))).toBe(false)
  })
})

describe('fetchEntryHistory', () => {
  const fetchMock = vi.fn()
  const mockHistory: HistoryEntry[] = [
    {
      id: 1,
      entryId: 1,
      name: 'Kotlin',
      quadrant: 'LANGUAGES_FRAMEWORKS',
      ring: 'ADOPT',
      description: 'A pragmatic, statically typed language.',
      isNew: true,
      changeType: 'CREATED',
      changedAt: '2026-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves to the parsed HistoryEntry[] on a 200 response', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(mockHistory) })

    await expect(fetchEntryHistory(1)).resolves.toEqual(mockHistory)
  })

  it('requests a URL carrying the entryId as a query param', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(mockHistory) })

    await fetchEntryHistory(1)

    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    expect(calledUrl.endsWith('/api/entries/history?entryId=1')).toBe(true)
  })

  it('throws carrying the status when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve(null) })

    await expect(fetchEntryHistory(1)).rejects.toThrow('500')
  })
})

describe('submitProposal', () => {
  const fetchMock = vi.fn()
  const request: ProposalRequest = {
    name: 'Ktor Client',
    quadrant: 'TOOLS',
    ring: 'ASSESS',
    description: 'A lightweight, coroutine-based HTTP client.',
  }

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to /api/proposals with no auth header and resolves to the created Proposal on 201', async () => {
    const created: Proposal = {
      id: 9,
      ...request,
      submitterName: null,
      status: 'PENDING',
      entryId: null,
      createdAt: '2026-07-16T00:00:00Z',
      reviewedAt: null,
    }
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve(created) })

    await expect(submitProposal(request)).resolves.toEqual(created)

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/proposals')).toBe(true)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(JSON.parse(init.body as string)).toEqual(request)
  })

  it('rejects a 400 response carrying field-level details', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve(validationErrorEnvelope) })

    const error = await submitProposal(request).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).details).toEqual({ name: 'Name is required' })
  })

  it('falls back to a friendly message on a 429 with an empty body (the rate limiter firing)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: () => Promise.reject(new SyntaxError('no body')) })

    const error = await submitProposal(request).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(429)
    expect((error as ApiError).message).toBe('Too many attempts, try again shortly')
  })
})

describe('admin proposal moderation functions', () => {
  const fetchMock = vi.fn()
  const mockProposal: Proposal = {
    id: 4,
    name: 'Ktor Client',
    quadrant: 'TOOLS',
    ring: 'ASSESS',
    description: 'A lightweight, coroutine-based HTTP client.',
    submitterName: 'Jane',
    status: 'PENDING',
    entryId: null,
    createdAt: '2026-07-16T00:00:00Z',
    reviewedAt: null,
  }

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchProposals GETs /api/proposals with a Bearer token and no query when status is omitted', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([mockProposal]) })

    await expect(fetchProposals('jwt-value')).resolves.toEqual([mockProposal])

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/proposals')).toBe(true)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-value')
  })

  it('fetchProposals appends ?status= when a filter is passed', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([mockProposal]) })

    await fetchProposals('jwt-value', 'PENDING')

    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    expect(calledUrl.endsWith('/api/proposals?status=PENDING')).toBe(true)
  })

  it('approveProposal POSTs overrides to /api/proposals/{id}/approve and resolves {proposal, entry}', async () => {
    const entry: Entry = {
      id: 21,
      name: 'Ktor Client',
      quadrant: 'TOOLS',
      ring: 'ASSESS',
      description: 'A lightweight, coroutine-based HTTP client.',
      isNew: true,
      movement: 'NONE',
      createdAt: '2026-07-16T00:00:00Z',
      updatedAt: '2026-07-16T00:00:00Z',
    }
    const approved: Proposal = { ...mockProposal, status: 'APPROVED', entryId: 21, reviewedAt: '2026-07-16T00:05:00Z' }
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ proposal: approved, entry }),
    })

    const overrides = { ring: 'TRIAL' as const }
    await expect(approveProposal('jwt-value', 4, overrides)).resolves.toEqual({ proposal: approved, entry })

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/proposals/4/approve')).toBe(true)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-value')
    expect(JSON.parse(init.body as string)).toEqual(overrides)
  })

  it('approveProposal rejects a 409 duplicate-name response as an ApiError (proposal stays PENDING)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({ error: { code: 'DUPLICATE_NAME', message: "An entry named 'Kotlin' already exists" } }),
    })

    const error = await approveProposal('jwt-value', 4, {}).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(409)
    expect((error as ApiError).message).toBe("An entry named 'Kotlin' already exists")
  })

  it('rejectProposal POSTs to /api/proposals/{id}/reject and resolves the REJECTED Proposal', async () => {
    const rejected: Proposal = { ...mockProposal, status: 'REJECTED', reviewedAt: '2026-07-16T00:05:00Z' }
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(rejected) })

    await expect(rejectProposal('jwt-value', 4)).resolves.toEqual(rejected)

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/proposals/4/reject')).toBe(true)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-value')
  })

  it('a 401 from any admin proposal call rejects with an ApiError isUnauthorizedError recognizes', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Token is not valid or has expired' } }),
    })

    const error = await fetchProposals('jwt-value').catch((caught: unknown) => caught)

    expect(isUnauthorizedError(error)).toBe(true)
  })
})
