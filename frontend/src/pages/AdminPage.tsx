// /admin (ADMN-02, guarded by RequireAuth in main.tsx). Header carries the admin identity +
// entry-management actions (Add technology) with Logout visually/spatially separated from them
// via a divider (03-CONTEXT.md's header spec: a session action reads differently from a content
// action) -- matches Header.tsx's own gradient/accent-underline treatment so the admin panel
// reads as the same product, not a bolted-on form.
//
// Below the header, a two-tab layout (PROP-02): Technologies (unchanged from Phase 3) and
// Proposals (05-CONTEXT.md), with a pending-count badge on the Proposals tab driven by
// useProposals('PENDING') -- fetched unconditionally on mount (not lazily on tab visit) since
// the whole point of a badge is surfacing the count *before* the admin opens that tab. Active
// tab lives in ?tab= for deep-linking, using {replace:true} the same way Header's own search
// input treats itself as ephemeral UI state rather than a back-button-worthy navigation.
//
// Owns every admin mutation call site (not EntryTable/EntryFormModal/ConfirmDialog/ProposalsTab/
// ApproveProposalModal themselves) so the 401-logout+redirect and 400/409-vs-toast branching
// lives in exactly one place: a 401 from ANY mutation logs out (RequireAuth then redirects on
// the next render, ADMN-02); a 400/409 that can be mapped onto a field populates the relevant
// form's inline errors instead of a toast; everything else is a generic error toast. Every entry
// mutation invalidates ['entries'], and approve additionally invalidates ['proposals'] (api/
// hooks.ts) -- invalidating both is what makes the public radar, this page's own Technologies
// tab, AND the Proposals tab's badge all reflect an approval in the same render pass.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { LogOut, Plus } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { ApiError, isUnauthorizedError } from '../api/client'
import {
  useApproveProposal,
  useCreateEntry,
  useDeleteEntry,
  useEntries,
  useProposals,
  useRejectProposal,
  useUpdateEntry,
} from '../api/hooks'
import type { ApproveProposalRequest, Entry, EntryRequest, Proposal } from '../api/types'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../components/ToastContext'
import { EntryFormModal } from '../features/admin/EntryFormModal'
import { EntryTable } from '../features/admin/EntryTable'
import { ApproveProposalModal } from '../features/proposals/ApproveProposalModal'
import { ProposalsTab } from '../features/proposals/ProposalsTab'

const LOADING_ROW_COUNT = 5

type AdminTab = 'technologies' | 'proposals'
const TAB_PARAM = 'tab'

function tabFromParams(searchParams: URLSearchParams): AdminTab {
  return searchParams.get(TAB_PARAM) === 'proposals' ? 'proposals' : 'technologies'
}

function tabButtonClass(isActive: boolean): string {
  return `-mb-px flex cursor-pointer items-center border-b-2 px-4 py-2.5 font-mono text-[14px] font-semibold transition-colors duration-200 ${
    isActive ? 'border-accent text-foreground' : 'border-transparent text-muted hover:text-foreground'
  }`
}

