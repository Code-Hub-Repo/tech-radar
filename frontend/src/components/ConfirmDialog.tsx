// Delete-confirmation dialog built on Modal. Focus defaults to Cancel (never Delete) so a
// keyboard user pressing Enter immediately after the dialog opens can never accidentally
// confirm a destructive action.
import { useRef } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  entryName: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ isOpen, entryName, isPending = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={`Delete '${entryName}'?`} initialFocusRef={cancelRef}>
      <p className="text-[16px] leading-[1.5] text-muted">This can't be undone.</p>
      <div className="flex justify-end gap-3 pt-2">
        <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} isLoading={isPending}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
