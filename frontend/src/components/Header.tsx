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
    <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-b from-surface to-background px-6 py-5">
      {/* Thin accent underline — a hairline of brand color across the header base, glowing softly. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(249,115,22,0.55) 20%, rgba(249,115,22,0.55) 80%, transparent)',
          boxShadow: '0 0 8px rgba(249,115,22,0.35)',
        }}
      />
      <div>
        <div className="flex items-baseline gap-3">
          <span
            className="font-mono text-[28px] font-semibold leading-[1.15] text-foreground"
            style={{ textShadow: '0 0 18px rgba(249,115,22,0.25)' }}
          >
            Code<span className="text-accent">.Hub</span>
          </span>
          <span aria-hidden="true" className="font-mono text-[22px] text-border">
            /
          </span>
          <h1 className="font-mono text-[28px] font-semibold leading-[1.15] text-foreground">
            Tech Radar
          </h1>
        </div>
        <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-[1.5] text-muted">
          The technologies Code.Hub builds on — what we{' '}
          <span className="text-accent">adopt</span>, trial, assess, and hold, on one living radar.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <SearchInput value={query} onChange={handleQueryChange} debounceMs={SEARCH_DEBOUNCE_MS} />
      </div>
    </header>
  )
}
