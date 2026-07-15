import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Entry } from '../../api/types'
import { EntryTable } from './EntryTable'

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
    updatedAt: '2026-01-10T00:00:00Z',
    ...overrides,
  }
}

const entries: Entry[] = [
  makeEntry({ id: 1, name: 'Kotlin', updatedAt: '2026-01-10T00:00:00Z' }),
  makeEntry({ id: 2, name: 'Renovate', quadrant: 'TOOLS', ring: 'ASSESS', isNew: true, updatedAt: '2026-06-01T00:00:00Z' }),
]

describe('EntryTable', () => {
  it('renders one row per entry with number/name/quadrant/ring/isNew/updatedAt columns', () => {
    render(<EntryTable entries={entries} onEdit={() => {}} onDeleteRequest={() => {}} />)

    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Quadrant/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Ring/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /New/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Updated/ })).toBeInTheDocument()

    const kotlinRow = screen.getByText('Kotlin').closest('tr')
    expect(kotlinRow).toHaveTextContent('Languages & Frameworks')
    expect(kotlinRow).toHaveTextContent('Adopt')
  })

  it('defaults to sorting by updatedAt descending (most recently changed first)', () => {
    render(<EntryTable entries={entries} onEdit={() => {}} onDeleteRequest={() => {}} />)

    const rows = screen.getAllByRole('row').slice(1) // drop the header row
    expect(rows[0]).toHaveTextContent('Renovate')
    expect(rows[1]).toHaveTextContent('Kotlin')
    expect(screen.getByRole('columnheader', { name: /Updated/ })).toHaveAttribute('aria-sort', 'descending')
  })

  it('toggles sort direction when the same column header is clicked again', () => {
    render(<EntryTable entries={entries} onEdit={() => {}} onDeleteRequest={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /Name/ }))
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending')
    let rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Kotlin')

    fireEvent.click(screen.getByRole('button', { name: /Name/ }))
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'descending')
    rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Renovate')
  })

  it('resets an unrelated column to ascending when a new column is clicked', () => {
    render(<EntryTable entries={entries} onEdit={() => {}} onDeleteRequest={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /Name/ }))
    fireEvent.click(screen.getByRole('button', { name: /Ring/ }))

    expect(screen.getByRole('columnheader', { name: /Ring/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('filters rows by the search box and shows a no-match message', async () => {
    vi.useFakeTimers()
    render(<EntryTable entries={entries} onEdit={() => {}} onDeleteRequest={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Search technologies…'), { target: { value: 'kotlin' } })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByText('Kotlin')).toBeInTheDocument()
    expect(screen.queryByText('Renovate')).toBeNull()

    fireEvent.change(screen.getByPlaceholderText('Search technologies…'), { target: { value: 'nonexistent' } })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByText('No entries match "nonexistent".')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('calls onEdit with the entry when its Edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<EntryTable entries={entries} onEdit={onEdit} onDeleteRequest={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit Kotlin' }))

    expect(onEdit).toHaveBeenCalledWith(entries[0])
  })

  it('calls onDeleteRequest with the entry when its Delete button is clicked', () => {
    const onDeleteRequest = vi.fn()
    render(<EntryTable entries={entries} onEdit={() => {}} onDeleteRequest={onDeleteRequest} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Renovate' }))

    expect(onDeleteRequest).toHaveBeenCalledWith(entries[1])
  })
})
