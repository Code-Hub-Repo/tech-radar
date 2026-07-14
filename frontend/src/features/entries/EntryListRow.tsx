import type { Entry, Ring } from '../../api/types'
import { ringLabel } from '../../api/types'

interface EntryListRowProps {
  entry: Entry
  /** Blip number cross-referencing the radar (RADR-06) — same value on both surfaces. */
  number: number
  /** Accepted but inert until selection is wired (02-05). */
  isSelected?: boolean
  /** Accepted but inert until filtering is wired (02-06). */
  isDimmed?: boolean
  /** Accepted but inert until selection is wired (02-05). */
  onSelect?: (id: number) => void
}

const RING_BADGE_CLASS: Record<Ring, string> = {
  ADOPT: 'bg-ring-adopt',
  TRIAL: 'bg-ring-trial',
  ASSESS: 'bg-ring-assess',
  HOLD: 'bg-ring-hold',
}

// One entry row: blip number + name + ring badge. A plain semantic list item for this wave —
// click/selection wiring (which turns this into a real interactive button) arrives in 02-05.
// Movement/isNew text is added in 02-07.
export function EntryListRow({ entry, number }: EntryListRowProps) {
  return (
    <li className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <span className="w-8 shrink-0 text-right font-mono text-[14px] leading-[1.4] tabular-nums text-muted">
        {number}
      </span>
      <span className="flex-1 font-sans text-[16px] font-semibold leading-[1.5] text-foreground">
        {entry.name}
      </span>
      <span
        className={`rounded-full px-3 py-1 font-mono text-[14px] font-semibold leading-[1.4] text-on-accent ${RING_BADGE_CLASS[entry.ring]}`}
      >
        {ringLabel[entry.ring]}
      </span>
    </li>
  )
}
