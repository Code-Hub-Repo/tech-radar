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

// Ring key: color swatch PLUS text label, never color alone (CONTEXT.md "Specific Ideas").
// 4 ring entries now; isNew + Moved-in/Moved-out keys are appended here in 02-07 (7 total).
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
            <span className="font-mono text-[14px] leading-[1.4] text-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
