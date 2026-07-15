import { Sparkles, Triangle } from 'lucide-react'
import type { Ring } from '../../api/types'

interface RingKey {
  ring: Ring
  label: string
  /** One-line standard tech-radar semantics -- what placement in this ring actually means. */
  meaning: string
  swatchClass: string
}

// Ring key data: swatch class + literal display label + meaning, canonical Adopt->Hold order.
// Literal strings live here (not re-derived from api/types.ts's ringLabel) so this file is the
// self-contained source for its own rendered legend text.
const RING_KEYS: RingKey[] = [
  {
    ring: 'ADOPT',
    label: 'Adopt',
    meaning: 'Proven — use with confidence.',
    swatchClass: 'bg-ring-adopt',
  },
  {
    ring: 'TRIAL',
    label: 'Trial',
    meaning: 'Worth pursuing — use where you can handle some risk.',
    swatchClass: 'bg-ring-trial',
  },
  {
    ring: 'ASSESS',
    label: 'Assess',
    meaning: 'Promising — explore to understand its impact.',
    swatchClass: 'bg-ring-assess',
  },
  {
    ring: 'HOLD',
    label: 'Hold',
    meaning: 'Proceed with caution, or phase out.',
    swatchClass: 'bg-ring-hold',
  },
]

// Small icon + text label shared row styling, reused by the 3 non-ring keys below.
const KEY_ITEM_CLASS = 'flex items-center gap-2'
const KEY_LABEL_CLASS = 'font-mono text-[14px] leading-[1.4] text-foreground'

// Ring key: color swatch + name + one-line meaning (never color alone, CONTEXT.md "Specific
// Ideas") -- this is the second comprehension anchor alongside the radar's own ring labels, for
// anyone who lands on the list view first or wants the semantics spelled out. 4 ring cards in a
// responsive grid, plus the 3 existing state keys (New/Moved in/Moved out) below as a compact
// row -- those stay icon+text only since they need no further explanation (RADR-04, RADR-05).
export function Legend() {
  return (
    <section aria-labelledby="legend-heading" className="flex flex-col gap-4">
      <h2
        id="legend-heading"
        className="font-sans text-[20px] font-semibold leading-[1.2] text-foreground"
      >
        Legend
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RING_KEYS.map(({ ring, label, meaning, swatchClass }) => (
          <li key={ring} className="flex items-start gap-2.5">
            <span aria-hidden="true" className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${swatchClass}`} />
            <span className="flex flex-col gap-0.5">
              <span className="font-mono text-[14px] font-semibold leading-[1.4] text-foreground">
                {label}
              </span>
              <span className="font-sans text-[13px] leading-[1.4] text-muted">{meaning}</span>
            </span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-4 border-t border-border pt-4">
        <li className={KEY_ITEM_CLASS}>
          <Sparkles aria-hidden="true" size={14} className="text-accent" />
          <span className={KEY_LABEL_CLASS}>New</span>
        </li>
        <li className={KEY_ITEM_CLASS}>
          <Triangle aria-hidden="true" size={12} className="text-foreground" />
          <span className={KEY_LABEL_CLASS}>Moved in</span>
        </li>
        <li className={KEY_ITEM_CLASS}>
          <Triangle aria-hidden="true" size={12} className="rotate-180 text-foreground" />
          <span className={KEY_LABEL_CLASS}>Moved out</span>
        </li>
      </ul>
    </section>
  )
}
