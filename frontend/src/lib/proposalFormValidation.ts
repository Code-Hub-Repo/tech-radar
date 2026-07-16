// Pure client-side validation for SuggestModal/ApproveProposalModal, mirroring the backend's own
// ProposalValidator messages exactly (backend/core_usecases/.../ProposalValidator.kt) so a field
// error reads identically whether it was caught locally on blur or returned by a 400 the client
// couldn't have predicted. Name/description rules match entryFormValidation.ts's entry rules
// byte-for-byte (CONTEXT.md: "validation identical to entries") -- kept as its own file rather
// than a shared import because submitterName's own length rule has no entry-side equivalent.
export const NAME_MAX_LENGTH = 100
export const SUBMITTER_NAME_MAX_LENGTH = 100

export interface ProposalFormFields {
  name: string
  description: string
  submitterName: string
}

export function validateProposalForm(fields: ProposalFormFields): Record<string, string> {
  const errors: Record<string, string> = {}

  if (fields.name.trim() === '') {
    errors.name = 'Name is required'
  } else if (fields.name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer`
  }

  if (fields.description.trim() === '') {
    errors.description = 'Description is required'
  }

  if (fields.submitterName.length > SUBMITTER_NAME_MAX_LENGTH) {
    errors.submitterName = `Submitter name must be ${SUBMITTER_NAME_MAX_LENGTH} characters or fewer`
  }

  return errors
}
