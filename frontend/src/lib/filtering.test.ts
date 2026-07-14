import { describe, expect, it } from 'vitest'
import { matchedIds } from './filtering'
import type { Entry, FilterState } from '../api/types'

let nextId = 1

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  const id = overrides.id ?? nextId++
  return {
    id,
    name: `Entry ${id}`,
    quadrant: 'TOOLS',
    ring: 'ADOPT',
    description: '',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const EMPTY_FILTER_STATE: FilterState = {
  quadrants: [],
  rings: [],
  newOnly: false,
  query: '',
  selectedEntryId: null,
}

describe('matchedIds', () => {
  it('returns all ids when FilterState is empty', () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()]
    const result = matchedIds(entries, EMPTY_FILTER_STATE)
    expect(result).toEqual(new Set(entries.map((entry) => entry.id)))
  })

  it('filters by quadrant', () => {
    const tools = makeEntry({ quadrant: 'TOOLS' })
    const platforms = makeEntry({ quadrant: 'PLATFORMS' })
    const result = matchedIds([tools, platforms], { ...EMPTY_FILTER_STATE, quadrants: ['TOOLS'] })
    expect(result).toEqual(new Set([tools.id]))
  })

  it('filters by ring', () => {
    const adopt = makeEntry({ ring: 'ADOPT' })
    const hold = makeEntry({ ring: 'HOLD' })
    const result = matchedIds([adopt, hold], { ...EMPTY_FILTER_STATE, rings: ['ADOPT'] })
    expect(result).toEqual(new Set([adopt.id]))
  })

  it('filters by newOnly', () => {
    const fresh = makeEntry({ isNew: true })
    const old = makeEntry({ isNew: false })
    const result = matchedIds([fresh, old], { ...EMPTY_FILTER_STATE, newOnly: true })
    expect(result).toEqual(new Set([fresh.id]))
  })

  it('filters by case-insensitive name query', () => {
    const kotlin = makeEntry({ name: 'Kotlin' })
    const docker = makeEntry({ name: 'Docker' })
    const result = matchedIds([kotlin, docker], { ...EMPTY_FILTER_STATE, query: 'KOT' })
    expect(result).toEqual(new Set([kotlin.id]))
  })

  it('filters by case-insensitive description query', () => {
    const match = makeEntry({ name: 'Alpha', description: 'A JVM language' })
    const noMatch = makeEntry({ name: 'Beta', description: 'A build tool' })
    const result = matchedIds([match, noMatch], { ...EMPTY_FILTER_STATE, query: 'jvm' })
    expect(result).toEqual(new Set([match.id]))
  })

  it('combines quadrant AND ring AND newOnly AND query', () => {
    const target = makeEntry({ quadrant: 'TOOLS', ring: 'ADOPT', isNew: true, name: 'Docker' })
    const wrongQuadrant = makeEntry({ quadrant: 'PLATFORMS', ring: 'ADOPT', isNew: true, name: 'Docker' })
    const wrongRing = makeEntry({ quadrant: 'TOOLS', ring: 'HOLD', isNew: true, name: 'Docker' })
    const notNew = makeEntry({ quadrant: 'TOOLS', ring: 'ADOPT', isNew: false, name: 'Docker' })
    const wrongQuery = makeEntry({ quadrant: 'TOOLS', ring: 'ADOPT', isNew: true, name: 'Kotlin' })

    const result = matchedIds([target, wrongQuadrant, wrongRing, notNew, wrongQuery], {
      quadrants: ['TOOLS'],
      rings: ['ADOPT'],
      newOnly: true,
      query: 'dock',
      selectedEntryId: null,
    })
    expect(result).toEqual(new Set([target.id]))
  })
})
