// Composes the reserved right-slot SearchInput (EXPL-02) directly against the URL's own `q`
// param via useSearchParams -- no props needed (UI-SPEC Component Inventory: "(none -- composes
// SearchInput internally)"). HomePage independently reads the same URL for the rest of
// FilterState; Header and HomePage share the URL as their one source of truth instead of
// passing search state through props.
import { useSearchParams } from 'react-router'
import { SearchInput } from '../features/entries/SearchInput'
import { filterStateFromParams, paramsFromPatch } from '../lib/urlParams'

const SEARCH_DEBOUNCE_MS = 250

export function Header() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = filterStateFromParams(searchParams).query

  function handleQueryChange(value: string) {
    // Typing must never spam browser history (UI-SPEC History behavior -- search = replace).
    setSearchParams(paramsFromPatch(searchParams, { query: value }), { replace: true })
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[28px] font-semibold leading-[1.2] text-foreground">
          Code<span className="text-accent">.Hub</span>
        </span>
        <h1 className="font-mono text-[28px] font-semibold leading-[1.2] text-foreground">
          Tech Radar
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <SearchInput value={query} onChange={handleQueryChange} debounceMs={SEARCH_DEBOUNCE_MS} />
      </div>
    </header>
  )
}
