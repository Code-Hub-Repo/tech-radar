// Hand-rolled, focus-trapped modal (Phase 2's deferred no-dep decision — no react-aria/radix/vaul
// dependency). Mirrors DetailPanel.tsx's own sheet focus-trap contract exactly (same
// FOCUSABLE_SELECTOR, same Tab-wrap logic, same Escape-closes behavior) since that pattern was
// already proven live in Phase 2 -- this generalizes it into a reusable primitive for
// ConfirmDialog and EntryFormModal. Scrim reuses MASTER.md's .modal-overlay values
// (rgba(0,0,0,0.6) + blur(4px)), the exact same values DetailPanel's mobile sheet scrim uses.
import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Focuses this element instead of the heading when the modal opens -- ConfirmDialog points
      this at its Cancel button so a destructive dialog never defaults focus onto Delete. */
  initialFocusRef?: RefObject<HTMLElement | null>
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ isOpen, onClose, title, children, initialFocusRef }: ModalProps) {
  const headingId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const triggerRef = useRef<Element | null>(null)

  // Ref writes must happen outside render (react-hooks/refs) -- capturing the trigger element
  // and moving focus both live in this one effect, which only re-runs when `isOpen` actually
  // changes (not on every unrelated re-render while the modal stays open, which would otherwise
  // rudely yank focus back to the heading while e.g. a form field inside is being typed into).
  // Capturing document.activeElement here, before this same effect's own focus() call below,
  // still correctly reads the pre-modal trigger element -- nothing else has moved focus yet.
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      const target = initialFocusRef?.current ?? headingRef.current
      target?.focus({ preventScroll: true })
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus({ preventScroll: true })
    }
  }, [isOpen, initialFocusRef])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key === 'Tab') {
      const container = containerRef.current
      if (!container) {
        return
      }
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Scrim -- MASTER.md .modal-overlay values via Tailwind arbitrary values, same pattern
          DetailPanel's sheet scrim already uses. Purely decorative (aria-hidden); Escape and the
          explicit close button are the keyboard path, click-to-close is the pointer path. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px]"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          onKeyDown={handleKeyDown}
          className="flex w-[90%] max-w-[500px] flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-8 shadow-lg"
        >
          <div className="flex items-start justify-between gap-4">
            <h2
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="text-[20px] font-semibold leading-[1.2] text-foreground"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface hover:text-foreground"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}
