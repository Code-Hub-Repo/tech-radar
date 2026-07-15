import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createEntry, deleteEntry, fetchEntries, isUnauthorizedError, login, updateEntry } from './client'
import type { Entry, EntryRequest } from './types'

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
