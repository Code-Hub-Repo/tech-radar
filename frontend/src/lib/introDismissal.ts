// Persists whether the "How to read this" intro has been dismissed, so it auto-shows on a
// visitor's first-ever page load but never nags a returning one. The header's own trigger button
// can still reopen the intro at any time regardless of this flag -- dismissal only ever
// suppresses the automatic first-load display, it never disables the feature.
const INTRO_DISMISSED_KEY = 'techradar.introDismissed'

// Not server-rendered in this SPA (Declarative Mode has no SSR step) -- defensive only, mirrors
// lib/useMediaQuery.ts's own typeof window guard. Wrapped in try/catch because localStorage
// access can throw (private browsing, exhausted quota, disabled storage) -- a visitor in that
// state simply sees the intro every visit instead of the app crashing.
export function isIntroDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem(INTRO_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setIntroDismissed(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(INTRO_DISMISSED_KEY, 'true')
  } catch {
    // Storage unavailable -- dismissal simply won't persist across reloads.
  }
}
