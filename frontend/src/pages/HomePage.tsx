import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useEntries } from '../api/hooks'
import type { FilterState } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Header } from '../components/Header'
import { DetailPanel } from '../features/entries/DetailPanel'
import { EntryListView } from '../features/entries/EntryListView'
import { FilterBar } from '../features/entries/FilterBar'
import { Legend } from '../features/radar/Legend'
import { RadarChart } from '../features/radar/RadarChart'
import { matchedIds } from '../lib/filtering'
import { filterStateFromParams, paramsFromPatch } from '../lib/urlParams'

// Exact Copywriting Contract strings (UI-SPEC) -- named here so both the radar overlay and the
// list-area branch below render byte-identical copy (State Matrix: filtered-to-zero appears
// "in BOTH surfaces", each with its own copy of the message).
const FILTERED_TO_ZERO_HEADING = 'No matches found'
const FILTERED_TO_ZERO_BODY = 'Try adjusting your filters or search term.'
const CLEAR_FILTERS_LABEL = 'Clear filters'

// Internal SVG coordinate-space size for RadarChart's viewBox; the wrapping div below caps the
// actual rendered width (UI-SPEC's ultrawide radar cap), so this only affects proportions.
const RADAR_SIZE = 640

// The "Skip to list view" link is deferred until a later wave.
export function HomePage() {
  const { data, isPending, isError, refetch } = useEntries()
  const entries = data ?? []
  const [searchParams, setSearchParams] = useSearchParams()
  // Tracks the exact element that opened the panel (blip or list row) so focus returns to it
  // on close — never a "first blip" fallback (UI-SPEC Interaction Specs -> Close detail panel).
  const triggerRef = useRef<HTMLElement | null>(null)

  // URL is the single source of truth for both filters and selection (EXPL-04) -- every param
  // is defensively parsed as untrusted input (T-02-URLI), never thrown. filterState.selectedEntryId
  // replaces the old inline entry-param parsing that lived here before urlParams.ts existed.
  const filterState = filterStateFromParams(searchParams)
  const matched = matchedIds(entries, filterState)
  const selectedEntry =
    filterState.selectedEntryId !== null
      ? (entries.find((entry) => entry.id === filterState.selectedEntryId) ?? null)
      : null
  const isFilteredToZero = !isPending && entries.length > 0 && matched.size === 0

  function handleSelectEntry(id: number) {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // Selection is a meaningful, back-button-undoable action -> default push.
    setSearchParams(paramsFromPatch(searchParams, { selectedEntryId: id }))
  }

  function handleClosePanel() {
    // Deterministic regardless of how the panel was opened (in-app click vs. a shared deep
    // link) -- explicit param removal via replace:true, not a history-back navigation.
    setSearchParams(paramsFromPatch(searchParams, { selectedEntryId: null }), { replace: true })
    triggerRef.current?.focus()
  }

  function handleFilterChange(patch: Partial<FilterState>) {
    // Chip toggles are discrete, meaningful actions -> default push (UI-SPEC History behavior).
    setSearchParams(paramsFromPatch(searchParams, patch))
  }

  function handleClearFilters() {
    setSearchParams(paramsFromPatch(searchParams, { quadrants: [], rings: [], newOnly: false, query: '' }))
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        {isError ? (
          // Single shared ErrorState spans both the radar and list content area — one fetch
          // failure means both surfaces are down together (State Matrix: never duplicated).
          <ErrorState
            heading="Couldn't load the radar"
            body="Something went wrong fetching the latest data. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : (
          <>
            <div className="mb-8">
              <FilterBar
                filterState={filterState}
                resultCount={{ shown: matched.size, total: entries.length }}
                onChange={handleFilterChange}
              />
            </div>
            {/* Radar + docked detail panel. The panel column only exists while an entry is
                selected (unmounted, not a reserved empty gutter) and sits beside the radar at
                lg+ widths, stacking below it on narrower viewports -- full responsive
                breakpoint behavior (mobile sheet, tablet zone) lands in 02-08. */}
            <div className="mb-8 flex flex-col gap-8 lg:flex-row lg:items-start">
              <div className="relative mx-auto w-full max-w-[760px] lg:mx-0 lg:flex-1">
                <RadarChart
                  entries={isPending ? [] : entries}
                  filterState={filterState}
                  selectedEntryId={filterState.selectedEntryId}
                  size={RADAR_SIZE}
                  isLoading={isPending}
                  onBlipSelect={handleSelectEntry}
                />
                {/* Radar keeps every blip rendered, dimmed rather than removed -- this banner is
                    a HomePage-level overlay, not RadarChart-owned state (State Matrix: filtered-
                    to-zero appears "in BOTH surfaces", each with its own copy of the message). */}
                {isFilteredToZero ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="pointer-events-auto w-full max-w-sm">
                      <EmptyState
                        heading={FILTERED_TO_ZERO_HEADING}
                        body={FILTERED_TO_ZERO_BODY}
                        action={{ label: CLEAR_FILTERS_LABEL, onClick: handleClearFilters }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              {selectedEntry ? (
                <div className="w-full lg:w-[380px] lg:shrink-0">
                  <DetailPanel
                    entry={selectedEntry}
                    isOpen
                    onClose={handleClosePanel}
                    presentation="panel"
                  />
                </div>
              ) : null}
            </div>
            <div className="mb-8">
              <Legend />
            </div>
            {isPending ? (
              <EntryListView
                entries={[]}
                filterState={filterState}
                selectedEntryId={filterState.selectedEntryId}
                isLoading
                onEntrySelect={handleSelectEntry}
              />
            ) : entries.length === 0 ? (
              <EmptyState
                heading="No entries yet"
                body="Check back soon — the radar is updated as Code.Hub evaluates new technologies."
              />
            ) : isFilteredToZero ? (
              <EmptyState
                heading={FILTERED_TO_ZERO_HEADING}
                body={FILTERED_TO_ZERO_BODY}
                action={{ label: CLEAR_FILTERS_LABEL, onClick: handleClearFilters }}
              />
            ) : (
              <EntryListView
                entries={entries}
                filterState={filterState}
                selectedEntryId={filterState.selectedEntryId}
                isLoading={false}
                onEntrySelect={handleSelectEntry}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
