// Thin wrapper around the Clipboard API (SHRE-01) so DetailPanel's copy-link button has one
// pure, testable async boundary instead of calling navigator.clipboard directly -- tests mock
// this module's own dependency (navigator.clipboard), not a DOM API happy-dom doesn't implement.
// Returns false (never throws) on any failure -- an unavailable API, a denied permission, or a
// rejected write are all just "couldn't copy" to the caller, which shows one fallback message
// for all of them rather than surfacing raw browser error text.
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
