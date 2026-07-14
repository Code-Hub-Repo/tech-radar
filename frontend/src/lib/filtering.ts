// Pure quadrant/ring/newOnly/query matching (EXPL-01, EXPL-02). Returns the Set of matching
// entry ids only -- never filters the input array itself, since the radar's dimmed-blip
// treatment (EXPL-03) needs every entry to keep rendering, just faded when not in the set.
import type { Entry, FilterState } from '../api/types'

export function matchedIds(entries: Entry[], filterState: FilterState): Set<number> {
  const { quadrants, rings, newOnly, query } = filterState
  const normalizedQuery = query.toLowerCase()

  const matched = new Set<number>()
  for (const entry of entries) {
    const matchesQuadrant = quadrants.length === 0 || quadrants.includes(entry.quadrant)
    const matchesRing = rings.length === 0 || rings.includes(entry.ring)
    const matchesNewOnly = !newOnly || entry.isNew
    const matchesQuery =
      normalizedQuery === '' ||
      entry.name.toLowerCase().includes(normalizedQuery) ||
      entry.description.toLowerCase().includes(normalizedQuery)

    if (matchesQuadrant && matchesRing && matchesNewOnly && matchesQuery) {
      matched.add(entry.id)
    }
  }
  return matched
}
