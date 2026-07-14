import { describe, it, expect } from 'vitest'
import { clampTooltip, TOOLTIP_OFFSET } from './tooltipPosition'

const VIEWPORT = { w: 800, h: 600 }
const TIP = { w: 150, h: 50 }

describe('clampTooltip', () => {
  it('returns anchor + fixed offset when the tip fits fully inside the viewport', () => {
    const anchor = { x: 100, y: 100 }
    const result = clampTooltip(anchor, VIEWPORT, TIP)
    expect(result).toEqual({ x: anchor.x + TOOLTIP_OFFSET.x, y: anchor.y + TOOLTIP_OFFSET.y })
    expect(result.x + TIP.w).toBeLessThanOrEqual(VIEWPORT.w)
    expect(result.y + TIP.h).toBeLessThanOrEqual(VIEWPORT.h)
  })

  it('shifts x left when the natural offset would overflow the right edge', () => {
    const anchor = { x: 780, y: 100 }
    const result = clampTooltip(anchor, VIEWPORT, TIP)
    expect(result.x).toBeLessThan(anchor.x + TOOLTIP_OFFSET.x)
    expect(result.x + TIP.w).toBeLessThanOrEqual(VIEWPORT.w)
    // y is unaffected -- only the overflowing axis is clamped
    expect(result.y).toBe(anchor.y + TOOLTIP_OFFSET.y)
  })

  it('shifts y up when the natural offset would overflow the bottom edge', () => {
    const anchor = { x: 100, y: 580 }
    const result = clampTooltip(anchor, VIEWPORT, TIP)
    expect(result.y).toBeLessThan(anchor.y + TOOLTIP_OFFSET.y)
    expect(result.y + TIP.h).toBeLessThanOrEqual(VIEWPORT.h)
    expect(result.x).toBe(anchor.x + TOOLTIP_OFFSET.x)
  })

  it('never returns a negative x or y, even when the tip is larger than the viewport', () => {
    const result = clampTooltip({ x: 10, y: 10 }, { w: 50, h: 50 }, { w: 150, h: 80 })
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })
})
