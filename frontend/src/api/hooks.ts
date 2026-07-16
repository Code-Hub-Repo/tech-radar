import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import {
  approveProposal,
  createEntry,
  deleteEntry,
  fetchEntries,
  fetchEntryHistory,
  fetchProposals,
  rejectProposal,
  submitProposal,
  updateEntry,
} from './client'
import type { ApproveProposalRequest, EntryRequest, ProposalRequest, ProposalStatus } from './types'

const ENTRIES_QUERY_KEY = ['entries']
const PROPOSALS_QUERY_KEY = ['proposals']
const ENTRY_HISTORY_QUERY_KEY = ['entryHistory']

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

// HIST-01: fetched fresh per entry when the detail panel opens. entryId is null while no entry
// is selected -- `enabled` keeps the query from firing with a bogus id in that state, mirroring
// the null-guard convention useProposals below uses for its own optional-until-ready dependency.
export function useEntryHistory(entryId: number | null) {
  return useQuery({
    queryKey: [...ENTRY_HISTORY_QUERY_KEY, entryId],
    queryFn: () => fetchEntryHistory(entryId as number),
    enabled: entryId !== null,
  })
}

// Admin moderation queue (PROP-02). Keyed per status filter so a future all-statuses view would
// cache independently of this tab's PENDING-only query; invalidateQueries({queryKey:
// PROPOSALS_QUERY_KEY}) below matches every status variant via TanStack's default prefix match.
export function useProposals(status?: ProposalStatus) {
  const { token } = useAuth()
  return useQuery({
    queryKey: [...PROPOSALS_QUERY_KEY, status ?? 'all'],
    queryFn: () => fetchProposals(token ?? '', status),
    enabled: token !== null,
  })
}

// Public — no auth, no invalidation on success: a visitor's own submission can't change anything
// an unauthenticated session can see (the entry doesn't exist until an admin approves it, and
// PENDING proposals are only ever listed behind the admin's own JWT-guarded query above).
export function useSubmitProposal() {
  return useMutation({
    mutationFn: (request: ProposalRequest) => submitProposal(request),
  })
}

// Approve composes CreateEntryUseCase server-side (05-01-SUMMARY.md) -- invalidating BOTH query
// keys here is what makes the new entry appear on the public radar AND the admin's own
// Technologies tab in the same render pass the Proposals tab's badge count drops.
export function useApproveProposal() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, overrides }: { id: number; overrides: ApproveProposalRequest }) =>
      approveProposal(token ?? '', id, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPOSALS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY })
    },
  })
}

export function useRejectProposal() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rejectProposal(token ?? '', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROPOSALS_QUERY_KEY }),
  })
}
