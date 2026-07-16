// Admin approve-with-edit form (PROP-03) -- opened from ProposalsTab's Approve action. Reuses
// EntryFormModal's exact field shape and blur-validation rules (lib/entryFormValidation --
// approve's overrides are name/quadrant/ring/description, identical to an entry's own writable
// fields) but is its own thin component rather than a reuse of EntryFormModal: this flow also
// shows read-only submitter/date context EntryFormModal has no concept of, and submits to the
// approve endpoint (all four fields as explicit overrides) instead of createEntry/updateEntry --
// see 05-CONTEXT.md's "reuse EntryFormModal if clean, else a thin ApproveModal" guidance.
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { ApproveProposalRequest, Proposal, Quadrant, Ring } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { validateEntryForm } from '../../lib/entryFormValidation'
import { QUADRANT_ORDER, RING_ORDER } from '../../lib/entryOrder'

interface ApproveProposalModalProps {
  isOpen: boolean
  proposal: Proposal | null
  isSubmitting: boolean
  /** Field-level errors from the last failed approve attempt -- a 409 duplicate-name is mapped
      onto `name` by the caller (AdminPage), same convention as EntryFormModal's serverErrors. */
  serverErrors: Record<string, string>
  onSubmit: (overrides: ApproveProposalRequest) => void
  onClose: () => void
}

interface FormFields {
  name: string
  quadrant: Quadrant
  ring: Ring
  description: string
}

const EMPTY_FIELDS: FormFields = {
  name: '',
  quadrant: QUADRANT_ORDER[0],
  ring: RING_ORDER[0],
  description: '',
}

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-[16px] text-foreground placeholder:text-muted transition-colors duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.25)] focus:outline-none'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function fieldsFromProposal(proposal: Proposal | null): FormFields {
  if (!proposal) {
    return EMPTY_FIELDS
  }
  return { name: proposal.name, quadrant: proposal.quadrant, ring: proposal.ring, description: proposal.description }
}

export function ApproveProposalModal({
  isOpen,
  proposal,
  isSubmitting,
  serverErrors,
  onSubmit,
  onClose,
}: ApproveProposalModalProps) {
  const nameId = useId()
  const quadrantId = useId()
  const ringId = useId()
  const descriptionId = useId()

  const [fields, setFields] = useState<FormFields>(() => fieldsFromProposal(proposal))
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [dismissedServerFields, setDismissedServerFields] = useState<Set<string>>(new Set())

  // Resets whenever a different proposal is opened (or the modal re-opens) -- the same "adjust
  // state while rendering" pattern EntryFormModal established with its own formKey/prevFormKey.
  const formKey = isOpen ? (proposal?.id ?? null) : null
  const [prevFormKey, setPrevFormKey] = useState<number | null>(null)
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey)
    setFields(fieldsFromProposal(proposal))
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

  if (!proposal) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review "${proposal.name}"`}>
      <p className="-mt-2 font-mono text-[13px] leading-[1.4] text-muted">
        Suggested by {proposal.submitterName ?? 'Anonymous'} · {DATE_FORMATTER.format(new Date(proposal.createdAt))}
      </p>
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
        <p className="font-mono text-[12px] leading-[1.4] text-muted">
          Approved suggestions are automatically flagged as New on the radar.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Approve
          </Button>
        </div>
      </form>
    </Modal>
  )
}
