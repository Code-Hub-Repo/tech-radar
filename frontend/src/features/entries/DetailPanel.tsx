// Full entry view: name, ring, quadrant, isNew/movement state, description. Desktop docked
// panel (this wave) is NOT focus-trapped -- the page stays operable alongside it (UI-SPEC
// Interaction Specs -> Focus trapping). 'sheet' (mobile bottom sheet + trap) is stubbed to
// render identically to 'panel' for now; 02-08 adds the real focus trap + slide-up sheet
// treatment.
import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import type { Entry } from '../../api/types'
import { ringLabel, quadrantLabel, movementLabel } from '../../api/types'

interface DetailPanelProps {
  entry: Entry | null
  isOpen: boolean
  onClose: () => void
  presentation: 'panel' | 'sheet'
}

const HEADING_ID = 'detail-panel-heading'

export function DetailPanel({ entry, isOpen, onClose, presentation }: DetailPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Open -> move focus to the heading (tabIndex=-1, programmatic, not in normal tab order).
  // Re-fires if the selected entry changes while already open (e.g. a different blip is
  // activated without closing first), so a screen-reader user is told content changed.
  useEffect(() => {
    if (isOpen) {
      headingRef.current?.focus()
    }
  }, [isOpen, entry?.id])

  if (!isOpen || !entry) {
    return null
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal={presentation === 'sheet'}
      aria-labelledby={HEADING_ID}
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-6 shadow-lg"
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
}
