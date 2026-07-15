// Pure client-side validation for EntryFormModal (ADMN-04/05), mirroring the backend's own
// EntryValidator messages exactly (backend/core_usecases/.../EntryValidator.kt) so a field error
// reads identically whether it was caught locally on blur or returned by a 400 the client
// couldn't have predicted.
export const NAME_MAX_LENGTH = 100

export interface EntryFormFields {
  name: string
  description: string
}

export function validateEntryForm(fields: EntryFormFields): Record<string, string> {
  const errors: Record<string, string> = {}

  if (fields.name.trim() === '') {
    errors.name = 'Name is required'
  } else if (fields.name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer`
  }

  if (fields.description.trim() === '') {
    errors.description = 'Description is required'
  }

  return errors
}