export function AdminPage() {
  const auth = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabFromParams(searchParams)

  const { data, isPending, isError, refetch } = useEntries()
  const entries = data ?? []
  const {
    data: proposalsData,
    isPending: proposalsPending,
    isError: proposalsError,
    refetch: refetchProposals,
  } = useProposals('PENDING')
  const pendingProposals = proposalsData ?? []
  const pendingCount = pendingProposals.length

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [formServerErrors, setFormServerErrors] = useState<Record<string, string>>({})
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null)
  const [approvingProposal, setApprovingProposal] = useState<Proposal | null>(null)
  const [approveServerErrors, setApproveServerErrors] = useState<Record<string, string>>({})
  const [rejectingProposal, setRejectingProposal] = useState<Proposal | null>(null)

  const createEntryMutation = useCreateEntry()
  const updateEntryMutation = useUpdateEntry()
  const deleteEntryMutation = useDeleteEntry()
  const approveProposalMutation = useApproveProposal()
  const rejectProposalMutation = useRejectProposal()

  function setActiveTab(tab: AdminTab) {
    const next = new URLSearchParams(searchParams)
    if (tab === 'technologies') {
      next.delete(TAB_PARAM)
    } else {
      next.set(TAB_PARAM, tab)
    }
    // Ephemeral UI navigation, not a back-button-worthy action -- same replace:true reasoning
    // Header.tsx's own search input already documents for itself.
    setSearchParams(next, { replace: true })
  }

  function openCreateForm() {
    setEditingEntry(null)
    setFormServerErrors({})
    setIsFormOpen(true)
  }

  function openEditForm(entry: Entry) {
    setEditingEntry(entry)
    setFormServerErrors({})
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setFormServerErrors({})
  }

  async function handleFormSubmit(request: EntryRequest) {
    try {
      if (editingEntry) {
        await updateEntryMutation.mutateAsync({ id: editingEntry.id, request })
        toast.showToast('success', `"${request.name}" updated`)
      } else {
        await createEntryMutation.mutateAsync(request)
        toast.showToast('success', `"${request.name}" created`)
      }
      closeForm()
    } catch (caught) {
      if (isUnauthorizedError(caught)) {
        closeForm()
        auth.logout()
        toast.showToast('error', 'Session expired — please log in again')
        return
      }
      if (caught instanceof ApiError && caught.status === 400 && caught.details) {
        setFormServerErrors(caught.details)
        return
      }
      if (caught instanceof ApiError && caught.status === 409) {
        setFormServerErrors({ name: caught.message })
        return
      }
      toast.showToast('error', editingEntry ? 'Failed to update entry' : 'Failed to create entry')
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingEntry) {
      return
    }
    const name = deletingEntry.name
    try {
      await deleteEntryMutation.mutateAsync(deletingEntry.id)
      setDeletingEntry(null)
      toast.showToast('success', `"${name}" deleted`)
    } catch (caught) {
      if (isUnauthorizedError(caught)) {
        setDeletingEntry(null)
        auth.logout()
        toast.showToast('error', 'Session expired — please log in again')
        return
      }
      toast.showToast('error', 'Failed to delete entry')
    }
  }

  function openApprove(proposal: Proposal) {
    setApproveServerErrors({})
    setApprovingProposal(proposal)
  }

  function closeApprove() {
    setApprovingProposal(null)
    setApproveServerErrors({})
  }

  async function handleApproveSubmit(overrides: ApproveProposalRequest) {
    if (!approvingProposal) {
      return
    }
    try {
      const result = await approveProposalMutation.mutateAsync({ id: approvingProposal.id, overrides })
      toast.showToast('success', `"${result.entry.name}" approved`)
      closeApprove()
    } catch (caught) {
      if (isUnauthorizedError(caught)) {
        closeApprove()
        auth.logout()
        toast.showToast('error', 'Session expired — please log in again')
        return
      }
      if (caught instanceof ApiError && caught.status === 409) {
        // Duplicate entry name (PROP-05) -- the proposal stays PENDING server-side, so the modal
        // stays open with the error on `name` exactly like EntryFormModal's own 409 handling.
        setApproveServerErrors({ name: caught.message })
        return
      }
      toast.showToast('error', 'Failed to approve suggestion')
    }
  }

  async function handleRejectConfirm() {
    if (!rejectingProposal) {
      return
    }
    const name = rejectingProposal.name
    try {
      await rejectProposalMutation.mutateAsync(rejectingProposal.id)
      setRejectingProposal(null)
      toast.showToast('success', `"${name}" rejected`)
    } catch (caught) {
      if (isUnauthorizedError(caught)) {
        setRejectingProposal(null)
        auth.logout()
        toast.showToast('error', 'Session expired — please log in again')
        return
      }
      toast.showToast('error', 'Failed to reject suggestion')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-b from-surface to-background px-6 py-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(249,115,22,0.55) 20%, rgba(249,115,22,0.55) 80%, transparent)',
            boxShadow: '0 0 8px rgba(249,115,22,0.35)',
          }}
        />
        <div>
          <h1 className="font-mono text-[24px] font-semibold leading-[1.15] text-foreground">Admin</h1>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">Manage Code.Hub Tech Radar entries</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="font-mono text-[13px] font-semibold text-muted transition-colors duration-200 hover:text-foreground"
          >
            View public radar
          </Link>
          <Button variant="primary" onClick={openCreateForm}>
            <Plus size={16} aria-hidden="true" />
            Add technology
          </Button>
          {/* Spatially separated from the entry-management actions above via a divider -- a
              session action, not a content action (03-CONTEXT.md's header spec). */}
          <div className="ml-1 flex items-center border-l border-border pl-4">
            <Button variant="secondary" onClick={() => auth.logout()}>
              <LogOut size={16} aria-hidden="true" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div role="tablist" aria-label="Admin sections" className="mb-6 flex gap-2 border-b border-border">
          <button
            type="button"
            role="tab"
            id="admin-tab-technologies"
            aria-selected={activeTab === 'technologies'}
            aria-controls="admin-tabpanel-technologies"
            onClick={() => setActiveTab('technologies')}
            className={tabButtonClass(activeTab === 'technologies')}
          >
            Technologies
          </button>
          <button
            type="button"
            role="tab"
            id="admin-tab-proposals"
            aria-selected={activeTab === 'proposals'}
            aria-controls="admin-tabpanel-proposals"
            aria-label={pendingCount > 0 ? `Proposals, ${pendingCount} pending` : 'Proposals'}
            onClick={() => setActiveTab('proposals')}
            className={tabButtonClass(activeTab === 'proposals')}
          >
            <span aria-hidden="true">Proposals</span>
            {pendingCount > 0 ? (
              <span
                aria-hidden="true"
                className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent"
              >
                {pendingCount}
              </span>
            ) : null}
          </button>
        </div>
        <div
          role="tabpanel"
          id="admin-tabpanel-technologies"
          aria-labelledby="admin-tab-technologies"
          hidden={activeTab !== 'technologies'}
        >
          {isError ? (
            <ErrorState
              heading="Couldn't load entries"
              body="Something went wrong fetching the latest data. Check your connection and try again."
              onRetry={() => refetch()}
            />
          ) : isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: LOADING_ROW_COUNT }, (_, index) => (
                <Skeleton key={index} shape="rect" width="100%" height={44} />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              heading="No entries yet"
              body="Add the first technology to get the radar started."
              action={{ label: 'Add technology', onClick: openCreateForm }}
            />
          ) : (
            <EntryTable entries={entries} onEdit={openEditForm} onDeleteRequest={setDeletingEntry} />
          )}
        </div>
        <div
          role="tabpanel"
          id="admin-tabpanel-proposals"
          aria-labelledby="admin-tab-proposals"
          hidden={activeTab !== 'proposals'}
        >
          <ProposalsTab
            proposals={pendingProposals}
            isPending={proposalsPending}
            isError={proposalsError}
            onRetry={() => refetchProposals()}
            onApprove={openApprove}
            onReject={setRejectingProposal}
          />
        </div>
      </main>
      <EntryFormModal
        isOpen={isFormOpen}
        mode={editingEntry ? 'edit' : 'create'}
        initialEntry={editingEntry}
        isSubmitting={createEntryMutation.isPending || updateEntryMutation.isPending}
        serverErrors={formServerErrors}
        onSubmit={handleFormSubmit}
        onClose={closeForm}
      />
      <ConfirmDialog
        isOpen={deletingEntry !== null}
        entryName={deletingEntry?.name ?? ''}
        isPending={deleteEntryMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingEntry(null)}
      />
      <ApproveProposalModal
        isOpen={approvingProposal !== null}
        proposal={approvingProposal}
        isSubmitting={approveProposalMutation.isPending}
        serverErrors={approveServerErrors}
        onSubmit={handleApproveSubmit}
        onClose={closeApprove}
      />
      <ConfirmDialog
        isOpen={rejectingProposal !== null}
        entryName={rejectingProposal?.name ?? ''}
        title={rejectingProposal ? `Reject '${rejectingProposal.name}'?` : undefined}
        confirmLabel="Reject"
        isPending={rejectProposalMutation.isPending}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectingProposal(null)}
      />
    </div>
  )
}
