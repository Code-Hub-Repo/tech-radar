// Visually-hidden-until-focus "Skip to list view" link -- the FIRST focusable element on the
// page (rendered before Header in HomePage). Lets keyboard/screen-reader users jump past the
// radar's full blip tab sequence (up to 100 stops, RADR-07) straight to the list view, doubly
// useful on mobile where EXPL-06 makes the list the primary surface. Pairs .sr-only (base
// hidden state, 02-01) with .sr-only-focusable (tokens.css's :focus-visible reveal, 02-08) --
// the existing global :focus-visible accent ring (tokens.css) applies automatically on top,
// no extra ring styling needed here.
export function SkipLink() {
  return (
    <a href="#list-view" className="sr-only sr-only-focusable">
      Skip to list view
    </a>
  )
}
