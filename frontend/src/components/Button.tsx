// Shared button primitive (deferred from Phase 2, MASTER.md's .btn-primary/.btn-secondary specs
// plus a destructive variant for delete confirmation). Every admin action button routes through
// this so loading/disabled states and the 150-300ms transition rule apply everywhere uniformly.
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'destructive'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className'> {
  children: ReactNode
  variant?: ButtonVariant
  isLoading?: boolean
  type?: 'button' | 'submit'
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-border bg-transparent text-foreground hover:border-accent hover:bg-accent/10',
  // Reuses --color-on-accent (near-black) for the label, not white -- the same "on-accent is
  // near-black" contrast principle MASTER.md documents for the orange primary button holds for
  // red too (measured ~4.6:1 vs white's ~3.6:1 on #ef4444, the difference between passing and
  // failing WCAG AA's 4.5:1 text-contrast floor at this weight/size).
  destructive: 'bg-destructive text-on-accent hover:bg-destructive-hover',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = 'primary', isLoading = false, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]}`}
      {...rest}
    >
      {isLoading ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : null}
      {children}
    </button>
  )
})
