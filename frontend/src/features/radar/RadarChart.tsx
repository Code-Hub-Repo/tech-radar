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
      {bands.map((band, index) => (
        <circle
          key={`ring-${index}`}
          cx={outerRadius}
          cy={outerRadius}
          r={band.outer}
          fill="none"
          className="stroke-border"
          strokeWidth={1}
        />
      ))}

      {QUADRANT_ORDER.map((quadrant, quadrantIndex) => (
        <path
          key={`sector-${quadrant}`}
          d={quadrantSectorPath(quadrantIndex, 0, outerRadius)}
          fill="none"
          className="stroke-border"
          strokeWidth={1}
        />
      ))}

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
        ? numbers.map(({ entry, number }) => {
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
                isFocused={false}
                onSelect={onBlipSelect}
                onHoverChange={(isHovering) => setHoveredEntryId(isHovering ? entry.id : null)}
              />
            )
          })
        : null}

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
