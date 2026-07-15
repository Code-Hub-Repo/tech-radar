// Context object + useToast() hook only -- kept out of Toast.tsx so that file exports nothing
// but the ToastProvider component itself (react-refresh/only-export-components: Fast Refresh
// can't hot-swap a file that mixes a component export with other exports).
import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error'

export interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
