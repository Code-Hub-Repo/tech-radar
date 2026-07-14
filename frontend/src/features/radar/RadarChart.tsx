// Static SVG chrome (ring guide bands, quadrant sector dividers, quadrant labels) plus a
// data-independent loading skeleton layer. D3 supplies the ring/quadrant geometry math only
// (lib/radarGeometry.ts); every element below is a React-owned SVG node -- no DOM-mutating
// D3 submodule is ever imported here.
import type { Entry, FilterState } from '../../api/types'
import { quadrantLabel } from '../../api/types'
import { QUADRANT_ORDER, ringRadii, quadrantSectorPath } from '../../lib/radarGeometry'

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

// Renders the radar's static chrome + (while isLoading) skeleton placeholders. entries /
// filterState / selectedEntryId / onBlipSelect are already part of the public prop contract
// so the real <Blip> layer can be wired in without a signature change.
export function RadarChart({ size, isLoading }: RadarChartProps) {
  const outerRadius = size / 2
  const bands = ringRadii(outerRadius)

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
    </svg>
  )
}
