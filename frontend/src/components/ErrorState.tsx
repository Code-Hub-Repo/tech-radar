interface ErrorStateProps {
  heading: string
  body: string
  onRetry: () => void
}

// Fetch-failure messaging (BRND-03). heading/body are always caller-supplied fixed copy
// (never the raw fetch error or backend detail — T-02-ID2 mitigation), token-driven, centered.
export function ErrorState({ heading, body, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <h2 className="text-[20px] font-semibold leading-[1.2] text-foreground">{heading}</h2>
      <p className="max-w-md text-[16px] leading-[1.5] text-muted">{body}</p>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer rounded-lg bg-accent px-6 py-3 font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-hover active:scale-[0.98]"
      >
        Retry loading
      </button>
    </div>
  )
}
