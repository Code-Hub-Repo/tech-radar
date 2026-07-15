// Single radar blip: a real, keyboard-tabbable <button> (RADR-08) rendering the three-layer
// dim-safe visual (constant-opacity outline + dimmed-aware fill + state-swapped number glyph)
// per the UI-SPEC's WCAG contrast fix, plus the isNew accent glow/pulse and the directional
// movement notch (RADR-04, RADR-05). isNew and movement are mutually exclusive by the frozen
// API contract (server-side MovementCalculator short-circuits isNew -> movement NONE), so each
// renders independently below with a plain else-if -- no defensive branch resolves a conflict
// that cannot occur.
//
// Implementation note: a bare <button> nested directly under <svg> is NOT a real
// HTMLButtonElement in this React/DOM runtime -- it is created in the SVG namespace as a
// generic, non-interactive SVGElement (verified directly against this project's own
// react-dom/happy-dom versions), which would silently fail RADR-08's accessibility
// requirement despite looking correct in JSX. <foreignObject> is the spec-defined SVG->HTML
// re-entry point, so the real <button> lives there; the visible outline/fill/number layers
// are separate, aria-hidden, pointer-events-none SVG siblings at the same coordinates -- the
// button alone carries the accessible name.
import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { Entry, Ring } from '../../api/types'
import { ringLabel, quadrantLabel } from '../../api/types'
import type { BlipPosition } from '../../lib/radarGeometry'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

interface BlipProps {
  entry: Entry
  position: BlipPosition
  /** Blip number cross-referencing the list row (RADR-06) — from entryOrder.ts's orderedEntries. */
  number: number
  /** Driven by RadarChart's matchedIds(entries, filterState) computation (EXPL-03) — true for
      any entry not in the current filter/search match set. */
  isDimmed?: boolean
  /** Renders the permanent accent-stroke halo below — distinct from the transient global
      :focus-visible outline on the button itself. Driven by one selectedEntryId (02-05). */
  isSelected?: boolean
  /** Accepted but inert — no roving-focus visual is needed (native tab order, see Blip.tsx's
      own button; RADR-02's read_first). */
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
// Show-tooltip intent delay (UI-SPEC Interaction Specs -> Blip hover/focus/click). Hiding has
// no delay -- mouseleave/blur cancels any pending show and calls onHoverChange(false) at once.
const HOVER_INTENT_DELAY_MS = 150

// Movement notch geometry (RADR-05): a small triangle straddling the blip's own VISIBLE_RADIUS
// edge. OUT's apex sits at the outer radius (points away from center); IN's apex sits at the
// inner radius (points toward center) -- same footprint, flipped orientation. Both variants are
// defined pointing "up" (toward angle 0) and rotated into place via the <g transform="rotate">
// wrapper at render time, matching position.angle's own 0=12-o'clock/clockwise convention.
const NOTCH_INNER_RADIUS = VISIBLE_RADIUS
const NOTCH_OUTER_RADIUS = VISIBLE_RADIUS + 8
const NOTCH_HALF_WIDTH = 4
const NOTCH_POINTS_OUT = `0,-${NOTCH_OUTER_RADIUS} -${NOTCH_HALF_WIDTH},-${NOTCH_INNER_RADIUS} ${NOTCH_HALF_WIDTH},-${NOTCH_INNER_RADIUS}`
const NOTCH_POINTS_IN = `0,-${NOTCH_INNER_RADIUS} -${NOTCH_HALF_WIDTH},-${NOTCH_OUTER_RADIUS} ${NOTCH_HALF_WIDTH},-${NOTCH_OUTER_RADIUS}`

export function Blip({
  entry,
  position,
  number,
  isDimmed = false,
  isSelected = false,
  onSelect,
  onHoverChange,
}: BlipProps) {
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const prefersReducedMotion = usePrefersReducedMotion()

  function scheduleHoverShow() {
    hoverTimeoutRef.current = setTimeout(() => {
      onHoverChange(true)
    }, HOVER_INTENT_DELAY_MS)
  }

  function cancelHoverShow() {
    if (hoverTimeoutRef.current !== undefined) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = undefined
    }
    onHoverChange(false)
  }

