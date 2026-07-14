import { useQuery } from '@tanstack/react-query'
import { fetchEntries } from './client'

// Deliberately no interval-based auto-refetch option set — this project polls never
// (CONTEXT.md's "no polling" decision). Focus/reconnect refetch and retry count are already
// disabled/capped globally via the QueryClient's defaultOptions (main.tsx), so this hook
// needs no per-query overrides.
export function useEntries() {
  return useQuery({
    queryKey: ['entries'],
    queryFn: fetchEntries,
  })
}
