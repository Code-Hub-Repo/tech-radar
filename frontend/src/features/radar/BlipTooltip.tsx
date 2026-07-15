// Hover/focus preview: entry name + ring · quadrant + isNew/movement state, positioned by the
// pure clampTooltip edge-clamp. Rendered as a <foreignObject> sibling to Blip's own button --
// the same SVG->HTML re-entry technique 02-04 established for the button -- so its position
// stays pixel-consistent with the radar's viewBox scaling with zero separate screen-pixel math.
import { ringLabel, quadrantLabel, movementLabel } from '../../api/types'
import type { Entry } from '../../api/types'
import { clampTooltip } from '../../lib/tooltipPosition'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

interface BlipTooltipProps {
  entry: Entry
  anchorPosition: { x: number; y: number }
  visible: boolean
  /** RadarChart's own local SVG coordinate bounds (its `size` prop on both axes) -- the
      edge-clamp keeps the tooltip inside this same local space, not the browser viewport. */
  viewport: { w: number; h: number }
}

// Fixed footprint estimate in the radar's own SVG user-units -- generous enough for the longest
// entry name + "Languages & Frameworks" quadrant label + a third isNew/movement line (present on
// only some entries; the extra vertical room is simply unused whitespace on the rest) without
// measuring the DOM.
const TIP_SIZE = { w: 200, h: 80 }

export function BlipTooltip({ entry, anchorPosition, visible, viewport }: BlipTooltipProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { x, y } = clampTooltip(anchorPosition, viewport, TIP_SIZE)
  const transform = prefersReducedMotion ? undefined : `translateY(${visible ? 0 : 4}px)`
  const stateText = entry.isNew ? 'New' : movementLabel[entry.movement]

  return (
    <foreignObject x={x} y={y} width={TIP_SIZE.w} height={TIP_SIZE.h} pointerEvents="none">
      <div
        className={`w-fit max-w-[200px] rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-md transition-opacity duration-150 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform }}
      >
        <p className="truncate font-sans text-[16px] leading-[1.5] text-foreground">{entry.name}</p>
        <p className="whitespace-nowrap font-mono text-[14px] leading-[1.4] text-muted">
          {ringLabel[entry.ring]} · {quadrantLabel[entry.quadrant]}
        </p>
        {stateText ? (
          <p className="whitespace-nowrap font-mono text-[14px] font-semibold leading-[1.4] text-accent">
            {stateText}
          </p>
        ) : null}
      </div>
    </foreignObject>
  )
}
