// Pure viewport edge-clamp for BlipTooltip positioning -- no DOM access, no positioning
// library. A blip's anchor coordinate is already exact (computeBlipLayout's deterministic
// output), so placement is just anchor + a fixed offset, shifted back inside the given bounds
// when it would overflow (02-RESEARCH.md: "the input space is fixed and small, no dynamic
// collision detection needed").
export interface TooltipPoint {
  x: number
  y: number
}

export interface TooltipSize {
  w: number
  h: number
}

// Fixed offset from the anchor to the tooltip's top-left corner in the fits-inside-bounds case.
export const TOOLTIP_OFFSET: TooltipPoint = { x: 12, y: 12 }

// anchor: the blip's exact position. viewport: the coordinate space the tooltip must stay
// inside (RadarChart's own SVG viewBox bounds, since BlipTooltip renders as a foreignObject
// sibling in that same local coordinate system). tip: the tooltip's own footprint.
export function clampTooltip(anchor: TooltipPoint, viewport: TooltipSize, tip: TooltipSize): TooltipPoint {
  const naturalX = anchor.x + TOOLTIP_OFFSET.x
  const naturalY = anchor.y + TOOLTIP_OFFSET.y

  const maxX = viewport.w - tip.w
  const maxY = viewport.h - tip.h

  return {
    x: Math.max(0, Math.min(naturalX, maxX)),
    y: Math.max(0, Math.min(naturalY, maxY)),
  }
}
