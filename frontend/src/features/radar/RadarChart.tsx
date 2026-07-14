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
        return (
          <text
            key={`label-${quadrant}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted font-mono text-[14px]"
          >
            {quadrantLabel[quadrant]}
          </text>
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
