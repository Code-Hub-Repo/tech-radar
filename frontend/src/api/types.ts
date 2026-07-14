// Frozen API contract — mirrors backend/core_api DTOs exactly. Wire values are byte-identical
// to the Kotlin enum constant names (kotlinx.serialization's default enum serializer emits
// `.name` verbatim). No casing transforms, no normalization — plain unions only.

export type Ring = 'ADOPT' | 'TRIAL' | 'ASSESS' | 'HOLD'

export type Quadrant = 'LANGUAGES_FRAMEWORKS' | 'TOOLS' | 'PLATFORMS' | 'TECHNIQUES'

export type Movement = 'IN' | 'OUT' | 'NONE'

export interface Entry {
  id: number
  name: string
  quadrant: Quadrant
  ring: Ring
  description: string
  isNew: boolean
  movement: Movement
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface FilterState {
  quadrants: Quadrant[] // [] = all
  rings: Ring[] // [] = all
  newOnly: boolean
  query: string
  selectedEntryId: number | null
}

// Display-label mapping — single source for aria-labels, chip text, legend, and detail panel text.
export const ringLabel: Record<Ring, string> = {
  ADOPT: 'Adopt',
  TRIAL: 'Trial',
  ASSESS: 'Assess',
  HOLD: 'Hold',
}

export const quadrantLabel: Record<Quadrant, string> = {
  LANGUAGES_FRAMEWORKS: 'Languages & Frameworks',
  TOOLS: 'Tools',
  PLATFORMS: 'Platforms',
  TECHNIQUES: 'Techniques',
}

export const movementLabel: Record<Movement, string> = {
  IN: 'Moved in',
  OUT: 'Moved out',
  NONE: '',
}

// URL-slug mapping — kebab-case for multi-word values (e.g. LANGUAGES_FRAMEWORKS -> 'languages-frameworks').
export const ringSlug: Record<Ring, string> = {
  ADOPT: 'adopt',
  TRIAL: 'trial',
  ASSESS: 'assess',
  HOLD: 'hold',
}

export const quadrantSlug: Record<Quadrant, string> = {
  LANGUAGES_FRAMEWORKS: 'languages-frameworks',
  TOOLS: 'tools',
  PLATFORMS: 'platforms',
  TECHNIQUES: 'techniques',
}

// Reverse lookups, derived from the maps above (single source of truth) — used by future
// defensive URL-param parsing (lib/urlParams.ts): an unrecognized slug simply has no entry.
export const ringFromSlug: Record<string, Ring> = Object.fromEntries(
  (Object.entries(ringSlug) as [Ring, string][]).map(([ring, slug]) => [slug, ring]),
)

export const quadrantFromSlug: Record<string, Quadrant> = Object.fromEntries(
  (Object.entries(quadrantSlug) as [Quadrant, string][]).map(([quadrant, slug]) => [slug, quadrant]),
)
