// Debounced search box (EXPL-02): local state renders every keystroke immediately for a
// responsive typing feel, while onChange -- which drives the caller's replace:true URL update
// (Header owns the actual setSearchParams call) -- only fires debounceMs after the user stops
// typing, never on every keystroke.
import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../../components/Input'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  debounceMs: number
}

export function SearchInput({ value, onChange, debounceMs }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  // Detects a genuine external value change (e.g. Clear filters resetting the URL's `q` param
  // out from under this component) and re-syncs local state during render -- the
  // React-recommended "adjust state while rendering" pattern, which avoids the extra
  // render/commit/effect cycle a useEffect-based sync would cause here.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setLocalValue(value)
  }

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounce timers don't survive an unmount -- clear on cleanup so a pending call never fires
  // onChange against an unmounted component's stale closure.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function handleChange(nextValue: string) {
    setLocalValue(nextValue)
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      onChange(nextValue)
    }, debounceMs)
  }

  return (
    <div className="relative w-full max-w-xs">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <Input value={localValue} onChange={handleChange} placeholder="Search technologies…" type="search" className="pl-10" />
    </div>
  )
}
