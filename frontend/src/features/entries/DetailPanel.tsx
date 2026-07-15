// Full entry view: name, ring, quadrant, isNew/movement state, description. Desktop docked
// panel is NOT focus-trapped -- the page stays operable alongside it (UI-SPEC Interaction Specs
// -> Focus trapping). Mobile/tablet 'sheet' IS focus-trapped (Tab/Shift+Tab cycle inside only)
// with a scrim reusing MASTER.md's .modal-overlay (rgba(0,0,0,0.6) + blur(4px), applied here
// via Tailwind arbitrary values -- no new CSS class needed). Both variants move focus to the
// heading on open and return it to the trigger on close (02-05); both apply
// usePrefersReducedMotion's opacity-only fade end-state on open instead of relying solely on
// tokens.css's global reduced-motion reset (which only speeds up whatever transition exists,
// 0.01ms, but doesn't remove the transform itself -- see BRND-04 Animation Spec). No dialog
// dependency (react-aria/radix/vaul) -- hand-rolled trap, per UI-SPEC's own "No new
// dependencies" call.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import type { Entry } from '../../api/types'
import { ringLabel, quadrantLabel, movementLabel } from '../../api/types'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

interface DetailPanelProps {
  entry: Entry | null
  isOpen: boolean
  onClose: () => void
  presentation: 'panel' | 'sheet'
}

const HEADING_ID = 'detail-panel-heading'
// WAI-ARIA APG's typical focusable-descendant selector, scoped to this panel's actual content
// (one close button today; stays correct if a future field adds a link/input). Explicitly
// excludes tabindex="-1" so the programmatically-focused heading is never treated as a trap
// boundary (it's deliberately not in the normal tab order).
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function DetailPanel({ entry, isOpen, onClose, presentation }: DetailPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const isSheet = presentation === 'sheet'
  // Mount/re-select-triggered enter transition: false on first paint, flipped true one frame
  // later so the browser has two distinct paints to transition between (a hard mount alone
  // gives no prior state for a CSS transition to animate from). openKey changing (a fresh mount
  // OR a different entry selected while already open) resets isEntered synchronously during
  // render -- the React-recommended "adjust state while rendering" pattern (same fix
  // SearchInput.tsx and useMediaQuery.ts already applied for the identical
  // react-hooks/set-state-in-effect rule), so the effect below only ever calls setState from
  // inside the rAF callback, never synchronously in the effect body itself.
  const openKey = isOpen ? (entry?.id ?? -1) : null
  const [isEntered, setIsEntered] = useState(false)
  const [prevOpenKey, setPrevOpenKey] = useState<number | null>(null)
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    setIsEntered(false)
  }

  // Open -> move focus to the heading (tabIndex=-1, programmatic, not in normal tab order).
  // Re-fires if the selected entry changes while already open (e.g. a different blip is
  // activated without closing first), so a screen-reader user is told content changed.
  useEffect(() => {
    if (isOpen) {
      headingRef.current?.focus()
    }
  }, [isOpen, entry?.id])

  useEffect(() => {
    if (openKey === null) {
      return
    }
    const raf = requestAnimationFrame(() => setIsEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [openKey])

  if (!isOpen || !entry) {
    return null
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    // Focus trap (sheet only, UI-SPEC Interaction Specs -> Focus trapping): the docked panel
    // stays untrapped so the page remains operable alongside it.
    if (isSheet && event.key === 'Tab') {
      const container = containerRef.current
      if (!container) {
        return
      }
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  // Enter-transition values (see the mount-triggered effect above). Panel slides in via
  // translateX, sheet via translateY -- both reduce to an opacity-only fade under reduced
  // motion (no translate class at all), per BRND-04's Animation Spec DetailPanel row. The exact
  // transition-property list is set via inline style (not a Tailwind `transition-*` utility) so
  // it unambiguously covers the modern standalone `translate` CSS property Tailwind's
  // translate-x/y utilities compile to, not just the legacy `transform` shorthand.
  const transitionStyle: CSSProperties = prefersReducedMotion
    ? { transitionProperty: 'opacity', transitionDuration: '100ms', transitionTimingFunction: 'linear' }
    : { transitionProperty: 'opacity, translate', transitionDuration: '250ms', transitionTimingFunction: 'ease-out' }
  const transitionValueClass = prefersReducedMotion
    ? isEntered
      ? 'opacity-100'
      : 'opacity-0'
    : isSheet
      ? isEntered
        ? 'translate-y-0 opacity-100'
        : 'translate-y-full opacity-0'
      : isEntered
        ? 'translate-x-0 opacity-100'
        : 'translate-x-full opacity-0'

  const panelContent = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal={isSheet}
      aria-labelledby={HEADING_ID}
      onKeyDown={handleKeyDown}
      style={transitionStyle}
      className={
        isSheet
          ? `fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col gap-4 overflow-y-auto rounded-t-xl border-t border-border bg-surface-raised p-6 shadow-lg ${transitionValueClass}`
          : `flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-6 shadow-lg ${transitionValueClass}`
      }
    >
      <div className="flex items-start justify-between gap-4">
        <h2
          id={HEADING_ID}
          ref={headingRef}
          tabIndex={-1}
          className="text-[20px] font-semibold leading-[1.2] text-foreground"
        >
          {entry.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface hover:text-foreground"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[14px] leading-[1.4] text-muted">
        <span>{ringLabel[entry.ring]}</span>
        <span aria-hidden="true">·</span>
        <span>{quadrantLabel[entry.quadrant]}</span>
        {entry.isNew || entry.movement !== 'NONE' ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-accent">
              {entry.isNew ? 'New' : movementLabel[entry.movement]}
            </span>
          </>
        ) : null}
      </div>
      <p className="text-[16px] leading-[1.5] text-foreground">{entry.description}</p>
    </div>
  )

  if (!isSheet) {
    return panelContent
  }

  return (
    <>
      {/* Scrim -- reuses MASTER.md's .modal-overlay values (rgba(0,0,0,0.6) + blur(4px)) via
          Tailwind arbitrary values rather than a new CSS class; tap closes the sheet. Purely
          decorative (aria-hidden) -- Escape and the explicit close button are the keyboard path. */}
      <div
        aria-hidden="true"
        data-testid="detail-panel-scrim"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] transition-opacity ${
          prefersReducedMotion ? 'duration-100' : 'duration-250'
        } ${isEntered ? 'opacity-100' : 'opacity-0'}`}
      />
      {panelContent}
    </>
  )
}
