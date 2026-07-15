// Pure sort/filter logic for EntryTable (ADMN-03), kept separate from rendering the same way
// filtering.ts/urlParams.ts/entryOrder.ts already are for the public radar -- unit-testable
// without RTL.
import type { Entry } from '../api/types'
import type { NumberedEntry } from './entryOrder'
import { QUADRANT_ORDER, RING_ORDER, orderedEntries } from './entryOrder'

export type SortColumn = 'number' | 'name' | 'quadrant' | 'ring' | 'isNew' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

// Fixed cross-reference numbers (RADR-06, the exact same values the public radar's blips use)
// computed once from the FULL entry set -- a row's number never changes as the admin re-sorts
// or filters the table, only which rows are visible/where they land does.
export function buildNumberedRows(entries: Entry[]): NumberedEntry[] {
  return orderedEntries(entries)
}

// Same name-or-description substring match as the public radar's own search (lib/filtering.ts)
// -- one mental model for "search" across the whole app, case-insensitive.
export function filterRowsByQuery(rows: NumberedEntry[], query: string): NumberedEntry[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') {
    return rows
  }
  return rows.filter(
    ({ entry }) =>
      entry.name.toLowerCase().includes(normalized) || entry.description.toLowerCase().includes(normalized),
  )
}

function compareValues(column: SortColumn, a: NumberedEntry, b: NumberedEntry): number {
  switch (column) {
    case 'number':
      return a.number - b.number
    case 'name':
      return a.entry.name.localeCompare(b.entry.name)
    case 'quadrant':
      return QUADRANT_ORDER.indexOf(a.entry.quadrant) - QUADRANT_ORDER.indexOf(b.entry.quadrant)
    case 'ring':
      return RING_ORDER.indexOf(a.entry.ring) - RING_ORDER.indexOf(b.entry.ring)
    case 'isNew':
      return Number(a.entry.isNew) - Number(b.entry.isNew)
    case 'updatedAt':
      return Date.parse(a.entry.updatedAt) - Date.parse(b.entry.updatedAt)
    default:
      return 0
  }
}

export function sortRows(rows: NumberedEntry[], column: SortColumn, direction: SortDirection): NumberedEntry[] {
  const sorted = [...rows].sort((a, b) => compareValues(column, a, b))
  return direction === 'asc' ? sorted : sorted.reverse()
}
