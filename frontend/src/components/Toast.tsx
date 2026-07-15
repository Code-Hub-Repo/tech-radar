// Mutation outcome toasts (ADMN-07): success + error, auto-dismiss, stacked bottom-right.
// role="status" on each item is its own implicit aria-live="polite"/aria-atomic="true" region
// (WAI-ARIA), so nothing here ever calls .focus() -- announced without stealing keyboard focus
// from whatever the admin was doing (typing in the form, reading the table).
import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ToastContext } from './ToastContext'
import type { ToastType } from './ToastContext'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

const AUTO_DISMISS_MS = 4000

const ICON_BY_TYPE: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
}

// Icon + border color together carry the success/error distinction -- never color alone
// (MASTER.md: "Never rely on color alone").
const ACCENT_CLASS_BY_TYPE: Record<ToastType, string> = {
  success: 'border-success/40 text-success',
  error: 'border-destructive/40 text-destructive',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, type, message }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, AUTO_DISMISS_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* flex-col-reverse + array order oldest->newest puts the newest toast at the bottom
          (closest to the corner it enters from), older ones pushed upward as more arrive. */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[70] flex w-full max-w-sm flex-col-reverse gap-2">
        {toasts.map((toast) => {
          const Icon = ICON_BY_TYPE[toast.type]
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center gap-3 rounded-lg border bg-surface-raised px-4 py-3 shadow-lg ${ACCENT_CLASS_BY_TYPE[toast.type]}`}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              <span className="text-[14px] leading-[1.4] text-foreground">{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
