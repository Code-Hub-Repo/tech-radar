import { afterEach, describe, expect, it } from 'vitest'
import { isIntroDismissed, setIntroDismissed } from './introDismissal'

const KEY = 'techradar.introDismissed'

afterEach(() => {
  window.localStorage.clear()
})

describe('introDismissal', () => {
  it('is not dismissed by default (first-ever visit)', () => {
    expect(isIntroDismissed()).toBe(false)
  })

  it('reports dismissed after setIntroDismissed() persists the flag', () => {
    setIntroDismissed()

    expect(isIntroDismissed()).toBe(true)
    expect(window.localStorage.getItem(KEY)).toBe('true')
  })

  it('ignores an unrelated or malformed stored value', () => {
    window.localStorage.setItem(KEY, 'nonsense')

    expect(isIntroDismissed()).toBe(false)
  })
})
