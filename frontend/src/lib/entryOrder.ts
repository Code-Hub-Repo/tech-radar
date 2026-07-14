import type { Entry, Quadrant, Ring } from '../api/types'

// Canonical display/tab order, shared by the list view (this file) and the radar (a later
// wave imports these same arrays) — RADR-06's numbered cross-reference depends on both
// surfaces deriving numbers from this exact sequence.
export const QUADRANT_ORDER: Quadrant[] = [
  'LANGUAGES_FRAMEWORKS',
  'TOOLS',
  'PLATFORMS',
  'TECHNIQUES',
]

export const RING_ORDER: Ring[] = ['ADOPT', 'TRIAL', 'ASSESS', 'HOLD']

export interface NumberedEntry {
  entry: Entry
  number: number
}

export interface EntryRingGroup {
  ring: Ring
  entries: NumberedEntry[]
}

export interface EntryQuadrantGroup {
  quadrant: Quadrant
  rings: EntryRingGroup[]
}

// Pure: quadrant -> ring -> alphabetical-by-name, then 1-based sequential numbering.
// Same input always produces identical output (fresh copy + fixed comparator, no
// external state), which is what makes the numbering stable across reloads.
export function orderedEntries(entries: Entry[]): NumberedEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const quadrantDiff = QUADRANT_ORDER.indexOf(a.quadrant) - QUADRANT_ORDER.indexOf(b.quadrant)
    if (quadrantDiff !== 0) {
      return quadrantDiff
    }
    const ringDiff = RING_ORDER.indexOf(a.ring) - RING_ORDER.indexOf(b.ring)
    if (ringDiff !== 0) {
      return ringDiff
    }
    return a.name.localeCompare(b.name)
  })

  return sorted.map((entry, index) => ({ entry, number: index + 1 }))
}

// Nests orderedEntries' output into quadrant -> ring groups for EntryListView's grouped
// rendering, preserving the numbering assigned above. Empty groups are omitted so the list
// never renders a section header with zero rows beneath it.
export function groupedEntries(entries: Entry[]): EntryQuadrantGroup[] {
  const numbered = orderedEntries(entries)
  const quadrantGroups: EntryQuadrantGroup[] = []

  for (const quadrant of QUADRANT_ORDER) {
    const rings: EntryRingGroup[] = []

    for (const ring of RING_ORDER) {
      const ringEntries = numbered.filter(
        (item) => item.entry.quadrant === quadrant && item.entry.ring === ring,
      )
      if (ringEntries.length > 0) {
        rings.push({ ring, entries: ringEntries })
      }
    }

    if (rings.length > 0) {
      quadrantGroups.push({ quadrant, rings })
    }
  }

  return quadrantGroups
}
