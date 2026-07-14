import { describe, expect, it } from 'vitest'
import { groupedEntries, orderedEntries, QUADRANT_ORDER, RING_ORDER } from './entryOrder'
import type { Entry } from '../api/types'

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

const entries: Entry[] = [
  makeEntry({ id: 1, name: 'Zookeeper', quadrant: 'TOOLS', ring: 'ADOPT' }),
  makeEntry({ id: 2, name: 'Ansible', quadrant: 'TOOLS', ring: 'ADOPT' }),
  makeEntry({ id: 3, name: 'Kotlin', quadrant: 'LANGUAGES_FRAMEWORKS', ring: 'ADOPT' }),
  makeEntry({ id: 4, name: 'TypeScript', quadrant: 'LANGUAGES_FRAMEWORKS', ring: 'TRIAL' }),
  makeEntry({ id: 5, name: 'Docker', quadrant: 'TOOLS', ring: 'TRIAL' }),
]

describe('QUADRANT_ORDER / RING_ORDER', () => {
  it('exposes the canonical quadrant and ring sequences', () => {
    expect(QUADRANT_ORDER).toEqual(['LANGUAGES_FRAMEWORKS', 'TOOLS', 'PLATFORMS', 'TECHNIQUES'])
    expect(RING_ORDER).toEqual(['ADOPT', 'TRIAL', 'ASSESS', 'HOLD'])
  })
})

describe('orderedEntries', () => {
  it('sorts by quadrant order, then ring order, then name (locale)', () => {
    const result = orderedEntries(entries)
    expect(result.map((r) => r.entry.name)).toEqual([
      'Kotlin',
      'TypeScript',
      'Ansible',
      'Zookeeper',
      'Docker',
    ])
  })

  it('assigns 1-based contiguous numbers', () => {
    const result = orderedEntries(entries)
    expect(result.map((r) => r.number)).toEqual([1, 2, 3, 4, 5])
  })

  it('is deterministic: the same input produces identical numbering across calls', () => {
    const first = orderedEntries(entries)
    const second = orderedEntries(entries)
    expect(first.map((r) => ({ id: r.entry.id, number: r.number }))).toEqual(
      second.map((r) => ({ id: r.entry.id, number: r.number })),
    )
  })
})

describe('groupedEntries', () => {
  it('nests entries by quadrant then ring, preserving orderedEntries numbering', () => {
    const groups = groupedEntries(entries)
    const flattened = groups.flatMap((quadrantGroup) =>
      quadrantGroup.rings.flatMap((ringGroup) => ringGroup.entries),
    )
    expect(flattened.map((n) => n.entry.name)).toEqual([
      'Kotlin',
      'TypeScript',
      'Ansible',
      'Zookeeper',
      'Docker',
    ])
    expect(flattened.map((n) => n.number)).toEqual([1, 2, 3, 4, 5])
  })

  it('orders quadrant groups per QUADRANT_ORDER and omits groups with no entries', () => {
    const groups = groupedEntries(entries)
    expect(groups.map((g) => g.quadrant)).toEqual(['LANGUAGES_FRAMEWORKS', 'TOOLS'])
  })
})
