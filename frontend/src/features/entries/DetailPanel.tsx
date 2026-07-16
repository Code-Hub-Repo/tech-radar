// Full entry view: name, ring, quadrant, isNew/movement state, description, history timeline,
// and a copy-link action (HIST-01/SHRE-01). Desktop docked panel is NOT focus-trapped -- the
// page stays operable alongside it (UI-SPEC Interaction Specs -> Focus trapping). Mobile/tablet
// 'sheet' IS focus-trapped (Tab/Shift+Tab cycle inside only) with a scrim reusing MASTER.md's
// .modal-overlay (rgba(0,0,0,0.6) + blur(4px), applied here via Tailwind arbitrary values -- no
// new CSS class needed). Both variants move focus to the heading on open and return it to the
// trigger on close (02-05); both apply usePrefersReducedMotion's opacity-only fade end-state on
// open instead of relying solely on tokens.css's global reduced-motion reset (which only speeds
// up whatever transition exists, 0.01ms, but doesn't remove the transform itself -- see BRND-04
// Animation Spec). No dialog dependency (react-aria/radix/vaul) -- hand-rolled trap, per
// UI-SPEC's own "No new dependencies" call.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { Link2, X } from 'lucide-react'
import { useEntryHistory } from '../../api/hooks'
import type { Entry, Ring } from '../../api/types'
import { ringLabel, quadrantLabel, movementLabel } from '../../api/types'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/ToastContext'
import { copyToClipboard } from '../../lib/clipboard'
import { deriveHistoryTimeline } from '../../lib/historyTimeline'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

interface DetailPanelProps {
  entry: Entry | null
  isOpen: boolean
  onClose: () => void
  presentation: 'panel' | 'sheet'
}

const HEADING_ID = 'detail-panel-heading'
// WAI-ARIA APG's typical focusable-descendant selector, scoped to this panel's actual content
// (close + copy-link buttons; stays correct if a future field adds a link/input). Explicitly
// excludes tabindex="-1" so the programmatically-focused heading is never treated as a trap
// boundary (it's deliberately not in the normal tab order).
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const RING_DOT_CLASS: Record<Ring, string> = {
  ADOPT: 'bg-ring-adopt',
  TRIAL: 'bg-ring-trial',
  ASSESS: 'bg-ring-assess',
  HOLD: 'bg-ring-hold',
}

const COPY_LINK_SUCCESS_MESSAGE = 'Link copied'
const COPY_LINK_FALLBACK_MESSAGE = "Couldn't copy the link — copy it from your browser's address bar instead."

export function DetailPanel({ entry, isOpen, onClose, presentation }: DetailPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const toast = useToast()
  // Fetched fresh per selected entry (HIST-01); entryId is null while nothing is open/selected,
  // which keeps the query disabled (api/hooks.ts) rather than firing with a bogus id. Called
  // unconditionally here, before the `!isOpen || !entry` early return below, per Rules of Hooks.
  const historyQuery = useEntryHistory(entry ? entry.id : null)
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
  // preventScroll: true is load-bearing -- without it the browser's default focus() behavior
  // scrolls the newly-focused heading into view, which yanks the whole page to the top when a
  // list row far down the page is clicked (the docked panel already sits in the viewport, and
  // the mobile/tablet sheet is fixed-positioned -- neither needs a scroll to become visible).
  useEffect(() => {
    if (isOpen) {
      headingRef.current?.focus({ preventScroll: true })
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

  const timeline = deriveHistoryTimeline(historyQuery.data ?? [])

  async function handleCopyLink() {
    const succeeded = await copyToClipboard(window.location.href)
    toast.showToast(succeeded ? 'success' : 'error', succeeded ? COPY_LINK_SUCCESS_MESSAGE : COPY_LINK_FALLBACK_MESSAGE)
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
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy link to this entry"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface hover:text-foreground"
          >
            <Link2 size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface hover:text-foreground"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
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
      <section aria-labelledby="detail-history-heading" className="flex flex-col gap-2 border-t border-border pt-4">
        <h3
          id="detail-history-heading"
          className="font-mono text-[13px] font-semibold uppercase tracking-wide text-muted"
        >
          History
        </h3>
        {historyQuery.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton shape="rect" width="100%" height={18} />
            <Skeleton shape="rect" width="70%" height={18} />
          </div>
        ) : historyQuery.isError ? (
          <p className="text-[14px] leading-[1.5] text-muted">Couldn't load history</p>
        ) : timeline.length === 0 ? (
          <p className="text-[14px] leading-[1.5] text-muted">No changes yet</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {timeline.map((row) => (
              <li key={row.id} className="flex items-center gap-2 text-[14px] leading-[1.5] text-foreground">
                {row.kind === 'created' ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${RING_DOT_CLASS[row.ring]}`}
                    />
                    <span>
                      Added to the radar · {HISTORY_DATE_FORMATTER.format(new Date(row.date))} ·{' '}
                      {ringLabel[row.ring]}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${RING_DOT_CLASS[row.toRing]}`}
                    />
                    <span>
                      {ringLabel[row.fromRing]} → {ringLabel[row.toRing]} ·{' '}
                      {HISTORY_DATE_FORMATTER.format(new Date(row.date))}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
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
