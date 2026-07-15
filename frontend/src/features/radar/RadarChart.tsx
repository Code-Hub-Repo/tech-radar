// SVG chrome (ring guide bands, quadrant sector dividers, quadrant labels), a data-independent
// loading skeleton layer, and a positioned <Blip> per entry. D3 supplies the ring/quadrant/
// layout geometry math only (lib/radarGeometry.ts); every element below is a React-owned SVG
// node -- no DOM-mutating D3 submodule is ever imported here.
import { useMemo, useState } from 'react'
import type { Entry, FilterState } from '../../api/types'
import { quadrantLabel } from '../../api/types'
import { orderedEntries } from '../../lib/entryOrder'
import { matchedIds } from '../../lib/filtering'
import {
  QUADRANT_ORDER,
  RING_ORDER,
  ringRadii,
  quadrantSectorPath,
  computeBlipLayout,
} from '../../lib/radarGeometry'
import { Blip } from './Blip'
import { BlipTooltip } from './BlipTooltip'

interface RadarChartProps {
  entries: Entry[]
  filterState: FilterState
  selectedEntryId: number | null
  size: number
  isLoading: boolean
  onBlipSelect: (id: number) => void
}

// Distance beyond the outermost ring where quadrant labels are anchored -- lands in the
// diagonal corner gap a circle inscribed in a square viewBox naturally leaves.
const LABEL_RADIUS_OFFSET = 16

// Below this `size`, a multi-word quadrant label is wrapped onto two lines instead of one (see
// wrapLabelLines below) -- at the compact 260 mobile size, "Languages & Frameworks" rendered as
// a single line extends past the SVG's own painted bounds (confirmed via headless-Chrome
// getBoundingClientRect measurement: right edge landed ~8px past the 375px viewport), which
// `overflow: visible` (below) lets escape the SVG box uncontained (BRND-02 gap-closure fix).
// 300 sits well above COMPACT_RADAR_SIZE (260, HomePage.tsx) and well below RADAR_SIZE (640), so
// the 768/1024/1440 single-line rendering is untouched -- this only ever engages at the one
// compact size that showed the defect.
const COMPACT_LABEL_WRAP_THRESHOLD = 300

// Vertical gap between wrapped label lines -- the UI-SPEC Label role's own line-height (14px
// font-size * 1.4), applied only when wrapLabelLines() below returns two lines.
const LABEL_LINE_HEIGHT = 14 * 1.4

// Ring-name labels (ADOPT/TRIAL/ASSESS/HOLD) sit along the top (12 o'clock) axis, one per ring
// band, right at that band's own outer boundary -- the single biggest comprehension aid for a
// first-time visitor, since nothing else on the radar names which ring is which. Nudged inward
// from the exact boundary radius so the outermost (Hold) label clears the SVG's own r=outerRadius
// edge instead of straddling it.
const RING_LABEL_INSET = 6

// Per-ring "lit sphere" gradient stops (light top-center highlight -> ring color edge), rendered
// as <radialGradient> defs below and consumed by Blip.tsx via url(#blipGrad-<RING>). The `base`
// values mirror tokens.css's --color-ring-* exactly; `light` is a lifted tint of each for the
// highlight. Kept here (not in Blip) because the gradient defs must live in this SVG document.
const BLIP_GRADIENTS = [
  { ring: 'ADOPT', light: '#fdba74', base: '#f97316' },
  { ring: 'TRIAL', light: '#7dd3fc', base: '#38bdf8' },
  { ring: 'ASSESS', light: '#c4b5fd', base: '#a78bfa' },
  { ring: 'HOLD', light: '#d1d5db', base: '#9ca3af' },
] as const

// Per-blip entrance stagger step — DOM-index * this many ms sets each blip's animation-delay so
// they sweep in rather than popping at once. Suppressed by the global reduced-motion reset.
const BLIP_ENTER_STAGGER_MS = 28

// Generic, data-independent (quadrant, ring) placeholder cells for the loading skeleton --
// spans all 4 quadrants and all 4 ring bands, deliberately not derived from any real entry.
const SKELETON_PLACEHOLDERS: { quadrantIndex: number; ringIndex: number }[] = [
  { quadrantIndex: 0, ringIndex: 0 },
  { quadrantIndex: 1, ringIndex: 1 },
  { quadrantIndex: 2, ringIndex: 2 },
  { quadrantIndex: 3, ringIndex: 3 },
  { quadrantIndex: 0, ringIndex: 2 },
  { quadrantIndex: 1, ringIndex: 3 },
  { quadrantIndex: 2, ringIndex: 0 },
  { quadrantIndex: 3, ringIndex: 1 },
]

