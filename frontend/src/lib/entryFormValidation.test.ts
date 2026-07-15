import { describe, expect, it } from 'vitest'
import { NAME_MAX_LENGTH, validateEntryForm } from './entryFormValidation'

describe('validateEntryForm', () => {
  it('returns no errors for valid fields', () => {
    expect(validateEntryForm({ name: 'Kotlin', description: 'A pragmatic language.' })).toEqual({})
  })

  it('requires a non-blank name', () => {
    expect(validateEntryForm({ name: '', description: 'Valid' })).toEqual({ name: 'Name is required' })
    expect(validateEntryForm({ name: '   ', description: 'Valid' })).toEqual({ name: 'Name is required' })
  })

  it('rejects a name longer than 100 characters', () => {
    const longName = 'a'.repeat(NAME_MAX_LENGTH + 1)

    expect(validateEntryForm({ name: longName, description: 'Valid' })).toEqual({
      name: 'Name must be 100 characters or fewer',
    })
  })

  it('accepts a name exactly at the 100 character limit', () => {
    const maxName = 'a'.repeat(NAME_MAX_LENGTH)

    expect(validateEntryForm({ name: maxName, description: 'Valid' })).toEqual({})
  })

  it('requires a non-blank description', () => {
    expect(validateEntryForm({ name: 'Kotlin', description: '' })).toEqual({
      description: 'Description is required',
    })
  })

  it('reports both errors at once when both fields are invalid', () => {
    expect(validateEntryForm({ name: '', description: '' })).toEqual({
      name: 'Name is required',
      description: 'Description is required',
    })
  })
})
