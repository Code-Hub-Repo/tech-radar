// Quadrant/ring/New-only filter chips (EXPL-01) + a permanently-mounted aria-live result-count
// region (RESEARCH Pitfall #4 -- toggle only text/visibility, never unmount, so the first
// filter change after page load is announced the same as every subsequent one). Chip toggles
// patch a single FilterState field per click -- synchronous, no debounce (a discrete action,
// unlike SearchInput's continuous-typing debounce).
import { Sparkles } from 'lucide-react'
import type { FilterState, Quadrant, Ring } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import { Chip } from '../../components/Chip'
import { QUADRANT_ORDER, RING_ORDER } from '../../lib/entryOrder'

interface FilterBarProps {
  filterState: FilterState
  resultCount: { shown: number; total: number }
  onChange: (patch: Partial<FilterState>) => void
}

const RING_CHIP_COLOR_CLASS: Record<Ring, string> = {
  ADOPT: 'bg-ring-adopt',
  TRIAL: 'bg-ring-trial',
  ASSESS: 'bg-ring-assess',
  HOLD: 'bg-ring-hold',
}

// Active quadrant chips and the active New-only chip both use the brand accent (no per-quadrant
// color system exists -- quadrants are positional, not color-coded; only rings carry semantic
// color per MASTER.md).
const ACCENT_CHIP_COLOR_CLASS = 'bg-accent'

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function FilterBar({ filterState, resultCount, onChange }: FilterBarProps) {
  const hasActiveFilter =
    filterState.quadrants.length > 0 ||
    filterState.rings.length > 0 ||
    filterState.newOnly ||
    filterState.query !== ''

  function toggleQuadrant(quadrant: Quadrant) {
    onChange({ quadrants: toggleInList(filterState.quadrants, quadrant) })
  }

  function toggleRing(ring: Ring) {
    onChange({ rings: toggleInList(filterState.rings, ring) })
  }

  function toggleNewOnly() {
    onChange({ newOnly: !filterState.newOnly })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {QUADRANT_ORDER.map((quadrant) => (
          <Chip
            key={quadrant}
            label={quadrantLabel[quadrant]}
            active={filterState.quadrants.includes(quadrant)}
            colorToken={ACCENT_CHIP_COLOR_CLASS}
            onClick={() => toggleQuadrant(quadrant)}
          />
        ))}
        {RING_ORDER.map((ring) => (
          <Chip
            key={ring}
            label={ringLabel[ring]}
            active={filterState.rings.includes(ring)}
            colorToken={RING_CHIP_COLOR_CLASS[ring]}
            onClick={() => toggleRing(ring)}
          />
        ))}
        <Chip
          label="New only"
          active={filterState.newOnly}
          colorToken={ACCENT_CHIP_COLOR_CLASS}
          icon={Sparkles}
          onClick={toggleNewOnly}
        />
      </div>
      <p
        aria-live="polite"
        aria-atomic="true"
        className={hasActiveFilter ? 'font-mono text-[14px] leading-[1.4] text-muted' : 'sr-only'}
      >
        {hasActiveFilter ? `${resultCount.shown} of ${resultCount.total} entries` : ''}
      </p>
    </div>
  )
}
