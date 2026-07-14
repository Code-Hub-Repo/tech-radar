// Pure FilterState <-> URLSearchParams contract (EXPL-04). Every param is treated as
// untrusted input (T-02-URLI): unknown ring/quadrant slugs are dropped, a non-integer `entry`
// becomes "no selection" -- never thrown. Writes round-trip the FULL FilterState through
// paramsFromPatch on every call (parse current -> merge patch -> re-serialize) rather than
// hand-mutating individual URLSearchParams keys, which keeps the URL canonical (no empty
// params, clean root URL at defaults) at every step by construction.
import type { FilterState, Quadrant, Ring } from '../api/types'
import { quadrantFromSlug, quadrantSlug, ringFromSlug, ringSlug } from '../api/types'

const PARAM_QUADRANT = 'quadrant'
const PARAM_RING = 'ring'
const PARAM_NEW_ONLY = 'new'
const PARAM_QUERY = 'q'
const PARAM_ENTRY = 'entry'

function parseSlugList<T extends string>(raw: string | null, fromSlug: Record<string, T>): T[] {
  if (raw === null || raw === '') {
    return []
  }
  return raw
    .split(',')
    .map((slug) => fromSlug[slug])
    .filter((value): value is T => value !== undefined)
}

function parseSelectedEntryId(raw: string | null): number | null {
  // Guard the empty string explicitly -- Number('') coerces to 0 in JS, which would otherwise
  // pass Number.isInteger and silently resolve `?entry=` (no value) to "entry id 0 selected"
  // instead of "no selection" (T-02-URLI: every param is untrusted, malformed input must fall
  // back to the default, never a coincidental parse).
  if (raw === null || raw === '') {
    return null
  }
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : null
}

// Pure: every field defensively parsed, malformed/unknown input silently falls back to the
// "no filter"/"no selection" default -- never throws (T-02-URLI, RESEARCH Security Domain V5).
export function filterStateFromParams(searchParams: URLSearchParams): FilterState {
  return {
    quadrants: parseSlugList<Quadrant>(searchParams.get(PARAM_QUADRANT), quadrantFromSlug),
    rings: parseSlugList<Ring>(searchParams.get(PARAM_RING), ringFromSlug),
    newOnly: searchParams.get(PARAM_NEW_ONLY) === 'true',
    query: searchParams.get(PARAM_QUERY) ?? '',
    selectedEntryId: parseSelectedEntryId(searchParams.get(PARAM_ENTRY)),
  }
}

// Pure: serializes a FilterState back to URLSearchParams, omitting every field at its default
// value so the at-rest/landing URL is a clean root -- never `?quadrant=&ring=...`.
function filterStateToParams(filterState: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filterState.quadrants.length > 0) {
    params.set(
      PARAM_QUADRANT,
      filterState.quadrants.map((quadrant) => quadrantSlug[quadrant]).join(','),
    )
  }
  if (filterState.rings.length > 0) {
    params.set(PARAM_RING, filterState.rings.map((ring) => ringSlug[ring]).join(','))
  }
  if (filterState.newOnly) {
    params.set(PARAM_NEW_ONLY, 'true')
  }
  if (filterState.query !== '') {
    params.set(PARAM_QUERY, filterState.query)
  }
  if (filterState.selectedEntryId !== null) {
    params.set(PARAM_ENTRY, String(filterState.selectedEntryId))
  }

  return params
}

// Pure: merges `patch` onto the FilterState parsed from `prev`, then re-serializes the full
// result. The caller decides push vs replace via setSearchParams' own second argument -- this
// function only ever computes the next URLSearchParams value.
export function paramsFromPatch(prev: URLSearchParams, patch: Partial<FilterState>): URLSearchParams {
  const current = filterStateFromParams(prev)
  return filterStateToParams({ ...current, ...patch })
}
