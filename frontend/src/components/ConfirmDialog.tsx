// Delete-confirmation dialog built on Modal, and (via the optional title/body/confirmLabel
// overrides below) also AdminPage's reject-proposal confirmation (PROP-04) -- same "irreversible
// action behind one more click" shape, different copy. Every override defaults to the exact
// original delete-specific value, so every existing call site (and ConfirmDialog.test.tsx's
// existing assertions) is byte-identical when it passes none of them. Focus defaults to Cancel
// (never the confirm action) so a keyboard user pressing Enter immediately after the dialog
// opens can never accidentally confirm a destructive action.
import { useRef } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  entryName: string
  isPending?: boolean
  /** Overrides the default "Delete '{entryName}'?" title -- e.g. "Reject '{proposal.name}'?". */
  title?: string
  body?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  entryName,
  isPending = false,
  title,
  body = "This can't be undone.",
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title ?? `Delete '${entryName}'?`} initialFocusRef={cancelRef}>
      <p className="text-[16px] leading-[1.5] text-muted">{body}</p>
      <div className="flex justify-end gap-3 pt-2">
        <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} isLoading={isPending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
