// Concise, dismissible "how to read this radar" explainer -- the third comprehension anchor
// alongside the radar's own ring labels and the Legend's ring meanings. Shows automatically on a
// visitor's first-ever load (HomePage checks lib/introDismissal before mounting this as open),
// stays out of the way after that, and is always reachable again via Header's own trigger
// button. Deliberately has no enter/exit animation -- a plain conditional render is trivially
// reduced-motion-safe (nothing to suppress) and keeps the banner unambiguously non-intrusive: it
// never slides/fades over content the visitor is already reading.
import { Info, X } from 'lucide-react'

interface IntroBannerProps {
  isOpen: boolean
  onDismiss: () => void
}

export function IntroBanner({ isOpen, onDismiss }: IntroBannerProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div
      role="note"
      aria-label="How to read this radar"
      className="relative mb-8 flex items-start gap-4 rounded-xl border border-accent/30 bg-surface px-6 py-5"
    >
      <Info aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-accent" />
      <p className="flex-1 font-sans text-[14px] leading-[1.5] text-foreground">
        <span className="font-semibold">How to read this radar:</span> the{' '}
        <span className="font-semibold text-accent">4 rings</span> show adoption stages from the
        center outward — <span className="font-semibold">Adopt</span> at the core to{' '}
        <span className="font-semibold">Hold</span> at the edge. The{' '}
        <span className="font-semibold text-accent">4 quadrants</span> group technologies by
        category. Click any dot or list row to see its details.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss how-to-read intro"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-raised hover:text-foreground"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
