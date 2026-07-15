// Movement notch (RADR-05) and isNew glow/pulse (RADR-04) are unprovable against the live
// backend's current seed data (all isNew=true, movement=NONE -- see 02-07's environment notes),
// so this suite exercises both states directly with synthetic entries/positions instead.
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Entry } from '../../api/types'
import type { BlipPosition } from '../../lib/radarGeometry'
import { Blip } from './Blip'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    description: '',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePosition(overrides: Partial<BlipPosition> = {}): BlipPosition {
  return {
    id: 1,
    x: 100,
    y: 100,
    angle: 0,
    ring: 'ADOPT',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ...overrides,
  }
}

function noop() {}

const originalMatchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

// happy-dom's own matchMedia already defaults `matches` to false (no reduced-motion preference)
// -- only the "prefers reduced motion" tests need to override it.
function mockPrefersReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

// The notch is a triangle whose first point (x=0) is its apex -- IN's apex sits closer to the
// blip center than its base, OUT's sits farther. Parsing this directly (rather than asserting a
// hardcoded points string) proves the actual directional geometry without coupling the test to
// Blip.tsx's exact pixel constants.
function apexDistanceFromCenter(points: string): number {
  const [firstPoint] = points.trim().split(/\s+/)
  const [, y] = firstPoint.split(',').map(Number)
  return Math.abs(y)
}

describe('Blip', () => {
  it('renders a static glow and a looping pulse ring for isNew when motion is not reduced', () => {
    const entry = makeEntry({ isNew: true, movement: 'NONE' })
    const { container } = render(
      <svg>
        <Blip entry={entry} position={makePosition()} number={1} onSelect={noop} onHoverChange={noop} />
      </svg>,
    )

    expect(container.innerHTML).toContain('drop-shadow(var(--glow-accent))')
    expect(container.querySelector('circle.animate-blip-pulse')).not.toBeNull()
    expect(
      screen.getByRole('button', { name: 'Kotlin — Adopt, Languages & Frameworks, new' }),
    ).toBeInTheDocument()
  })

  it('keeps the static glow but drops the pulse ring for isNew under prefers-reduced-motion', () => {
    mockPrefersReducedMotion(true)
    const entry = makeEntry({ isNew: true, movement: 'NONE' })
    const { container } = render(
      <svg>
        <Blip entry={entry} position={makePosition()} number={1} onSelect={noop} onHoverChange={noop} />
      </svg>,
    )

    expect(container.innerHTML).toContain('drop-shadow(var(--glow-accent))')
    expect(container.querySelector('circle.animate-blip-pulse')).toBeNull()
  })

  it('renders a movement IN notch rotated to the blip angle, with the "moved in" aria-label suffix', () => {
    const entry = makeEntry({ isNew: false, movement: 'IN' })
    const position = makePosition({ angle: Math.PI / 2 }) // 90 degrees
    const { container } = render(
      <svg>
        <Blip entry={entry} position={position} number={1} onSelect={noop} onHoverChange={noop} />
      </svg>,
    )

    const polygon = container.querySelector('polygon')
    expect(polygon).not.toBeNull()
    expect(polygon?.parentElement?.getAttribute('transform')).toBe('rotate(90)')
    expect(
      screen.getByRole('button', { name: 'Kotlin — Adopt, Languages & Frameworks, moved in' }),
    ).toBeInTheDocument()
  })

  it('renders a movement OUT notch whose apex points away from center (farther than IN\'s), with the "moved out" aria-label suffix', () => {
    const inEntry = makeEntry({ id: 1, isNew: false, movement: 'IN' })
    const outEntry = makeEntry({ id: 2, isNew: false, movement: 'OUT' })
    const position = makePosition()

    const inRender = render(
      <svg>
        <Blip entry={inEntry} position={position} number={1} onSelect={noop} onHoverChange={noop} />
      </svg>,
    )
    const outRender = render(
      <svg>
        <Blip entry={outEntry} position={position} number={2} onSelect={noop} onHoverChange={noop} />
      </svg>,
    )

    const inPoints = inRender.container.querySelector('polygon')?.getAttribute('points')
    const outPoints = outRender.container.querySelector('polygon')?.getAttribute('points')
    expect(inPoints).toBeTruthy()
    expect(outPoints).toBeTruthy()
    expect(apexDistanceFromCenter(outPoints as string)).toBeGreaterThan(
      apexDistanceFromCenter(inPoints as string),
    )
    expect(
      within(outRender.container).getByRole('button', {
        name: 'Kotlin — Adopt, Languages & Frameworks, moved out',
      }),
    ).toBeInTheDocument()
  })

  it('renders no notch, no glow/pulse, and no aria-label suffix when isNew is false and movement is NONE', () => {
    const entry = makeEntry({ isNew: false, movement: 'NONE' })
    const { container } = render(
      <svg>
        <Blip entry={entry} position={makePosition()} number={1} onSelect={noop} onHoverChange={noop} />
      </svg>,
    )

    expect(container.querySelector('polygon')).toBeNull()
    expect(container.querySelector('circle.animate-blip-pulse')).toBeNull()
    expect(container.innerHTML).not.toContain('drop-shadow')
    expect(
      screen.getByRole('button', { name: 'Kotlin — Adopt, Languages & Frameworks' }),
    ).toBeInTheDocument()
  })

  it('isNew takes visual priority over movement with no defensive branch (contract already guarantees mutual exclusion)', () => {
    // The API contract makes isNew=true, movement!=NONE structurally impossible (server-side
    // MovementCalculator short-circuits), but Blip.tsx's own isNew-first if/else-if means that
    // *if* it were ever violated, isNew would still win -- proving there is no separate
    // precedence branch needed, just the natural order of the if/else-if.
    const entry = makeEntry({ isNew: true, movement: 'IN' })
    const { container } = render(
      <svg>
        <Blip entry={entry} position={makePosition()} number={1} onSelect={noop} onHoverChange={noop} />
      </svg>,
    )

    expect(container.querySelector('circle.animate-blip-pulse')).not.toBeNull()
    expect(container.querySelector('polygon')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Kotlin — Adopt, Languages & Frameworks, new' }),
    ).toBeInTheDocument()
  })
})
