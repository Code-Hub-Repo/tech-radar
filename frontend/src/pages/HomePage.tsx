import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useEntries } from '../api/hooks'
import type { FilterState } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Header } from '../components/Header'
import { DetailPanel } from '../features/entries/DetailPanel'
import { EntryListView } from '../features/entries/EntryListView'
import { Legend } from '../features/radar/Legend'
import { RadarChart } from '../features/radar/RadarChart'

// Default, no-op filter state — FilterBar (02-06) will replace this with the real
// URL-derived FilterState.
const DEFAULT_FILTER_STATE: FilterState = {
  quadrants: [],
  rings: [],
  newOnly: false,
  query: '',
  selectedEntryId: null,
}

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

  // T-02-URL mitigation: entry parsed with Number.isInteger; non-numeric/unknown value is
  // treated as no selection, never thrown into a raw entries.find() lookup.
  const rawEntryParam = searchParams.get('entry')
  const parsedEntryId = rawEntryParam !== null ? Number(rawEntryParam) : Number.NaN
  const selectedEntryId = Number.isInteger(parsedEntryId) ? parsedEntryId : null
  const selectedEntry =
    selectedEntryId !== null ? (entries.find((entry) => entry.id === selectedEntryId) ?? null) : null

  function handleSelectEntry(id: number) {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // Selection is a meaningful, back-button-undoable action -> default push.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('entry', String(id))
      return next
    })
  }

  function handleClosePanel() {
    // Deterministic regardless of how the panel was opened (in-app click vs. a shared deep
    // link) -- explicit param removal via replace:true, not a history-back navigation.
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('entry')
        return next
      },
      { replace: true },
    )
    triggerRef.current?.focus()
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
            {/* Radar + docked detail panel. The panel column only exists while an entry is
                selected (unmounted, not a reserved empty gutter) and sits beside the radar at
                lg+ widths, stacking below it on narrower viewports -- full responsive
                breakpoint behavior (mobile sheet, tablet zone) lands in 02-08. */}
            <div className="mb-8 flex flex-col gap-8 lg:flex-row lg:items-start">
              <div className="mx-auto w-full max-w-[760px] lg:mx-0 lg:flex-1">
                <RadarChart
                  entries={isPending ? [] : entries}
                  filterState={DEFAULT_FILTER_STATE}
                  selectedEntryId={selectedEntryId}
                  size={RADAR_SIZE}
                  isLoading={isPending}
                  onBlipSelect={handleSelectEntry}
                />
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
                filterState={DEFAULT_FILTER_STATE}
                selectedEntryId={selectedEntryId}
                isLoading
                onEntrySelect={handleSelectEntry}
              />
            ) : entries.length === 0 ? (
              <EmptyState
                heading="No entries yet"
                body="Check back soon — the radar is updated as Code.Hub evaluates new technologies."
              />
            ) : (
              <EntryListView
                entries={entries}
                filterState={DEFAULT_FILTER_STATE}
                selectedEntryId={selectedEntryId}
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
