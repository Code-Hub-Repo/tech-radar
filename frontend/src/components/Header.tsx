import type { ReactNode } from 'react'

interface HeaderProps {
  /** Right-aligned slot reserved for SearchInput (wired in a later wave). */
  children?: ReactNode
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[28px] font-semibold leading-[1.2] text-foreground">
          Code<span className="text-accent">.Hub</span>
        </span>
        <h1 className="font-mono text-[28px] font-semibold leading-[1.2] text-foreground">
          Tech Radar
        </h1>
      </div>
      {children ? <div className="flex items-center gap-4">{children}</div> : null}
    </header>
  )
}
