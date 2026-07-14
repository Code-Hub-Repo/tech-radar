import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Entry, FilterState } from '../../api/types'
import { RadarChart } from './RadarChart'

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

const DEFAULT_FILTER_STATE: FilterState = {
  quadrants: [],
  rings: [],
  newOnly: false,
  query: '',
  selectedEntryId: null,
}

function noop() {}

describe('RadarChart', () => {
  it('renders exactly one accessible button blip per entry', () => {
    const entries: Entry[] = [
      makeEntry({ id: 1, name: 'Kotlin', quadrant: 'LANGUAGES_FRAMEWORKS', ring: 'ADOPT' }),
      makeEntry({ id: 2, name: 'Docker', quadrant: 'TOOLS', ring: 'TRIAL' }),
      makeEntry({ id: 3, name: 'Firebase', quadrant: 'PLATFORMS', ring: 'ADOPT' }),
      makeEntry({ id: 4, name: 'Detekt', quadrant: 'TOOLS', ring: 'ASSESS' }),
    ]

    render(
      <RadarChart
        entries={entries}
        filterState={DEFAULT_FILTER_STATE}
        selectedEntryId={null}
        size={400}
        isLoading={false}
        onBlipSelect={noop}
      />,
    )

    expect(screen.getAllByRole('button')).toHaveLength(entries.length)
  })

  it('gives a blip button the exact "{name} — {Ring}, {Quadrant}" aria-label format', () => {
    const entries: Entry[] = [
      makeEntry({ id: 1, name: 'Kotlin', quadrant: 'LANGUAGES_FRAMEWORKS', ring: 'ADOPT' }),
    ]

    render(
      <RadarChart
        entries={entries}
        filterState={DEFAULT_FILTER_STATE}
        selectedEntryId={null}
        size={400}
        isLoading={false}
        onBlipSelect={noop}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Kotlin — Adopt, Languages & Frameworks' }),
    ).toBeInTheDocument()
  })

  it('renders zero blip buttons (skeleton chrome only) while isLoading', () => {
    const entries: Entry[] = [makeEntry({ id: 1, name: 'Kotlin' })]

    render(
      <RadarChart
        entries={entries}
        filterState={DEFAULT_FILTER_STATE}
        selectedEntryId={null}
        size={400}
        isLoading
        onBlipSelect={noop}
      />,
    )

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