  // Native <button> Enter/Space activation already dispatches a click on its own default
  // action -- preventDefault here takes over that default action so onSelect fires exactly
  // once per key press instead of once from this handler and again from the resulting click.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(entry.id)
    }
  }

  // Rotated along the blip's own center-to-position angle (radarGeometry's polar-phase angle,
  // same 0=12-o'clock/clockwise convention SVG's native rotate() uses) so the notch always sits
  // on the radially outward side of the dot, pointing toward or away from the radar's center.
  const angleDeg = (position.angle * 180) / Math.PI

  // isNew and movement are mutually exclusive by contract (see file header) -- render whichever
  // one this entry actually carries, never both.
  let indicator: ReactNode = null
  if (entry.isNew) {
    indicator = prefersReducedMotion ? null : (
      <circle
        r={VISIBLE_RADIUS}
        fill="none"
        className="stroke-accent animate-blip-pulse"
        strokeWidth={1.5}
      />
    )
  } else if (entry.movement !== 'NONE') {
    indicator = (
      <g transform={`rotate(${angleDeg})`}>
        <polygon
          points={entry.movement === 'IN' ? NOTCH_POINTS_IN : NOTCH_POINTS_OUT}
          className={RING_FILL_CLASS[entry.ring]}
        />
      </g>
    )
  }

  // Lowercase state suffix appended to the accessible name -- literal strings (not
  // movementLabel, which is capitalized for the visible-text surfaces elsewhere in this phase)
  // per the UI-SPEC aria-label example ("Kotlin -- Adopt, Languages & Frameworks, new").
  let stateSuffix = ''
  if (entry.isNew) {
    stateSuffix = ', new'
  } else if (entry.movement === 'IN') {
    stateSuffix = ', moved in'
  } else if (entry.movement === 'OUT') {
    stateSuffix = ', moved out'
  }

  return (
    <g transform={`translate(${position.x}, ${position.y})`}>
      {/* Decorative three-layer visual -- hidden from the a11y tree and non-interactive; the
          <button> below carries the sole accessible name and all interaction. */}
      <g aria-hidden="true" pointerEvents="none">
        {/* Selected-state halo -- a permanent accent stroke ring, distinct from the transient
            global :focus-visible outline the button itself picks up on keyboard focus. */}
        {isSelected ? (
          <circle r={VISIBLE_RADIUS + 5} fill="none" className="stroke-accent" strokeWidth={2} />
        ) : null}
        {/* Layers 1-3 (outline/fill/number) share one wrapper so the isNew static glow -- a
            filter, not an animation/transition, so tokens.css's global reduced-motion reset does
            NOT suppress it -- applies to the whole visible dot at once. Gated on entry.isNew
            alone, independent of prefersReducedMotion (RADR-04: the glow always stays; only the
            pulse below is removed). */}
        <g style={entry.isNew ? { filter: 'drop-shadow(var(--glow-accent))' } : undefined}>
          {/* Layer 1: outline -- opacity always 1.0, never dimmed (WCAG shape-contrast floor). */}
          <circle
            r={VISIBLE_RADIUS}
            fill="none"
            className={RING_STROKE_CLASS[entry.ring]}
            strokeWidth={1.5}
          />
          {/* Layer 2: fill -- opacity 1.0 normal / 0.35 dimmed (EXPL-03's locked value), animated
              200ms ease per the Animation Spec ("Blip dim (filter match/non-match)"). */}
          <circle
            r={VISIBLE_RADIUS}
            className={`${RING_FILL_CLASS[entry.ring]} transition-opacity duration-200`}
            opacity={isDimmed ? 0.35 : 1}
          />
          {/* Layer 3: number glyph -- #1a1a1a on full fill, swaps to foreground when dimmed so it
              stays legible against the near-transparent fill (RADR-06 holds in every filter state). */}
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className={`font-mono text-[11px] font-semibold ${isDimmed ? 'fill-foreground' : 'fill-on-accent'}`}
          >
            {number}
          </text>
        </g>
        {/* isNew pulse ring OR movement notch -- never both, see `indicator` above. */}
        {indicator}
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
          aria-label={`${entry.name} — ${ringLabel[entry.ring]}, ${quadrantLabel[entry.quadrant]}${stateSuffix}`}
          onClick={() => onSelect(entry.id)}
          onKeyDown={handleKeyDown}
          onFocus={scheduleHoverShow}
          onBlur={cancelHoverShow}
          onMouseEnter={scheduleHoverShow}
          onMouseLeave={cancelHoverShow}
          className="h-full w-full cursor-pointer rounded-full bg-transparent"
        />
      </foreignObject>
    </g>
  )
}
