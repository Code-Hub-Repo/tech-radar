import { useEntries } from '../api/hooks'
import type { FilterState } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Header } from '../components/Header'
import { EntryListView } from '../features/entries/EntryListView'

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

// The "Skip to list view" link is deferred until the radar (its Tab-order predecessor) exists
// (Wave 7).
export function HomePage() {
  const { data, isPending, isError, refetch } = useEntries()
  const entries = data ?? []

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        {isPending ? (
          <EntryListView
            entries={[]}
            filterState={DEFAULT_FILTER_STATE}
            selectedEntryId={null}
            isLoading
            onEntrySelect={noop}
          />
        ) : isError ? (
          <ErrorState
            heading="Couldn't load the radar"
            body="Something went wrong fetching the latest data. Check your connection and try again."
            onRetry={() => refetch()}
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
      </main>
    </div>
  )
}
