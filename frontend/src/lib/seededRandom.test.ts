import { describe, expect, it } from 'vitest'
import { seededRng } from './seededRandom'

describe('seededRng', () => {
  it('yields a deterministic [0,1) sequence', () => {
    const rng = seededRng(42)
    const sequence = [rng(), rng(), rng(), rng(), rng()]

    for (const value of sequence) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('produces identical sequences for two independent instances with an equal seed', () => {
    const a = seededRng(7)
    const b = seededRng(7)

    const sequenceA = [a(), a(), a(), a(), a()]
    const sequenceB = [b(), b(), b(), b(), b()]

    expect(sequenceB).toEqual(sequenceA)
  })

  it('produces different sequences for different seeds', () => {
    const a = seededRng(1)
    const b = seededRng(2)

    expect(a()).not.toBe(b())
  })
})
