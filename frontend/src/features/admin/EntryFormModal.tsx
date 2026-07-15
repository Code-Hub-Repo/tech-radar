// Create-and-edit form (ADMN-04/05), one modal for both modes. isNew is deliberately NOT a form
// field here: backend/core_api's EntryRequest (the frozen POST/PUT body) has no isNew property
// at all -- a mass-assignment guard by design (EntryRequest.kt's own header comment; confirmed
// against EntryValidator/NewEntry/EntryUpdate/EntriesWriteRoutes.kt, none of which accept or
// touch it on write). A checkbox here would submit a value the backend silently ignores --
// isNew stays a read-only, server-computed column in EntryTable instead (true on create, never
// altered by an update).
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Entry, EntryRequest, Quadrant, Ring } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { QUADRANT_ORDER, RING_ORDER } from '../../lib/entryOrder'
import { validateEntryForm } from '../../lib/entryFormValidation'

interface EntryFormModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  initialEntry: Entry | null
  isSubmitting: boolean
  /** Field-level errors from the last failed submission (400 `details`, or a 409 duplicate-name
      mapped onto `name`) -- reset by the caller each time the modal opens. */
  serverErrors: Record<string, string>
  onSubmit: (request: EntryRequest) => void
  onClose: () => void
}

interface FormFields {
  name: string
  quadrant: Quadrant
  ring: Ring
  description: string
}

type FormKey = number | 'create' | null

const EMPTY_FIELDS: FormFields = {
  name: '',
  quadrant: QUADRANT_ORDER[0],
  ring: RING_ORDER[0],
  description: '',
}

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-[16px] text-foreground placeholder:text-muted transition-colors duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.25)] focus:outline-none'

function fieldsFromEntry(entry: Entry | null): FormFields {
  if (!entry) {
    return EMPTY_FIELDS
  }
  return { name: entry.name, quadrant: entry.quadrant, ring: entry.ring, description: entry.description }
}

export function EntryFormModal({
  isOpen,
  mode,
  initialEntry,
  isSubmitting,
  serverErrors,
  onSubmit,
  onClose,
}: EntryFormModalProps) {
  const nameId = useId()
  const quadrantId = useId()
  const ringId = useId()
  const descriptionId = useId()

  const [fields, setFields] = useState<FormFields>(() => fieldsFromEntry(initialEntry))
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  // Once the admin edits a field that has a server error attached (e.g. fixing a duplicate
  // name), that specific error is dismissed immediately rather than lingering until the next
  // submit -- re-armed on every fresh submit attempt so a still-duplicate name shows the error
  // again.
  const [dismissedServerFields, setDismissedServerFields] = useState<Set<string>>(new Set())

  // Resets all local state whenever the modal opens for a different entry (or a fresh create
  // after a previous edit) -- the "adjust state while rendering" pattern DetailPanel.tsx's
  // openKey/prevOpenKey tracking and SearchInput.tsx's value/prevValue tracking already
  // established in this codebase, avoiding an extra render/commit/effect cycle.
  const formKey: FormKey = isOpen ? (initialEntry?.id ?? 'create') : null
  const [prevFormKey, setPrevFormKey] = useState<FormKey>(null)
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey)
    setFields(fieldsFromEntry(initialEntry))
    setTouched({})
    setHasAttemptedSubmit(false)
    setDismissedServerFields(new Set())
  }

  const localErrors = validateEntryForm(fields)

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
    if (serverErrors[key]) {
      setDismissedServerFields((current) => new Set(current).add(key))
    }
  }

  function handleBlur(field: keyof FormFields) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  function fieldError(field: keyof FormFields): string | undefined {
    // Server errors show immediately, independent of the touched/hasAttemptedSubmit gate below --
    // their mere presence already means a submit was attempted and failed server-side (a 409
    // duplicate-name, for instance, is unreachable by local validation alone). Dismissed the
    // moment the field is edited (updateField above), re-armed on the next submit attempt.
    if (!dismissedServerFields.has(field) && serverErrors[field]) {
      return serverErrors[field]
    }
    if (!(hasAttemptedSubmit || touched[field])) {
      return undefined
    }
    return localErrors[field]
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    setDismissedServerFields(new Set())
    if (Object.keys(localErrors).length > 0) {
      return
    }
    onSubmit({ name: fields.name, quadrant: fields.quadrant, ring: fields.ring, description: fields.description })
  }

  const nameError = fieldError('name')
  const descriptionError = fieldError('description')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add technology' : `Edit ${initialEntry?.name ?? ''}`}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="font-mono text-[13px] font-semibold text-muted">
            Name
          </label>
          <input
            id={nameId}
            value={fields.name}
            onChange={(event) => updateField('name', event.target.value)}
            onBlur={() => handleBlur('name')}
            maxLength={100}
            aria-invalid={nameError !== undefined}
            aria-describedby={nameError ? `${nameId}-error` : undefined}
            className={FIELD_CLASS}
          />
          {nameError ? (
            <p id={`${nameId}-error`} className="text-[13px] leading-[1.4] text-destructive">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={quadrantId} className="font-mono text-[13px] font-semibold text-muted">
              Quadrant
            </label>
            <select
              id={quadrantId}
              value={fields.quadrant}
              onChange={(event) => updateField('quadrant', event.target.value as Quadrant)}
              className={FIELD_CLASS}
            >
              {QUADRANT_ORDER.map((quadrant) => (
                <option key={quadrant} value={quadrant}>
                  {quadrantLabel[quadrant]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ringId} className="font-mono text-[13px] font-semibold text-muted">
              Ring
            </label>
            <select
              id={ringId}
              value={fields.ring}
              onChange={(event) => updateField('ring', event.target.value as Ring)}
              className={FIELD_CLASS}
            >
              {RING_ORDER.map((ring) => (
                <option key={ring} value={ring}>
                  {ringLabel[ring]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={descriptionId} className="font-mono text-[13px] font-semibold text-muted">
            Description
          </label>
          <textarea
            id={descriptionId}
            value={fields.description}
            onChange={(event) => updateField('description', event.target.value)}
            onBlur={() => handleBlur('description')}
            rows={4}
            aria-invalid={descriptionError !== undefined}
            aria-describedby={descriptionError ? `${descriptionId}-error` : undefined}
            className={`${FIELD_CLASS} resize-y`}
          />
          {descriptionError ? (
            <p id={`${descriptionId}-error`} className="text-[13px] leading-[1.4] text-destructive">
              {descriptionError}
            </p>
          ) : null}
        </div>
        {mode === 'create' ? (
          <p className="font-mono text-[12px] leading-[1.4] text-muted">
            New entries are automatically flagged as New on the radar.
          </p>
        ) : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {mode === 'create' ? 'Add technology' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
