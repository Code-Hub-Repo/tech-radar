// Pure ring-band geometry, quadrant-sector arc paths, and computeBlipLayout: deterministic
// seeded placement + d3-force collision relaxation. D3 supplies math only -- nothing here
// touches the DOM (docs/DESIGN.md §5's D3-computes/React-renders boundary; the DOM-mutating
// submodules are banned at lint level, see eslint.config.js).
import { arc as d3arc } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { randomLcg } from 'd3-random'
import { forceSimulation, forceCollide } from 'd3-force'
import type { Entry, Quadrant, Ring } from '../api/types'
import { QUADRANT_ORDER, RING_ORDER } from './entryOrder'

// Re-published from entryOrder.ts (the canonical quadrant/ring ordering + blip-numbering
// authority) rather than redefined here, so the radar and the list view can never drift out
// of sync -- RADR-06's numbered cross-reference holds by construction, not by convention.
export { QUADRANT_ORDER, RING_ORDER }

// Ring band edges as ratios of the outer radius, per docs/DESIGN.md §5 (Adopt innermost).
export const RING_BAND_EDGES = [0, 0.36, 0.62, 0.82, 1.0] as const

// Collision + relaxation tuning -- locked as named constants per 02-RESEARCH.md's resolved
// Open Question #1 (Claude's Discretion in CONTEXT.md, tuned and fixed during research).
const COLLISION_RADIUS = 12 // px
const RELAXATION_TICKS = 300 // fixed count -> fully synchronous, no convergence listener
// Fixed seed for the shared simulation's rare exact-tie jiggle case; per-entry placement
// variation comes from Phase A's id-seeded placement below, not from this shared seed.
const GLOBAL_RELAXATION_SEED = 0xc0de

export interface RingBand {
  inner: number
  outer: number
}

export interface BlipPosition {
  id: number
  x: number
  y: number
  // Retained from the polar phase -- Blip.tsx needs this to rotate the movement notch
  // toward/away from center.
  angle: number
  ring: Ring
  quadrant: Quadrant
}

interface LayoutNode extends BlipPosition {
  vx?: number
  vy?: number
}

// Ratio -> pixel radius per ring, via d3.scaleLinear([0,1], [0, outerRadius]).
export function ringRadii(outerRadius: number): RingBand[] {
  const scale = scaleLinear([0, 1], [0, outerRadius])
  const bands: RingBand[] = []
  for (let index = 0; index < RING_ORDER.length; index += 1) {
    bands.push({
      inner: scale(RING_BAND_EDGES[index]),
      outer: scale(RING_BAND_EDGES[index + 1]),
    })
  }
  return bands
}

// d3.arc() angle convention: 0 = 12 o'clock (-y), positive = clockwise, radians not degrees.
export function quadrantSectorPath(
  quadrantIndex: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const startAngle = quadrantIndex * (Math.PI / 2)
  const endAngle = startAngle + Math.PI / 2
  const generator = d3arc()
  return generator({ innerRadius, outerRadius, startAngle, endAngle }) ?? ''
}

// Clamps a node back into its own ring band and quadrant sector in polar space (not
// cartesian -- the constraint region is an annular wedge, not a rectangle). Mutates node.
function clampToBandAndSector(
  node: LayoutNode,
  band: RingBand,
  quadrantIndex: number,
  outerRadius: number,
): void {
  const dx = node.x - outerRadius
  const dy = node.y - outerRadius
  let angle = Math.atan2(dx, -dy)
  if (angle < 0) {
    angle += 2 * Math.PI
  }
  const sectorStart = quadrantIndex * (Math.PI / 2)
  const clampedAngle = Math.min(Math.max(angle, sectorStart), sectorStart + Math.PI / 2)
  const radius = Math.min(Math.max(Math.hypot(dx, dy), band.inner), band.outer)
  node.x = outerRadius + radius * Math.sin(clampedAngle)
  node.y = outerRadius - radius * Math.cos(clampedAngle)
  node.angle = clampedAngle
}

// Pure: identical (entries, size) always produces identical output. Never mutates the
// input `entries` array or its elements -- Phase B's forceSimulation mutates only the
// locally-constructed `nodes` objects below.
export function computeBlipLayout(entries: Entry[], size: number): BlipPosition[] {
  const outerRadius = size / 2
  const bands = ringRadii(outerRadius)

  // Phase A: per-entry-id-seeded initial placement within the entry's own band x sector.
  // Seeding by entry.id (not array index) means adding/removing one entry never reshuffles
  // every other entry's Phase-A seed -- positions stay stable as the dataset grows.
  const nodes: LayoutNode[] = entries.map((entry) => {
    const rng = randomLcg(entry.id)
    const quadrantIndex = QUADRANT_ORDER.indexOf(entry.quadrant)
    const ringIndex = RING_ORDER.indexOf(entry.ring)
    const band = bands[ringIndex]
    const angleInSector = quadrantIndex * (Math.PI / 2) + rng() * (Math.PI / 2)
    const radiusInBand = band.inner + rng() * (band.outer - band.inner)
    return {
      id: entry.id,
      ring: entry.ring,
      quadrant: entry.quadrant,
      angle: angleInSector,
      x: outerRadius + radiusInBand * Math.sin(angleInSector),
      y: outerRadius - radiusInBand * Math.cos(angleInSector),
    }
  })

  // Phase B: synchronous, deterministic collision relaxation. The explicit .randomSource()
  // call is mandatory (02-RESEARCH.md Pitfall #3) -- forceCollide's internal jiggle
  // tie-breaker consumes it, and the simulation's unseeded default is not fixed across
  // reloads. .stop() guarantees no internal timer/requestAnimationFrame runs; every tick
  // below is a manual, synchronous step.
  const simulation = forceSimulation(nodes)
    .force('collide', forceCollide(COLLISION_RADIUS))
    .randomSource(randomLcg(GLOBAL_RELAXATION_SEED))
    .stop()

  for (let tick = 0; tick < RELAXATION_TICKS; tick += 1) {
    simulation.tick()
    for (const node of nodes) {
      const band = bands[RING_ORDER.indexOf(node.ring)]
      const quadrantIndex = QUADRANT_ORDER.indexOf(node.quadrant)
      clampToBandAndSector(node, band, quadrantIndex, outerRadius)
    }
  }

  return nodes.map(({ id, x, y, angle, ring, quadrant }) => ({ id, x, y, angle, ring, quadrant }))
}
