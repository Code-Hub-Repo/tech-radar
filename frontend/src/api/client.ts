import type { ApiErrorEnvelope, Entry, EntryRequest, LoginResult } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function fetchEntries(): Promise<Entry[]> {
  const res = await fetch(`${API_BASE_URL}/api/entries`)
  if (!res.ok) throw new Error(`Failed to fetch entries: ${res.status}`)
  return res.json()
}

// Carries the HTTP status (and, when the response body parsed as the backend's JSON error
// envelope, its code/message/details) so callers can distinguish 401 (session expired --
// isUnauthorizedError below), 400/409 (map onto form fields via `details`), and everything else
// without re-parsing the response themselves.
export class ApiError extends Error {
  status: number
  code?: string
  details?: Record<string, string> | null

  constructor(status: number, message: string, code?: string, details?: Record<string, string> | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// A 401 from ANY admin mutation means the token is missing/expired/invalid — the single check
// RequireAuth-guarded pages use to trigger clear-token-and-redirect (ADMN-02).
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

// Every non-2xx admin write goes through this. The backend's own JSON envelope
// ({error:{code,message,details}}) covers 400/401/404/409/500, but Ktor's built-in RateLimit
// plugin (429, login only) returns an empty text/plain body — res.json() is wrapped so that
// falls back to a status-keyed message instead of throwing an unrelated SyntaxError that would
// mask the real status.
async function parseApiError(res: Response): Promise<ApiError> {
  let body: ApiErrorEnvelope | null = null
  try {
    body = await res.json()
  } catch {
    // res.json() failed to parse (e.g. Ktor's empty-body 429) -- body stays null, handled below.
  }
  if (body?.error) {
    return new ApiError(res.status, body.error.message, body.error.code, body.error.details)
  }
  if (res.status === 429) {
    return new ApiError(res.status, 'Too many attempts, try again shortly')
  }
  return new ApiError(res.status, `Request failed: ${res.status}`)
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json()
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export async function createEntry(token: string, request: EntryRequest): Promise<Entry> {
  const res = await fetch(`${API_BASE_URL}/api/entries`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json()
}

export async function updateEntry(token: string, id: number, request: EntryRequest): Promise<Entry> {
  const res = await fetch(`${API_BASE_URL}/api/entries/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return res.json()
}

export async function deleteEntry(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/entries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    throw await parseApiError(res)
  }
}
