import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import type { Entry, Ring } from '../../api/types'
import { ringLabel, movementLabel } from '../../api/types'

interface EntryListRowProps {
  entry: Entry
  /** Blip number cross-referencing the radar (RADR-06) — same value on both surfaces. */
  number: number
  /** Renders the surface-raised bg + 3px left accent border below. Driven by one
      selectedEntryId, shared with the radar's own blip halo (02-05). */
  isSelected?: boolean
  /** Accepted but inert until filtering is wired (02-06). */
  isDimmed?: boolean
  /** Fires on click/Enter/Space (native button activation) with the entry's id. */
  onSelect?: (id: number) => void
}

const RING_BADGE_CLASS: Record<Ring, string> = {
  ADOPT: 'bg-ring-adopt',
  TRIAL: 'bg-ring-trial',
  ASSESS: 'bg-ring-assess',
  HOLD: 'bg-ring-hold',
}

// One entry row: blip number + name + isNew/movement state + ring badge, as a real activatable
// <button> so click and native Enter/Space both call onSelect (RADR-06 cross-reference +
// keyboard parity with the radar's own blip buttons). isDimmed rendering logic arrives with
// real filtering in 02-06.
export function EntryListRow({ entry, number, isSelected = false, onSelect }: EntryListRowProps) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect?.(entry.id)}
        className={`flex w-full cursor-pointer items-center gap-4 border-l-[3px] px-4 py-3 text-left transition-colors duration-200 ${
          isSelected ? 'border-l-accent bg-surface-raised' : 'border-l-transparent bg-transparent'
        }`}
      >
        <span className="w-8 shrink-0 text-right font-mono text-[14px] leading-[1.4] tabular-nums text-muted">
          {number}
        </span>
        <span className="flex-1 font-sans text-[16px] font-semibold leading-[1.5] text-foreground">
          {entry.name}
        </span>
        {entry.isNew ? (
          <span className="flex shrink-0 items-center gap-1 font-mono text-[14px] font-semibold leading-[1.4] text-accent">
            <Sparkles aria-hidden="true" size={14} />
            New
          </span>
        ) : entry.movement !== 'NONE' ? (
          <span className="flex shrink-0 items-center gap-1 font-mono text-[14px] font-semibold leading-[1.4] text-muted">
            {entry.movement === 'IN' ? (
              <TrendingUp aria-hidden="true" size={14} />
            ) : (
              <TrendingDown aria-hidden="true" size={14} />
            )}
            {movementLabel[entry.movement]}
          </span>
        ) : null}
        <span
          className={`rounded-full px-3 py-1 font-mono text-[14px] font-semibold leading-[1.4] text-on-accent ${RING_BADGE_CLASS[entry.ring]}`}
        >
          {ringLabel[entry.ring]}
        </span>
      </button>
    </li>
  )
}
