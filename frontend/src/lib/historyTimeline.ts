// Pure derivation: entry_history snapshots -> a compact timeline (HIST-01). The oldest snapshot
// is always the CREATED row (EntriesRepository writes it atomically with the entry itself, in
// the same transaction -- backend/core_db's EntriesRepository -- so there is exactly one per
// entry, and it is always first once sorted ascending). Every later snapshot becomes a row only
// when its ring differs from the immediately preceding one, so description-only edits are
// silently skipped (CONTEXT.md: "Ignore description-only edits"). Rows are returned oldest ->
// newest, read top-to-bottom like a story ("Added to the radar" first, each ring move after it
// in the order it happened) -- callers render them in this order directly.
import type { Ring } from '../api/types'

export interface HistorySnapshot {
  id: number
  ring: Ring
  changedAt: string
}

export type TimelineRow =
  | { id: number; kind: 'created'; ring: Ring; date: string }
  | { id: number; kind: 'ring-change'; fromRing: Ring; toRing: Ring; date: string }

export function deriveHistoryTimeline(snapshots: HistorySnapshot[]): TimelineRow[] {
  if (snapshots.length === 0) {
    return []
  }

  const ascending = [...snapshots].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())

  const [first, ...rest] = ascending
  const rows: TimelineRow[] = [{ id: first.id, kind: 'created', ring: first.ring, date: first.changedAt }]

  let previousRing = first.ring
  for (const snapshot of rest) {
    if (snapshot.ring !== previousRing) {
      rows.push({
        id: snapshot.id,
        kind: 'ring-change',
        fromRing: previousRing,
        toRing: snapshot.ring,
        date: snapshot.changedAt,
      })
    }
    previousRing = snapshot.ring
  }

  return rows
}
