import { describe, expect, it } from 'vitest'
import { NAME_MAX_LENGTH, SUBMITTER_NAME_MAX_LENGTH, validateProposalForm } from './proposalFormValidation'

describe('validateProposalForm', () => {
  it('returns no errors for valid fields', () => {
    expect(
      validateProposalForm({ name: 'Ktor Client', description: 'A lightweight HTTP client.', submitterName: '' }),
    ).toEqual({})
  })

  it('requires a non-blank name', () => {
    expect(validateProposalForm({ name: '', description: 'Valid', submitterName: '' })).toEqual({
      name: 'Name is required',
    })
    expect(validateProposalForm({ name: '   ', description: 'Valid', submitterName: '' })).toEqual({
      name: 'Name is required',
    })
  })

  it('rejects a name longer than 100 characters', () => {
    const longName = 'a'.repeat(NAME_MAX_LENGTH + 1)

    expect(validateProposalForm({ name: longName, description: 'Valid', submitterName: '' })).toEqual({
      name: 'Name must be 100 characters or fewer',
    })
  })

  it('accepts a name exactly at the 100 character limit', () => {
    const maxName = 'a'.repeat(NAME_MAX_LENGTH)

    expect(validateProposalForm({ name: maxName, description: 'Valid', submitterName: '' })).toEqual({})
  })

  it('requires a non-blank description', () => {
    expect(validateProposalForm({ name: 'Ktor Client', description: '', submitterName: '' })).toEqual({
      description: 'Description is required',
    })
  })

  it('allows a blank submitter name (optional field)', () => {
    expect(validateProposalForm({ name: 'Ktor Client', description: 'Valid', submitterName: '' })).toEqual({})
  })

  it('rejects a submitter name longer than 100 characters', () => {
    const longSubmitter = 'a'.repeat(SUBMITTER_NAME_MAX_LENGTH + 1)

    expect(validateProposalForm({ name: 'Ktor Client', description: 'Valid', submitterName: longSubmitter })).toEqual({
      submitterName: 'Submitter name must be 100 characters or fewer',
    })
  })

  it('reports every error at once when all fields are invalid', () => {
    const longSubmitter = 'a'.repeat(SUBMITTER_NAME_MAX_LENGTH + 1)

    expect(validateProposalForm({ name: '', description: '', submitterName: longSubmitter })).toEqual({
      name: 'Name is required',
      description: 'Description is required',
      submitterName: 'Submitter name must be 100 characters or fewer',
    })
  })
})