// d3.arc()'s angle convention (0 = 12 o'clock/-y, positive = clockwise) applied to a plain
// point instead of a wedge path -- used for quadrant label placement.
function polarToCartesian(center: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: center + radius * Math.sin(angle),
    y: center - radius * Math.cos(angle),
  }
}

// Splits a label into up to two lines by word count, choosing whichever word boundary minimizes
// the longer of the two resulting lines (a balanced wrap, e.g. "Languages &" / "Frameworks"
// rather than a lopsided "Languages" / "& Frameworks"). Single-word labels (Tools, Platforms,
// Techniques) pass through unchanged as one line -- this only ever affects a label that actually
// contains more than one word.
function wrapLabelLines(label: string): string[] {
  const words = label.split(' ')
  if (words.length <= 1) {
    return [label]
  }
  let bestSplit = 1
  let bestMax = Infinity
  for (let split = 1; split < words.length; split++) {
    const line1 = words.slice(0, split).join(' ')
    const line2 = words.slice(split).join(' ')
    const longest = Math.max(line1.length, line2.length)
    if (longest < bestMax) {
      bestMax = longest
      bestSplit = split
    }
  }
  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')]
}

// Renders the radar's static chrome, a positioned+numbered+ring-colored <Blip> per entry (in
// quadrant->ring->alphabetical DOM order, mirroring the list's tab order), a single BlipTooltip
// for whichever entry is currently hovered/focused, and -- while isLoading -- skeleton
// placeholders instead of real blips. filterState drives each blip's isDimmed (EXPL-03) via
// matchedIds; entries are always all rendered, never removed (spatial stability).
export function RadarChart({
  entries,
  filterState,
  selectedEntryId,
  size,
  isLoading,
  onBlipSelect,
}: RadarChartProps) {
  const outerRadius = size / 2
  const bands = ringRadii(outerRadius)
  const [hoveredEntryId, setHoveredEntryId] = useState<number | null>(null)

  // Layout is memoized on (entries, size) only -- never re-runs on hover/select/filter
  // (02-RESEARCH.md performance note). Numbering is a cheap sort, kept separate from the
  // expensive d3-force relaxation so an unrelated re-render never re-triggers the 300-tick
  // simulation. matchedIds is a cheap O(entries) scan (<=100 blips) -- not worth memoizing
  // separately since filterState is a fresh object every HomePage render anyway.
  const positions = useMemo(() => computeBlipLayout(entries, size), [entries, size])
  const numbers = orderedEntries(entries)
  const matched = matchedIds(entries, filterState)
  const positionById = new Map(positions.map((position) => [position.id, position]))
  const hoveredEntry = entries.find((entry) => entry.id === hoveredEntryId)
  const hoveredPosition = hoveredEntryId !== null ? positionById.get(hoveredEntryId) : undefined

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
      className="h-auto w-full"
    >
      <defs>
        {/* Disc base — a soft dark radial so the radar reads as a lit surface, not flat #1a1a1a. */}
        <radialGradient id="radar-backdrop" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor="#242424" />
          <stop offset="62%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#161616" />
        </radialGradient>
        {/* Warm "Adopt core" — a subtle accent-tinted glow filling the innermost (Adopt) ring, so
            the center of the radar — where the tech we back lives — literally glows. */}
        <radialGradient id="adopt-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(249, 115, 22, 0.16)" />
          <stop offset="70%" stopColor="rgba(249, 115, 22, 0.05)" />
          <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
        </radialGradient>
        {/* Per-ring "lit sphere" blip fills — lighter toward the top-center, ring color at the
            edge — referenced by Blip.tsx via url(#blipGrad-<RING>). Defined here so they live in
            the same SVG document as the blips that consume them. */}
        {BLIP_GRADIENTS.map(({ ring, light, base }) => (
          <radialGradient key={ring} id={`blipGrad-${ring}`} cx="38%" cy="32%" r="72%">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={base} />
          </radialGradient>
        ))}
      </defs>

      {/* Disc base + concentric depth: painted outermost-first so each smaller circle lightens the
          center, giving a spotlight-to-core falloff. The innermost band carries the warm Adopt glow. */}
      <circle cx={outerRadius} cy={outerRadius} r={outerRadius} fill="url(#radar-backdrop)" />
      {bands
        .slice()
        .reverse()
        .map((band, reverseIndex) => {
          const bandIndex = bands.length - 1 - reverseIndex
          const isInnermost = bandIndex === 0
          return (
            <circle
              key={`depth-${bandIndex}`}
              cx={outerRadius}
              cy={outerRadius}
              r={band.outer}
              fill={isInnermost ? 'url(#adopt-core)' : `rgba(255, 255, 255, ${0.006 + bandIndex * 0.007})`}
            />
          )
        })}

      {/* Ring guide circles + quadrant dividers + center hub — grouped so they draw in together on
          mount. Inner rings read slightly brighter than outer ones (opacity falloff) for depth. */}
      <g className="ring-draw-anim animate-ring-draw">
        {bands.map((band, index) => (
          <circle
            key={`ring-${index}`}
            cx={outerRadius}
            cy={outerRadius}
            r={band.outer}
            fill="none"
            className="stroke-border"
            strokeWidth={index === 0 ? 1.25 : 1}
            strokeOpacity={0.9 - index * 0.16}
          />
        ))}

        {QUADRANT_ORDER.map((quadrant, quadrantIndex) => (
          <path
            key={`sector-${quadrant}`}
            d={quadrantSectorPath(quadrantIndex, 0, outerRadius)}
            fill="none"
            className="stroke-border"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        ))}

        {/* Center hub — a small accent dot marking the bullseye (the "most adopted" origin). */}
        <circle cx={outerRadius} cy={outerRadius} r={2.5} className="fill-accent" opacity={0.8} />
      </g>

      {QUADRANT_ORDER.map((quadrant, quadrantIndex) => {
        const midAngle = quadrantIndex * (Math.PI / 2) + Math.PI / 4
        const { x, y } = polarToCartesian(outerRadius, outerRadius + LABEL_RADIUS_OFFSET, midAngle)
        const lines =
          size <= COMPACT_LABEL_WRAP_THRESHOLD ? wrapLabelLines(quadrantLabel[quadrant]) : [quadrantLabel[quadrant]]
        if (lines.length === 1) {
          return (
            <text
              key={`label-${quadrant}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted font-mono text-[14px]"
            >
              {lines[0]}
            </text>
          )
        }
        return (
          <g key={`label-${quadrant}`}>
            {lines.map((line, lineIndex) => (
              <text
                key={lineIndex}
                x={x}
                y={y + (lineIndex - (lines.length - 1) / 2) * LABEL_LINE_HEIGHT}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted font-mono text-[14px]"
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}

      {isLoading
        ? SKELETON_PLACEHOLDERS.map(({ quadrantIndex, ringIndex }, index) => {
            const band = bands[ringIndex]
            const angle = quadrantIndex * (Math.PI / 2) + Math.PI / 4
            const radius = (band.inner + band.outer) / 2
            const { x, y } = polarToCartesian(outerRadius, radius, angle)
            return (
              <circle
                key={`skeleton-${index}`}
                cx={x}
                cy={y}
                r={9}
                className="animate-pulse fill-surface-raised"
                aria-hidden="true"
              />
            )
          })
        : null}

      {!isLoading
        ? numbers.map(({ entry, number }, domIndex) => {
            const position = positionById.get(entry.id)
            if (!position) {
              return null
            }
            return (
              <Blip
                key={entry.id}
                entry={entry}
                position={position}
                number={number}
                isDimmed={!matched.has(entry.id)}
                isSelected={selectedEntryId === entry.id}
                isHovered={hoveredEntryId === entry.id}
                enterDelayMs={domIndex * BLIP_ENTER_STAGGER_MS}
                isFocused={false}
                onSelect={onBlipSelect}
                onHoverChange={(isHovering) => setHoveredEntryId(isHovering ? entry.id : null)}
              />
            )
          })
        : null}

      {/* Ring-name labels -- decorative chrome only (aria-hidden; the list view's own ring/
          quadrant headings are the accessible equivalent, EXPL-05). Rendered after the blips so
          the background-colored text halo (paintOrder="stroke") always wins legibility over a
          blip that happens to land near the top axis, rather than risking a blip fully covering
          the label underneath it. */}
      {RING_ORDER.map((ring, index) => {
        const { x, y } = polarToCartesian(outerRadius, bands[index].outer - RING_LABEL_INSET, 0)
        return (
          <text
            key={`ring-label-${ring}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            aria-hidden="true"
            paintOrder="stroke"
            strokeLinejoin="round"
            strokeWidth={4}
            className="fill-muted stroke-background font-mono text-[9px] font-semibold tracking-wide"
          >
            {ring}
          </text>
        )
      })}

      {hoveredEntry && hoveredPosition ? (
        <BlipTooltip
          entry={hoveredEntry}
          anchorPosition={hoveredPosition}
          visible
          viewport={{ w: size, h: size }}
        />
      ) : null}
    </svg>
  )
}
