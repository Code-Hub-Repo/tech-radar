// RTL coverage for DetailPanel's focus management, Escape/close behavior, sheet-vs-panel
// presentation split (aria-modal, scrim, focus trap), history timeline, and copy-link (05-02).
// The panel variant's focus management (heading focus on open) was already live-verified against
// real backend data in 02-05; this suite adds the synthetic coverage 02-08's own acceptance
// criteria require, plus the sheet-specific scrim/trap behavior no live seed-data check can
// exercise on its own. DetailPanel now depends on TanStack Query (useEntryHistory) and
// ToastContext (copy-link) -- every render goes through QueryClientProvider + ToastProvider, and
// `fetch` is stubbed globally exactly like every other API-consuming component's test file.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry, HistoryEntry } from '../../api/types'
import { ToastProvider } from '../../components/Toast'
import { DetailPanel } from './DetailPanel'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    description: 'A modern JVM language.',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeHistoryRow(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 1,
    entryId: 1,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    description: 'A modern JVM language.',
    isNew: true,
    changeType: 'CREATED',
    changedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

interface RenderOverrides {
  entry?: Entry | null
  isOpen?: boolean
  onClose?: () => void
  presentation?: 'panel' | 'sheet'
}

function renderPanel(overrides: RenderOverrides = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  function buildElement(current: RenderOverrides) {
    const props = {
      entry: makeEntry(),
      isOpen: true,
      onClose: () => {},
      presentation: 'panel' as const,
      ...current,
    }
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <DetailPanel {...props} />
        </ToastProvider>
      </QueryClientProvider>
    )
  }

  const result = render(buildElement(overrides))
  return {
    ...result,
    // Rerenders within the SAME QueryClient/ToastProvider tree (unlike RTL's raw `rerender`,
    // which would otherwise need a caller-constructed element carrying a fresh provider pair
    // every time) -- mirrors how a real parent re-rendering DetailPanel with new props behaves.
    rerenderPanel: (next: RenderOverrides) => result.rerender(buildElement(next)),
  }
}

describe('DetailPanel', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([makeHistoryRow()]) })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the entry name as a heading and moves focus to it when open', () => {
    renderPanel()

    const heading = screen.getByRole('heading', { name: 'Kotlin' })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveFocus()
  })

  it('focuses the heading with preventScroll so opening the panel never scrolls the page', () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')

    renderPanel()

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    focusSpy.mockRestore()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has a close button with aria-label "Close details" that calls onClose when clicked', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })

    const closeButton = screen.getByRole('button', { name: 'Close details' })
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when isOpen is false or entry is null', () => {
    // ToastProvider always renders its own (empty) toast-stack container as a sibling, so the
    // precise assertion is "DetailPanel's own dialog is absent", not "the whole tree is empty".
    const { rerenderPanel } = renderPanel({ isOpen: false })
    expect(screen.queryByRole('dialog')).toBeNull()

    rerenderPanel({ entry: null, isOpen: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('panel presentation is not modal (aria-modal false) and renders no scrim', () => {
    renderPanel({ presentation: 'panel' })

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false')
    expect(screen.queryByTestId('detail-panel-scrim')).toBeNull()
  })

  it('sheet presentation is modal (aria-modal true) with a scrim that closes on click', () => {
    const onClose = vi.fn()
    renderPanel({ presentation: 'sheet', onClose })

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    const scrim = screen.getByTestId('detail-panel-scrim')

    fireEvent.click(scrim)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab within the sheet, wrapping between the copy-link (first) and close (last) buttons', () => {
    renderPanel({ presentation: 'sheet' })

    const copyLinkButton = screen.getByRole('button', { name: 'Copy link to this entry' })
    const closeButton = screen.getByRole('button', { name: 'Close details' })

    closeButton.focus()
    expect(closeButton).toHaveFocus()

    // Tab forward from the last focusable element wraps to the first.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' })
    expect(copyLinkButton).toHaveFocus()

    // Shift+Tab backward from the first focusable element wraps to the last.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(closeButton).toHaveFocus()
  })

  it('does not trap Tab on the docked panel (no keydown-based focus interception)', () => {
    renderPanel({ presentation: 'panel' })

    const closeButton = screen.getByRole('button', { name: 'Close details' })
    closeButton.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    const dispatched = screen.getByRole('dialog').dispatchEvent(event)

    // The trap only calls preventDefault() when isSheet -- for the panel it's never called, so
    // the native (unhandled, jsdom-default) event dispatch reports as not prevented.
    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toBe(true)
  })

  describe('history timeline (HIST-01)', () => {
    it('shows a loading skeleton before the history request resolves', () => {
      let resolveFetch: (value: unknown) => void = () => {}
      fetchMock.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
      )

      renderPanel()

      expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument()
      expect(screen.queryByText('No changes yet')).toBeNull()
      expect(screen.queryByText(/Added to the radar/)).toBeNull()

      // Avoid leaving a dangling unresolved promise across tests.
      resolveFetch({ ok: true, status: 200, json: () => Promise.resolve([]) })
    })

    it('renders a CREATED row and a ring-change row derived from the fetched snapshots', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            makeHistoryRow({ id: 2, ring: 'TRIAL', changeType: 'UPDATED', changedAt: '2026-07-15T00:00:00Z' }),
            makeHistoryRow({ id: 1, ring: 'ADOPT', changeType: 'CREATED', changedAt: '2026-01-01T00:00:00Z' }),
          ]),
      })

      renderPanel()

      expect(await screen.findByText('Added to the radar · 01 Jan 2026 · Adopt')).toBeInTheDocument()
      expect(screen.getByText('Adopt → Trial · 15 Jul 2026')).toBeInTheDocument()
    })

    it('requests history for the currently selected entry id', async () => {
      renderPanel({ entry: makeEntry({ id: 42 }) })

      await screen.findByText(/Added to the radar/)

      const [calledUrl] = fetchMock.mock.calls[0] as [string]
      expect(calledUrl).toContain('entryId=42')
    })

    it('shows a graceful error message when the history fetch fails', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve(null) })

      renderPanel()

      expect(await screen.findByText("Couldn't load history")).toBeInTheDocument()
    })

    it('shows an empty state when the entry has no history snapshots at all', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) })

      renderPanel()

      expect(await screen.findByText('No changes yet')).toBeInTheDocument()
    })
  })

  describe('copy-link (SHRE-01)', () => {
    it('has an accessible copy-link button beside Close', () => {
      renderPanel()

      expect(screen.getByRole('button', { name: 'Copy link to this entry' })).toBeInTheDocument()
    })

    it('copies the current URL and shows a success toast when the Clipboard API succeeds', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { clipboard: { writeText } })

      renderPanel()
      fireEvent.click(screen.getByRole('button', { name: 'Copy link to this entry' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Link copied')
      expect(writeText).toHaveBeenCalledWith(window.location.href)
    })

    it('shows a graceful fallback message when the Clipboard API is unavailable', async () => {
      vi.stubGlobal('navigator', {})

      renderPanel()
      fireEvent.click(screen.getByRole('button', { name: 'Copy link to this entry' }))

      expect(
        await screen.findByRole('status'),
      ).toHaveTextContent("Couldn't copy the link — copy it from your browser's address bar instead.")
    })
  })
})
