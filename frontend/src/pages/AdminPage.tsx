// /admin (ADMN-02, guarded by RequireAuth in main.tsx). Header carries the admin identity +
// entry-management actions (Add technology) with Logout visually/spatially separated from them
// via a divider (03-CONTEXT.md's header spec: a session action reads differently from a content
// action) -- matches Header.tsx's own gradient/accent-underline treatment so the admin panel
// reads as the same product, not a bolted-on form.
//
// Owns every admin mutation call site (not EntryTable/EntryFormModal/ConfirmDialog themselves)
// so the 401-logout+redirect and 400/409-vs-toast branching lives in exactly one place: a 401
// from ANY of create/update/delete logs out (RequireAuth then redirects on the next render,
// ADMN-02); a 400 with field `details` or a 409 duplicate-name populates the form's inline
// errors instead of a toast (the field error already says what's wrong); everything else is a
// generic error toast. Every mutation invalidates ['entries'] on success (api/hooks.ts), which is
// what makes the public radar and this table both reflect the change on their next render
// (ADMN-07's live-integration proof).
import { useState } from 'react'
import { Link } from 'react-router'
import { LogOut, Plus } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { ApiError, isUnauthorizedError } from '../api/client'
import { useCreateEntry, useDeleteEntry, useEntries, useUpdateEntry } from '../api/hooks'
import type { Entry, EntryRequest } from '../api/types'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../components/ToastContext'
import { EntryFormModal } from '../features/admin/EntryFormModal'
import { EntryTable } from '../features/admin/EntryTable'

const LOADING_ROW_COUNT = 5

export function AdminPage() {
  const auth = useAuth()
  const toast = useToast()
  const { data, isPending, isError, refetch } = useEntries()
  const entries = data ?? []

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [formServerErrors, setFormServerErrors] = useState<Record<string, string>>({})
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null)

  const createEntryMutation = useCreateEntry()
  const updateEntryMutation = useUpdateEntry()
  const deleteEntryMutation = useDeleteEntry()

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
    </div>
  )
}
