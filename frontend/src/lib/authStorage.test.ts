import { afterEach, describe, expect, it } from 'vitest'
import { clearStoredToken, getStoredToken, isTokenExpired, setStoredToken } from './authStorage'

const TOKEN_KEY = 'techradar.token'
const EXPIRES_AT_KEY = 'techradar.tokenExpiresAt'

afterEach(() => {
  window.localStorage.clear()
})

describe('authStorage', () => {
  it('returns null when nothing is stored', () => {
    expect(getStoredToken()).toBeNull()
  })

  it('round-trips a token and its expiry through setStoredToken/getStoredToken', () => {
    setStoredToken('jwt-value', '2026-07-15T18:00:00.000Z')

    expect(getStoredToken()).toEqual({ token: 'jwt-value', expiresAt: '2026-07-15T18:00:00.000Z' })
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('jwt-value')
    expect(window.localStorage.getItem(EXPIRES_AT_KEY)).toBe('2026-07-15T18:00:00.000Z')
  })

  it('clearStoredToken removes both keys', () => {
    setStoredToken('jwt-value', '2026-07-15T18:00:00.000Z')

    clearStoredToken()

    expect(getStoredToken()).toBeNull()
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(window.localStorage.getItem(EXPIRES_AT_KEY)).toBeNull()
  })

  it('treats a partially-written pair (token without expiry) as absent', () => {
    window.localStorage.setItem(TOKEN_KEY, 'jwt-value')

    expect(getStoredToken()).toBeNull()
  })

  it('isTokenExpired is true for a past timestamp and false for a future one', () => {
    expect(isTokenExpired('2020-01-01T00:00:00.000Z')).toBe(true)
    expect(isTokenExpired('2099-01-01T00:00:00.000Z')).toBe(false)
  })
})
