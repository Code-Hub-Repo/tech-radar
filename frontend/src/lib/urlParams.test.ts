import { describe, expect, it } from 'vitest'
import { filterStateFromParams, paramsFromPatch } from './urlParams'
import type { FilterState } from '../api/types'

const DEFAULT_STATE: FilterState = {
  quadrants: [],
  rings: [],
  newOnly: false,
  query: '',
  selectedEntryId: null,
}

describe('filterStateFromParams', () => {
  it('parses defaults from an empty URLSearchParams', () => {
    expect(filterStateFromParams(new URLSearchParams())).toEqual(DEFAULT_STATE)
  })

  it('parses kebab-case quadrant/ring slugs, including the multi-word languages-frameworks', () => {
    const params = new URLSearchParams('quadrant=languages-frameworks,tools&ring=adopt,trial')
    const state = filterStateFromParams(params)
    expect(state.quadrants).toEqual(['LANGUAGES_FRAMEWORKS', 'TOOLS'])
    expect(state.rings).toEqual(['ADOPT', 'TRIAL'])
  })

  it('drops unknown quadrant/ring slugs instead of throwing', () => {
    const params = new URLSearchParams('quadrant=languages-frameworks,not-a-real-quadrant&ring=bogus')
    const state = filterStateFromParams(params)
    expect(state.quadrants).toEqual(['LANGUAGES_FRAMEWORKS'])
    expect(state.rings).toEqual([])
  })

  it('parses new=true and q into newOnly/query', () => {
    const params = new URLSearchParams('new=true&q=kotlin')
    const state = filterStateFromParams(params)
    expect(state.newOnly).toBe(true)
    expect(state.query).toBe('kotlin')
  })

  it('treats a missing new param as newOnly=false (only the literal "true" enables it)', () => {
    expect(filterStateFromParams(new URLSearchParams('new=1')).newOnly).toBe(false)
    expect(filterStateFromParams(new URLSearchParams()).newOnly).toBe(false)
  })

  it('treats a non-integer entry param as no selection, never throwing', () => {
    expect(filterStateFromParams(new URLSearchParams('entry=not-a-number')).selectedEntryId).toBeNull()
    expect(filterStateFromParams(new URLSearchParams('entry=12.5')).selectedEntryId).toBeNull()
    expect(filterStateFromParams(new URLSearchParams('entry=')).selectedEntryId).toBeNull()
  })

  it('parses a valid integer entry param', () => {
    expect(filterStateFromParams(new URLSearchParams('entry=12')).selectedEntryId).toBe(12)
  })
})

describe('paramsFromPatch', () => {
  it('round-trips a full FilterState through paramsFromPatch and filterStateFromParams', () => {
    const state: FilterState = {
      quadrants: ['LANGUAGES_FRAMEWORKS', 'TOOLS'],
      rings: ['ADOPT'],
      newOnly: true,
      query: 'kotlin',
      selectedEntryId: 12,
    }
    const params = paramsFromPatch(new URLSearchParams(), state)
    expect(filterStateFromParams(params)).toEqual(state)
  })

  it('serializes multi-word quadrants as kebab-case slugs (languages-frameworks)', () => {
    const params = paramsFromPatch(new URLSearchParams(), { quadrants: ['LANGUAGES_FRAMEWORKS'] })
    expect(params.get('quadrant')).toBe('languages-frameworks')
  })

  it('produces empty params at defaults -- clean root URL, never ?quadrant=&ring=', () => {
    const params = paramsFromPatch(new URLSearchParams('quadrant=tools&ring=adopt'), DEFAULT_STATE)
    expect(params.toString()).toBe('')
  })

  it('preserves fields not present in the patch', () => {
    const prev = paramsFromPatch(new URLSearchParams(), { rings: ['ADOPT'], query: 'kotlin' })
    const next = paramsFromPatch(prev, { newOnly: true })
    const state = filterStateFromParams(next)
    expect(state.rings).toEqual(['ADOPT'])
    expect(state.query).toBe('kotlin')
    expect(state.newOnly).toBe(true)
  })

  it('omits the entry param when selectedEntryId is patched back to null', () => {
    const prev = paramsFromPatch(new URLSearchParams(), { selectedEntryId: 5 })
    expect(prev.get('entry')).toBe('5')
    const next = paramsFromPatch(prev, { selectedEntryId: null })
    expect(next.get('entry')).toBeNull()
  })
})
