// Base text input (EXPL-02 base for SearchInput; also the admin login/entry form base), token
// -driven per MASTER.md's `.input` spec. The id/name/autoComplete/onBlur/aria-* props exist for
// the admin forms (Phase 3): labeled fields with blur validation and aria-invalid/
// aria-describedby error association (WCAG 4.1.2/3.3.1), and autoComplete so a password manager
// recognizes the login form correctly -- none of Phase 2's callers needed them.
interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'search' | 'password'
  /** Additional Tailwind classes merged onto the input's own styling -- e.g. SearchInput's
      left padding to make room for its overlaid Search icon. Optional; Input looks correct
      without it. */
  className?: string
  id?: string
  name?: string
  autoComplete?: string
  onBlur?: () => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  required?: boolean
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  id,
  name,
  autoComplete,
  onBlur,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  required,
}: InputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      className={`w-full rounded-lg border border-border bg-surface px-4 py-3 text-[16px] text-foreground placeholder:text-muted transition-colors duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.25)] focus:outline-none ${className}`}
    />
  )
}
