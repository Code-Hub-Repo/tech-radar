import { Sparkles, Triangle } from 'lucide-react'
import type { Ring } from '../../api/types'

interface RingKey {
  ring: Ring
  label: string
  swatchClass: string
}

// Ring key data: swatch class + literal display label, canonical Adopt->Hold order. Literal
// strings live here (not re-derived from api/types.ts's ringLabel) so this file is the
// self-contained source for its own rendered legend text.
const RING_KEYS: RingKey[] = [
  { ring: 'ADOPT', label: 'Adopt', swatchClass: 'bg-ring-adopt' },
  { ring: 'TRIAL', label: 'Trial', swatchClass: 'bg-ring-trial' },
  { ring: 'ASSESS', label: 'Assess', swatchClass: 'bg-ring-assess' },
  { ring: 'HOLD', label: 'Hold', swatchClass: 'bg-ring-hold' },
]

// Small icon + text label shared row styling, reused by the 3 non-ring keys below.
const KEY_ITEM_CLASS = 'flex items-center gap-2'
const KEY_LABEL_CLASS = 'font-mono text-[14px] leading-[1.4] text-foreground'

// Ring key: color swatch PLUS text label, never color alone (CONTEXT.md "Specific Ideas"). 7
// keys total: 4 ring swatches + New (Sparkles) + Moved in / Moved out (in/out-pointing
// triangles, matching the radar blip's own notch shape family) + text (RADR-04, RADR-05).
export function Legend() {
  return (
    <section aria-labelledby="legend-heading" className="flex flex-col gap-3">
      <h2
        id="legend-heading"
        className="font-sans text-[20px] font-semibold leading-[1.2] text-foreground"
      >
        Legend
      </h2>
      <ul className="flex flex-wrap gap-4">
        {RING_KEYS.map(({ ring, label, swatchClass }) => (
          <li key={ring} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-3 w-3 rounded-full ${swatchClass}`} />
            <span className={KEY_LABEL_CLASS}>{label}</span>
          </li>
        ))}
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
