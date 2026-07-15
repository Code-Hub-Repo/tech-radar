// Generic CSS media-query hook, mirroring usePrefersReducedMotion's matchMedia pattern
// (02-RESEARCH.md Standard Patterns §7 / lib/usePrefersReducedMotion.ts). HomePage uses this
// for the two viewport-width breakpoints that drive JS-level props Tailwind's own breakpoint
// utilities cannot reach directly -- RadarChart's numeric `size` and DetailPanel's
// `presentation` string both have to be picked in JS, not CSS.
import { useEffect, useState } from 'react'

// Not server-rendered in this SPA (Declarative Mode has no SSR step) -- defensive only.
function getInitialMatch(query: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getInitialMatch(query))
  // Detects a genuine `query` argument change between renders and re-syncs during render --
  // the React-recommended "adjust state while rendering" pattern (same fix SearchInput.tsx
  // applied in 02-06 for the same react-hooks/set-state-in-effect rule), avoiding the extra
  // render/commit/effect cycle a synchronous setState-in-effect would cause.
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setMatches(getInitialMatch(query))
  }

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    mediaQueryList.addEventListener('change', listener)
    return () => mediaQueryList.removeEventListener('change', listener)
  }, [query])

  return matches
}
