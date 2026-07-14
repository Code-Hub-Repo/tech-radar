// Toggleable pill powering quadrant chips, ring chips, and the New-only toggle (EXPL-01);
// the interactive=false variant renders a non-interactive <span> for future list-row ring
// badge reuse (RADR-06) without pulling aria-pressed semantics onto non-toggleable UI.
import type { LucideIcon } from 'lucide-react'

interface ChipProps {
  label: string
  active: boolean
  /** Tailwind background utility class applied when active (e.g. "bg-accent", "bg-ring-adopt"). */
  colorToken: string
  onClick?: () => void
  icon?: LucideIcon
  /** false renders a non-interactive <span> (no aria-pressed) -- the list-row ring badge reuse
      variant. Defaults to true (the filter-chip use case). */
  interactive?: boolean
}

// 36px min-height (Touch Target spec) via Tailwind's min-h-9 (9 * 0.25rem = 2.25rem = 36px).
const BASE_CLASS =
  'inline-flex min-h-9 items-center gap-2 rounded-full border px-4 py-2 font-mono text-[14px] font-semibold leading-[1.4] transition-colors duration-200'

// Inactive = .btn-secondary-style treatment (transparent bg, #3a3a3a border, #fafafa text).
const INACTIVE_VISUAL_CLASS = 'border-border bg-transparent text-foreground'
// Active = filled with the semantic colorToken + #1a1a1a (--color-on-accent) text.
const ACTIVE_VISUAL_SUFFIX = 'border-transparent text-on-accent'
// Hover affordance only applies to the interactive (button) inactive state -- mirrors
// MASTER.md's .btn-secondary:hover; an active chip is already fully filled, and the
// non-interactive span variant has no hover/cursor affordance at all.
const INACTIVE_HOVER_CLASS = 'cursor-pointer hover:border-accent hover:bg-accent/10'

export function Chip({ label, active, colorToken, onClick, icon: Icon, interactive = true }: ChipProps) {
  const stateClass = active ? `${colorToken} ${ACTIVE_VISUAL_SUFFIX}` : INACTIVE_VISUAL_CLASS
  const content = (
    <>
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      {label}
    </>
  )

  if (!interactive) {
    return <span className={`${BASE_CLASS} ${stateClass} cursor-default`}>{content}</span>
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${BASE_CLASS} ${stateClass} ${active ? '' : INACTIVE_HOVER_CLASS}`}
    >
      {content}
    </button>
  )
}
