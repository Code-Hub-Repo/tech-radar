// Base text input (EXPL-02 base for SearchInput), token-driven per MASTER.md's `.input` spec.
interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'search'
  /** Additional Tailwind classes merged onto the input's own styling -- e.g. SearchInput's
      left padding to make room for its overlaid Search icon. Optional; Input looks correct
      without it. */
  className?: string
}

export function Input({ value, onChange, placeholder, type = 'text', className = '' }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-border bg-surface px-4 py-3 text-[16px] text-foreground placeholder:text-muted transition-colors duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.25)] focus:outline-none ${className}`}
    />
  )
}
