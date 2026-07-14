// Invariant suite for lib/radarGeometry.ts (RADR-07) -- written before the implementation
// exists. Until radarGeometry.ts is implemented, every test here fails to import (RED);
// that failure IS the specification computeBlipLayout must satisfy to turn GREEN.
import { describe, expect, it } from 'vitest'
import type { Entry, Quadrant, Ring } from '../api/types'
import { QUADRANT_ORDER, RING_ORDER } from './entryOrder'
import { computeBlipLayout, ringRadii, type BlipPosition } from './radarGeometry'

const SIZE = 400
const OUTER_RADIUS = SIZE / 2
const COLLISION_RADIUS = 12 // must match radarGeometry.ts's own named constant
const CONTAINMENT_EPSILON = 1e-4 // floating-point slack only -- the clamp step is exact
const COLLISION_TOLERANCE_EPSILON = 2 // px -- small slack for forceCollide's fixed-tick
// convergence, per this plan's own "beyond a small epsilon" wording -- not a loosened bar
const COLLISION_MIN_DISTANCE = COLLISION_RADIUS * 2 - COLLISION_TOLERANCE_EPSILON

function makeEntry(id: number, quadrant: Quadrant, ring: Ring): Entry {
  return {
    id,
    name: `Entry ${id}`,
    quadrant,
    ring,
    description: 'Test entry',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

// Spans all quadrant x ring cells (cycling), distinct ids -- the shared fixture for the
// determinism/containment/collision/perf assertions below.
function makeTestEntries(count: number): Entry[] {
  const entries: Entry[] = []
  for (let i = 0; i < count; i += 1) {
    const quadrant = QUADRANT_ORDER[i % QUADRANT_ORDER.length]
    const ring = RING_ORDER[Math.floor(i / QUADRANT_ORDER.length) % RING_ORDER.length]
    entries.push(makeEntry(i + 1, quadrant, ring))
  }
  return entries
}

function isWithinBandAndSector(position: BlipPosition, entry: Entry): boolean {
  const bands = ringRadii(OUTER_RADIUS)
  const band = bands[RING_ORDER.indexOf(entry.ring)]
  const dx = position.x - OUTER_RADIUS
  const dy = position.y - OUTER_RADIUS
  const radius = Math.hypot(dx, dy)
  const withinBand =
    radius >= band.inner - CONTAINMENT_EPSILON && radius <= band.outer + CONTAINMENT_EPSILON

  let angle = Math.atan2(dx, -dy)
  if (angle < 0) {
    angle += 2 * Math.PI
  }
  const quadrantIndex = QUADRANT_ORDER.indexOf(entry.quadrant)
  const sectorStart = quadrantIndex * (Math.PI / 2)
  const sectorEnd = sectorStart + Math.PI / 2
  const withinSector =
    angle >= sectorStart - CONTAINMENT_EPSILON && angle <= sectorEnd + CONTAINMENT_EPSILON

  return withinBand && withinSector
}

describe('ringRadii', () => {
  it('returns 4 monotonically increasing bands spanning [0, outerRadius]', () => {
    const bands = ringRadii(OUTER_RADIUS)
    expect(bands).toHaveLength(4)
    expect(bands[0].inner).toBe(0)
    expect(bands[3].outer).toBe(OUTER_RADIUS)
    for (const band of bands) {
      expect(band.outer).toBeGreaterThan(band.inner)
    }
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i].inner).toBe(bands[i - 1].outer)
    }
  })
})

describe('computeBlipLayout', () => {
  it('is deterministic for identical input (byte-identical across two calls)', () => {
    const entries = makeTestEntries(50)
    const first = computeBlipLayout(entries, SIZE)
    const second = computeBlipLayout(entries, SIZE)
    expect(second).toEqual(first)
  })

  it('keeps every blip within its own ring band and quadrant sector -- band/sector containment (100 entries)', () => {
    const entries = makeTestEntries(100)
    const positions = computeBlipLayout(entries, SIZE)
    expect(positions).toHaveLength(100)
    for (const position of positions) {
      const entry = entries.find((candidate) => candidate.id === position.id)
      expect(entry).toBeDefined()
      expect(isWithinBandAndSector(position, entry as Entry)).toBe(true)
    }
  })

  it('never places two blips closer than the collision tolerance (100 entries, pairwise)', () => {
    const entries = makeTestEntries(100)
    const positions = computeBlipLayout(entries, SIZE)
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const distance = Math.hypot(
          positions[i].x - positions[j].x,
          positions[i].y - positions[j].y,
        )
        expect(distance).toBeGreaterThanOrEqual(COLLISION_MIN_DISTANCE)
      }
    }
  })

  it('computes a 100-entry layout well under the render budget (<1000ms)', () => {
    const entries = makeTestEntries(100)
    const start = performance.now()
    computeBlipLayout(entries, SIZE)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1000)
  })

  it('leaves unrelated entries unchanged when one entry is added or removed (id-seeded, not index-seeded)', () => {
    // kept/removed sit in opposite quadrants (indices 0 and 2 -- a full quadrant's angular
    // gap on each side, no shared sector boundary) within the outermost ring band (inner
    // radius bounded well away from the shared center point) -- geometrically far enough
    // apart that d3-force's collision solver can never let one perturb the other, isolating
    // the id-vs-index seeding claim from Phase B's genuine N-body physics.
    const kept = makeEntry(101, QUADRANT_ORDER[0], RING_ORDER[3])
    const removed = makeEntry(202, QUADRANT_ORDER[2], RING_ORDER[3])

    const withBoth = computeBlipLayout([kept, removed], SIZE)
    const withoutRemoved = computeBlipLayout([kept], SIZE)

    const keptWithBoth = withBoth.find((position) => position.id === kept.id)
    const keptAlone = withoutRemoved.find((position) => position.id === kept.id)

    expect(keptAlone).toEqual(keptWithBoth)
  })
})
