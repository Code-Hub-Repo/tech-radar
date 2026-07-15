import { describe, expect, it } from 'vitest'
import type { Entry } from '../api/types'
import { buildNumberedRows, filterRowsByQuery, sortRows } from './adminTable'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    description: 'A pragmatic, statically typed language.',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const entries: Entry[] = [
  makeEntry({
    id: 1,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    isNew: false,
    updatedAt: '2026-01-01T00:00:00Z',
    description: 'A pragmatic, statically typed language.',
  }),
  makeEntry({
    id: 2,
    name: 'Renovate',
    quadrant: 'TOOLS',
    ring: 'ASSESS',
    isNew: true,
    updatedAt: '2026-06-01T00:00:00Z',
    description: 'Automated dependency update pull requests.',
  }),
  makeEntry({
    id: 3,
    name: 'GitFlow',
    quadrant: 'TECHNIQUES',
    ring: 'HOLD',
    isNew: false,
    updatedAt: '2026-03-01T00:00:00Z',
    description: 'A heavyweight branching model.',
  }),
]

describe('buildNumberedRows', () => {
  it('assigns the same cross-reference numbers as the public list (quadrant -> ring -> name order)', () => {
    const rows = buildNumberedRows(entries)

    expect(rows.map((row) => `${row.number}:${row.entry.name}`)).toEqual([
      '1:Kotlin', // LANGUAGES_FRAMEWORKS/ADOPT
      '2:Renovate', // TOOLS/ASSESS
      '3:GitFlow', // TECHNIQUES/HOLD
    ])
  })
})

describe('filterRowsByQuery', () => {
  const rows = buildNumberedRows(entries)

  it('returns every row for a blank query', () => {
    expect(filterRowsByQuery(rows, '')).toHaveLength(3)
    expect(filterRowsByQuery(rows, '   ')).toHaveLength(3)
  })

  it('matches by name, case-insensitively', () => {
    expect(filterRowsByQuery(rows, 'kotlin').map((row) => row.entry.name)).toEqual(['Kotlin'])
    expect(filterRowsByQuery(rows, 'KOTLIN').map((row) => row.entry.name)).toEqual(['Kotlin'])
  })

  it('matches by description substring too', () => {
    expect(filterRowsByQuery(rows, 'statically typed').map((row) => row.entry.name)).toEqual(['Kotlin'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterRowsByQuery(rows, 'nonexistent')).toHaveLength(0)
  })
})

describe('sortRows', () => {
  const rows = buildNumberedRows(entries)

  it('sorts by name ascending/descending', () => {
    expect(sortRows(rows, 'name', 'asc').map((row) => row.entry.name)).toEqual(['GitFlow', 'Kotlin', 'Renovate'])
    expect(sortRows(rows, 'name', 'desc').map((row) => row.entry.name)).toEqual(['Renovate', 'Kotlin', 'GitFlow'])
  })

  it('sorts by updatedAt (most recent last when ascending)', () => {
    expect(sortRows(rows, 'updatedAt', 'asc').map((row) => row.entry.name)).toEqual(['Kotlin', 'GitFlow', 'Renovate'])
    expect(sortRows(rows, 'updatedAt', 'desc').map((row) => row.entry.name)).toEqual(['Renovate', 'GitFlow', 'Kotlin'])
  })

  it('sorts by ring in ADOPT->TRIAL->ASSESS->HOLD order', () => {
    expect(sortRows(rows, 'ring', 'asc').map((row) => row.entry.name)).toEqual(['Kotlin', 'Renovate', 'GitFlow'])
  })

  it('sorts by isNew (false before true when ascending)', () => {
    expect(sortRows(rows, 'isNew', 'asc').map((row) => row.entry.isNew)).toEqual([false, false, true])
  })

  it('sorts by the fixed cross-reference number', () => {
    expect(sortRows(rows, 'number', 'desc').map((row) => row.number)).toEqual([3, 2, 1])
  })

  it('does not mutate the input array', () => {
    const original = [...rows]
    sortRows(rows, 'name', 'desc')

    expect(rows).toEqual(original)
  })
})
