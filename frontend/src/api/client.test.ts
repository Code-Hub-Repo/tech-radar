import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEntries } from './client'
import type { Entry } from './types'

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
