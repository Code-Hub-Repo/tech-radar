import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { createEntry, deleteEntry, fetchEntries, updateEntry } from './client'
import type { EntryRequest } from './types'

const ENTRIES_QUERY_KEY = ['entries']

// Deliberately no interval-based auto-refetch option set — this project polls never
// (CONTEXT.md's "no polling" decision). Focus/reconnect refetch and retry count are already
// disabled/capped globally via the QueryClient's defaultOptions (main.tsx), so this hook
// needs no per-query overrides.
export function useEntries() {
  return useQuery({
    queryKey: ENTRIES_QUERY_KEY,
    queryFn: fetchEntries,
  })
}

// Admin write hooks. Each stays a thin token+invalidation wrapper — success/error toasts, 401
// logout+redirect, and 400/409 field-error mapping are all UI decisions that differ by caller
// (AdminPage's form vs. its delete-confirm flow), so they're handled at the call site via the
// mutation's own per-call onSuccess/onError rather than baked in here (ADMN-07's live-integration
// proof: invalidating ['entries'] here is what makes the public radar and the admin table both
// refetch and reflect the change, with no manual cache surgery).
export function useCreateEntry() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: EntryRequest) => createEntry(token ?? '', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY }),
  })
}

export function useUpdateEntry() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: EntryRequest }) => updateEntry(token ?? '', id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY }),
  })
}

export function useDeleteEntry() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEntry(token ?? '', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY }),
  })
}
