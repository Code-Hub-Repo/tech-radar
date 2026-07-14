// prefers-reduced-motion media query hook (02-RESEARCH.md Standard Patterns §7). The global
// tokens.css rule already collapses every transition/animation duration to ~0, which handles
// most cases; components reach for this hook only where a *different static end-state* is
// needed under reduced motion (e.g. BlipTooltip's translateY offset must never be applied at
// all, not just applied near-instantly) -- see UI-SPEC's Accessibility Contract.
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

// Not server-rendered in this SPA (Declarative Mode has no SSR step) -- defensive only.
function getInitialPreference(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia(QUERY).matches
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(getInitialPreference)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY)
    const listener = (event: MediaQueryListEvent) => setPrefersReduced(event.matches)
    mediaQueryList.addEventListener('change', listener)
    return () => mediaQueryList.removeEventListener('change', listener)
  }, [])

  return prefersReduced
}
