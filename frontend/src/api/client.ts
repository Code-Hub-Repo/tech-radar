import type { Entry } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function fetchEntries(): Promise<Entry[]> {
  const res = await fetch(`${API_BASE_URL}/api/entries`)
  if (!res.ok) throw new Error(`Failed to fetch entries: ${res.status}`)
  return res.json()
}
