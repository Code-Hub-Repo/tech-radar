import { useEntries } from '../api/hooks'
import type { FilterState } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Header } from '../components/Header'
import { EntryListView } from '../features/entries/EntryListView'
import { Legend } from '../features/radar/Legend'
import { RadarChart } from '../features/radar/RadarChart'

// Default, no-op filter state — FilterBar (02-06) will replace this with the real
// URL-derived FilterState. Selection wiring arrives in 02-05.
const DEFAULT_FILTER_STATE: FilterState = {
  quadrants: [],
  rings: [],
  newOnly: false,
  query: '',
  selectedEntryId: null,
}

function noop() {}

// Internal SVG coordinate-space size for RadarChart's viewBox; the wrapping div below caps the
// actual rendered width (UI-SPEC's ultrawide radar cap), so this only affects proportions.
const RADAR_SIZE = 640

// The "Skip to list view" link is deferred until a later wave.
export function HomePage() {
  const { data, isPending, isError, refetch } = useEntries()
  const entries = data ?? []

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
            <div className="mx-auto mb-8 max-w-[760px]">
              <RadarChart
                entries={isPending ? [] : entries}
                filterState={DEFAULT_FILTER_STATE}
                selectedEntryId={null}
                size={RADAR_SIZE}
                isLoading={isPending}
                onBlipSelect={noop}
              />
            </div>
            <div className="mb-8">
              <Legend />
            </div>
            {isPending ? (
              <EntryListView
                entries={[]}
                filterState={DEFAULT_FILTER_STATE}
                selectedEntryId={null}
                isLoading
                onEntrySelect={noop}
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
                selectedEntryId={null}
                isLoading={false}
                onEntrySelect={noop}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
