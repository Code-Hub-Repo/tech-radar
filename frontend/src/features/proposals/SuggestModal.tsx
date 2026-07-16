// Public "Suggest a technology" form (PROP-01) -- Header opens this modal. Mirrors
// EntryFormModal's blur-validation/server-error-dismissal shape (lib/proposalFormValidation.ts
// mirrors ProposalValidator's own messages) plus three things EntryFormModal never needs: an
// optional submitterName field, a visually-hidden honeypot that fakes success without ever
// calling the API, and a 429-aware general error banner for the public rate limiter
// (CONTEXT.md: 5 requests/15min per remote address).
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { ApiError } from '../../api/client'
import { useSubmitProposal } from '../../api/hooks'
import type { ProposalRequest, Quadrant, Ring } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { QUADRANT_ORDER, RING_ORDER } from '../../lib/entryOrder'
import { validateProposalForm } from '../../lib/proposalFormValidation'

interface SuggestModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FormFields {
  name: string
  quadrant: Quadrant
  ring: Ring
  description: string
  submitterName: string
}

const EMPTY_FIELDS: FormFields = {
  name: '',
  quadrant: QUADRANT_ORDER[0],
  ring: RING_ORDER[0],
  description: '',
  submitterName: '',
}

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-[16px] text-foreground placeholder:text-muted transition-colors duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.25)] focus:outline-none'

const RATE_LIMITED_MESSAGE = "We've received a lot of suggestions — please try again in a few minutes."
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export function SuggestModal({ isOpen, onClose }: SuggestModalProps) {
  const nameId = useId()
  const quadrantId = useId()
  const ringId = useId()
  const descriptionId = useId()
  const submitterNameId = useId()
  const honeypotId = useId()

  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS)
  const [honeypot, setHoneypot] = useState('')
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [dismissedServerFields, setDismissedServerFields] = useState<Set<string>>(new Set())
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const submitMutation = useSubmitProposal()

  // Resets every field/state slice each time the modal opens (or closes) -- the "adjust state
  // while rendering" pattern EntryFormModal/DetailPanel already established in this codebase
  // (Modal itself never unmounts this component while merely hidden), so a second suggestion
  // never starts pre-filled with the previous one's values or stuck on the thank-you state.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    setFields(EMPTY_FIELDS)
    setHoneypot('')
    setTouched({})
    setHasAttemptedSubmit(false)
    setServerErrors({})
    setDismissedServerFields(new Set())
    setGeneralError(null)
    setIsSubmitted(false)
  }

  const localErrors = validateProposalForm(fields)

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
    setServerErrors({})
    setDismissedServerFields(new Set())
    setGeneralError(null)
    if (Object.keys(localErrors).length > 0) {
      return
    }

    // Honeypot: a bot that filled this hidden field gets a fake success with no network call at
    // all -- indistinguishable from a real submission from its own point of view, but the
    // backend (and its rate limiter) never sees the request. Never triggered by a real user: the
    // field is visually hidden, out of the Tab order, and autoComplete="off".
    if (honeypot !== '') {
      setIsSubmitted(true)
      return
    }

    const request: ProposalRequest = {
      name: fields.name,
      quadrant: fields.quadrant,
      ring: fields.ring,
      description: fields.description,
      ...(fields.submitterName.trim() !== '' ? { submitterName: fields.submitterName.trim() } : {}),
    }

    submitMutation.mutate(request, {
      onSuccess: () => setIsSubmitted(true),
      onError: (caught) => {
        if (caught instanceof ApiError && caught.status === 400 && caught.details) {
          setServerErrors(caught.details)
          return
        }
        if (caught instanceof ApiError && caught.status === 429) {
          setGeneralError(RATE_LIMITED_MESSAGE)
          return
        }
        setGeneralError(GENERIC_ERROR_MESSAGE)
      },
    })
  }

  const nameError = fieldError('name')
  const descriptionError = fieldError('description')
  const submitterNameError = fieldError('submitterName')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Suggest a technology">
      {isSubmitted ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 aria-hidden="true" size={24} />
          </span>
          <p className="text-[16px] leading-[1.5] text-foreground">Thanks — the Code.Hub team will review it.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Honeypot -- visually hidden (not aria-hidden, so a screen reader that lands on it
              via element-by-element browsing still hears the "leave blank" instruction) and
              removed from the Tab sequence so a sighted keyboard user never lands on it either. */}
          <div className="sr-only">
            <label htmlFor={honeypotId}>Leave this field blank</label>
            <input
              id={honeypotId}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>
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
                Where do you think it belongs?
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
              What is it, and why should Code.Hub look at it?
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor={submitterNameId} className="font-mono text-[13px] font-semibold text-muted">
              Your name (optional)
            </label>
            <input
              id={submitterNameId}
              value={fields.submitterName}
              onChange={(event) => updateField('submitterName', event.target.value)}
              onBlur={() => handleBlur('submitterName')}
              maxLength={100}
              aria-invalid={submitterNameError !== undefined}
              aria-describedby={submitterNameError ? `${submitterNameId}-error` : undefined}
              className={FIELD_CLASS}
            />
            {submitterNameError ? (
              <p id={`${submitterNameId}-error`} className="text-[13px] leading-[1.4] text-destructive">
                {submitterNameError}
              </p>
            ) : null}
          </div>
          {generalError ? (
            <p role="alert" className="text-[14px] leading-[1.4] text-destructive">
              {generalError}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitMutation.isPending}>
              Submit suggestion
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
