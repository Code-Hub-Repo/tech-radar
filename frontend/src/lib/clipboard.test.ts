import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from './clipboard'

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves true and writes the given text when the Clipboard API succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(copyToClipboard('https://radar.codehub.gr/?entry=1')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://radar.codehub.gr/?entry=1')
  })

  it('resolves false when the Clipboard API is unavailable (no navigator.clipboard at all)', async () => {
    vi.stubGlobal('navigator', {})

    await expect(copyToClipboard('https://radar.codehub.gr/')).resolves.toBe(false)
  })

  it('resolves false (never throws) when writeText rejects', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })

    await expect(copyToClipboard('https://radar.codehub.gr/')).resolves.toBe(false)
  })
})
