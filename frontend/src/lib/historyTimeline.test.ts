import { describe, expect, it } from 'vitest'
import { deriveHistoryTimeline } from './historyTimeline'
import type { HistorySnapshot } from './historyTimeline'

function snapshot(overrides: Partial<HistorySnapshot> = {}): HistorySnapshot {
  return { id: 1, ring: 'ADOPT', changedAt: '2026-01-01T00:00:00Z', ...overrides }
}

describe('deriveHistoryTimeline', () => {
  it('returns an empty array for no snapshots', () => {
    expect(deriveHistoryTimeline([])).toEqual([])
  })

  it('returns a single created row for one snapshot', () => {
    const rows = deriveHistoryTimeline([snapshot({ id: 1, ring: 'TRIAL', changedAt: '2026-07-14T00:00:00Z' })])

    expect(rows).toEqual([{ id: 1, kind: 'created', ring: 'TRIAL', date: '2026-07-14T00:00:00Z' }])
  })

  it('sorts unordered input into chronological (oldest-first) order before deriving rows', () => {
    // Fed newest-first (the API's own ORDER BY changed_at DESC shape) -- the function must
    // internally re-sort ascending rather than trust input order.
    const rows = deriveHistoryTimeline([
      snapshot({ id: 3, ring: 'ADOPT', changedAt: '2026-07-16T00:00:00Z' }),
      snapshot({ id: 1, ring: 'TRIAL', changedAt: '2026-07-14T00:00:00Z' }),
      snapshot({ id: 2, ring: 'ADOPT', changedAt: '2026-07-15T00:00:00Z' }),
    ])

    expect(rows).toEqual([
      { id: 1, kind: 'created', ring: 'TRIAL', date: '2026-07-14T00:00:00Z' },
      { id: 2, kind: 'ring-change', fromRing: 'TRIAL', toRing: 'ADOPT', date: '2026-07-15T00:00:00Z' },
      // id 3 stayed ADOPT -> ADOPT, no row.
    ])
  })

  it('emits a ring-change row only when the ring actually differs from the previous snapshot', () => {
    const rows = deriveHistoryTimeline([
      snapshot({ id: 1, ring: 'ASSESS', changedAt: '2026-01-01T00:00:00Z' }),
      snapshot({ id: 2, ring: 'ASSESS', changedAt: '2026-02-01T00:00:00Z' }), // description-only edit
      snapshot({ id: 3, ring: 'TRIAL', changedAt: '2026-03-01T00:00:00Z' }),
      snapshot({ id: 4, ring: 'ADOPT', changedAt: '2026-04-01T00:00:00Z' }),
    ])

    expect(rows).toEqual([
      { id: 1, kind: 'created', ring: 'ASSESS', date: '2026-01-01T00:00:00Z' },
      { id: 3, kind: 'ring-change', fromRing: 'ASSESS', toRing: 'TRIAL', date: '2026-03-01T00:00:00Z' },
      { id: 4, kind: 'ring-change', fromRing: 'TRIAL', toRing: 'ADOPT', date: '2026-04-01T00:00:00Z' },
    ])
  })

  it('ignores description-only edits entirely (never emits a row for an unchanged ring)', () => {
    const rows = deriveHistoryTimeline([
      snapshot({ id: 1, ring: 'HOLD', changedAt: '2026-01-01T00:00:00Z' }),
      snapshot({ id: 2, ring: 'HOLD', changedAt: '2026-02-01T00:00:00Z' }),
      snapshot({ id: 3, ring: 'HOLD', changedAt: '2026-03-01T00:00:00Z' }),
    ])

    expect(rows).toEqual([{ id: 1, kind: 'created', ring: 'HOLD', date: '2026-01-01T00:00:00Z' }])
  })

  it('handles a ring moving back and forth, emitting a row for every actual change', () => {
    const rows = deriveHistoryTimeline([
      snapshot({ id: 1, ring: 'TRIAL', changedAt: '2026-01-01T00:00:00Z' }),
      snapshot({ id: 2, ring: 'ADOPT', changedAt: '2026-02-01T00:00:00Z' }),
      snapshot({ id: 3, ring: 'TRIAL', changedAt: '2026-03-01T00:00:00Z' }),
    ])

    expect(rows).toEqual([
      { id: 1, kind: 'created', ring: 'TRIAL', date: '2026-01-01T00:00:00Z' },
      { id: 2, kind: 'ring-change', fromRing: 'TRIAL', toRing: 'ADOPT', date: '2026-02-01T00:00:00Z' },
      { id: 3, kind: 'ring-change', fromRing: 'ADOPT', toRing: 'TRIAL', date: '2026-03-01T00:00:00Z' },
    ])
  })
})
