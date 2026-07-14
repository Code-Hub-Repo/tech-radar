// Single radar blip: a real, keyboard-tabbable <button> (RADR-08) rendering the three-layer
// dim-safe visual (constant-opacity outline + dimmed-aware fill + state-swapped number glyph)
// per the UI-SPEC's WCAG contrast fix. Movement/isNew decorations land in later waves
// (02-06/02-07) -- this is the clean outline+fill+number seam they build on.
//
// Implementation note: a bare <button> nested directly under <svg> is NOT a real
// HTMLButtonElement in this React/DOM runtime -- it is created in the SVG namespace as a
// generic, non-interactive SVGElement (verified directly against this project's own
// react-dom/happy-dom versions), which would silently fail RADR-08's accessibility
// requirement despite looking correct in JSX. <foreignObject> is the spec-defined SVG->HTML
// re-entry point, so the real <button> lives there; the visible outline/fill/number layers
// are separate, aria-hidden, pointer-events-none SVG siblings at the same coordinates -- the
// button alone carries the accessible name.
import type { Entry, Ring } from '../../api/types'
import { ringLabel, quadrantLabel } from '../../api/types'
import type { BlipPosition } from '../../lib/radarGeometry'

interface BlipProps {
  entry: Entry
  position: BlipPosition
  /** Blip number cross-referencing the list row (RADR-06) — from entryOrder.ts's orderedEntries. */
  number: number
  /** Opacity toggle is live now (the WCAG dim fix); filtering never sets this true yet (02-06). */
  isDimmed?: boolean
  /** Accepted but inert until selection is wired (02-05). */
  isSelected?: boolean
  /** Accepted but inert until selection is wired (02-05). */
  isFocused?: boolean
  onSelect: (id: number) => void
  onHoverChange: (isHovering: boolean) => void
}

const RING_STROKE_CLASS: Record<Ring, string> = {
  ADOPT: 'stroke-ring-adopt',
  TRIAL: 'stroke-ring-trial',
  ASSESS: 'stroke-ring-assess',
  HOLD: 'stroke-ring-hold',
}

const RING_FILL_CLASS: Record<Ring, string> = {
  ADOPT: 'fill-ring-adopt',
  TRIAL: 'fill-ring-trial',
  ASSESS: 'fill-ring-assess',
  HOLD: 'fill-ring-hold',
}

const VISIBLE_RADIUS = 9
// 44px effective hit-area diameter (RADR-08 / UI-SPEC Touch Target spec).
const HIT_AREA_RADIUS = 22

export function Blip({
  entry,
  position,
  number,
  isDimmed = false,
  onSelect,
  onHoverChange,
}: BlipProps) {
  return (
    <g transform={`translate(${position.x}, ${position.y})`}>
      {/* Decorative three-layer visual -- hidden from the a11y tree and non-interactive; the
          <button> below carries the sole accessible name and all interaction. */}
      <g aria-hidden="true" pointerEvents="none">
        {/* Layer 1: outline -- opacity always 1.0, never dimmed (WCAG shape-contrast floor). */}
        <circle
          r={VISIBLE_RADIUS}
          fill="none"
          className={RING_STROKE_CLASS[entry.ring]}
          strokeWidth={1.5}
        />
        {/* Layer 2: fill -- opacity 1.0 normal / 0.35 dimmed (EXPL-03's locked value). */}
        <circle r={VISIBLE_RADIUS} className={RING_FILL_CLASS[entry.ring]} opacity={isDimmed ? 0.35 : 1} />
        {/* Layer 3: number glyph -- #1a1a1a on full fill, swaps to foreground when dimmed so it
            stays legible against the near-transparent fill (RADR-06 holds in every filter state). */}
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className={`font-mono text-[11px] font-semibold ${isDimmed ? 'fill-foreground' : 'fill-on-accent'}`}
        >
          {number}
        </text>
        {/* Documents the 44px hit-area footprint below; purely visual, matches the real
            foreignObject button's size exactly. */}
        <circle r={22} fill="transparent" />
      </g>
      <foreignObject
        x={-HIT_AREA_RADIUS}
        y={-HIT_AREA_RADIUS}
        width={HIT_AREA_RADIUS * 2}
        height={HIT_AREA_RADIUS * 2}
      >
        <button
          type="button"
          aria-label={`${entry.name} — ${ringLabel[entry.ring]}, ${quadrantLabel[entry.quadrant]}`}
          onClick={() => onSelect(entry.id)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          className="h-full w-full cursor-pointer rounded-full bg-transparent"
        />
      </foreignObject>
    </g>
  )
}
