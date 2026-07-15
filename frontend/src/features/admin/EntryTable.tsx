// Sortable + filterable entries table (ADMN-03). Sort/filter logic itself lives in
// lib/adminTable.ts (pure, unit-tested); this component is the rendering + interaction layer
// only. "Add technology" lives in AdminPage's header, not here (matches the page-pattern spec:
// header row owns the primary action, the table owns per-row Edit/Delete).
import { useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import type { Entry } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import type { SortColumn, SortDirection } from '../../lib/adminTable'
import { buildNumberedRows, filterRowsByQuery, sortRows } from '../../lib/adminTable'
import { SearchInput } from '../entries/SearchInput'

interface EntryTableProps {
  entries: Entry[]
  onEdit: (entry: Entry) => void
  onDeleteRequest: (entry: Entry) => void
}

// updatedAt/desc surfaces the most recently changed entries first -- the more useful default
// for an admin monitoring recent edits (entryOrder's own quadrant/ring/name order is still one
// click away via the Number column, and every row keeps that fixed cross-reference number
// regardless of the active sort).
const DEFAULT_SORT_COLUMN: SortColumn = 'updatedAt'
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc'
const SEARCH_DEBOUNCE_MS = 200

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'number', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'quadrant', label: 'Quadrant' },
  { key: 'ring', label: 'Ring' },
  { key: 'isNew', label: 'New' },
  { key: 'updatedAt', label: 'Updated' },
]

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function EntryTable({ entries, onEdit, onDeleteRequest }: EntryTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(DEFAULT_SORT_COLUMN)
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_SORT_DIRECTION)
  const [query, setQuery] = useState('')

  const numbered = buildNumberedRows(entries)
  const filtered = filterRowsByQuery(numbered, query)
  const rows = sortRows(filtered, sortColumn, sortDirection)

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SearchInput value={query} onChange={setQuery} debounceMs={SEARCH_DEBOUNCE_MS} />
        <p aria-live="polite" aria-atomic="true" className="font-mono text-[13px] leading-[1.4] text-muted">
          {rows.length} of {entries.length} entries
        </p>
      </div>
      {/* min-w-0 overrides this flex item's default min-width:auto -- without it, a flex column
          child's automatic minimum size is based on its content's intrinsic width (the table's
          own min-w-[720px]), which forces this div (and everything up the tree) wider than the
          viewport at narrow widths instead of letting overflow-x-auto contain the scroll here
          (the same flexbox "implied minimum size" gotcha EntryListRow.tsx's name span hit in
          Phase 2 -- confirmed live via headless Chrome, invisible to jsdom/happy-dom tests). */}
      <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((column) => {
                const isActive = column.key === sortColumn
                const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
                return (
                  <th key={column.key} scope="col" aria-sort={ariaSort} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex cursor-pointer items-center gap-1 font-mono text-[13px] font-semibold uppercase tracking-wide text-muted transition-colors duration-200 hover:text-foreground"
                    >
                      {column.label}
                      {isActive ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp size={14} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={14} aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown size={14} aria-hidden="true" className="opacity-40" />
                      )}
                    </button>
                  </th>
                )
              })}
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry, number }) => (
              <tr key={entry.id} className="border-b border-border last:border-b-0 hover:bg-surface-raised">
                <td className="px-4 py-3 font-mono text-[14px] leading-[1.4] tabular-nums text-muted">{number}</td>
                <td className="px-4 py-3 font-sans text-[14px] font-semibold leading-[1.4] text-foreground">
                  {entry.name}
                </td>
                <td className="px-4 py-3 font-mono text-[13px] leading-[1.4] text-muted">
                  {quadrantLabel[entry.quadrant]}
                </td>
                <td className="px-4 py-3 font-mono text-[13px] leading-[1.4] text-muted">{ringLabel[entry.ring]}</td>
                <td className="px-4 py-3 font-mono text-[13px] leading-[1.4] text-muted">
                  {entry.isNew ? 'Yes' : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-[13px] leading-[1.4] text-muted">
                  {DATE_FORMATTER.format(new Date(entry.updatedAt))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      aria-label={`Edit ${entry.name}`}
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-raised hover:text-foreground"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRequest(entry)}
                      aria-label={`Delete ${entry.name}`}
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center font-mono text-[14px] leading-[1.4] text-muted">
            No entries match "{query}".
          </p>
        ) : null}
      </div>
    </div>
  )
}
