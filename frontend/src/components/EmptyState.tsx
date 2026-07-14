interface EmptyStateProps {
  heading: string
  body: string
  action?: {
    label: string
    onClick: () => void
  }
}

// Zero-data / zero-match messaging. Token-driven, centered — used at HomePage level for the
// "0 total entries" state (BRND-03); the optional `action` slot exists for the future
// filtered-to-zero "Clear filters" recovery button (wired in a later wave).
export function EmptyState({ heading, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <h2 className="text-[20px] font-semibold leading-[1.2] text-foreground">{heading}</h2>
      <p className="max-w-md text-[16px] leading-[1.5] text-muted">{body}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="cursor-pointer rounded-lg bg-accent px-6 py-3 font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
