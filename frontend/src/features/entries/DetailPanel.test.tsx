// RTL coverage for DetailPanel's focus management, Escape/close behavior, and the sheet-vs-panel
// presentation split (aria-modal, scrim, focus trap) added in 02-08. The panel variant's focus
// management (heading focus on open) was already live-verified against real backend data in
// 02-05; this suite adds the synthetic coverage 02-08's own acceptance criteria require, plus
// the sheet-specific scrim/trap behavior no live seed-data check can exercise on its own.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Entry } from '../../api/types'
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

describe('DetailPanel', () => {
  it('renders the entry name as a heading and moves focus to it when open', () => {
    render(<DetailPanel entry={makeEntry()} isOpen onClose={() => {}} presentation="panel" />)

    const heading = screen.getByRole('heading', { name: 'Kotlin' })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveFocus()
  })

  it('focuses the heading with preventScroll so opening the panel never scrolls the page', () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')

    render(<DetailPanel entry={makeEntry()} isOpen onClose={() => {}} presentation="panel" />)

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    focusSpy.mockRestore()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<DetailPanel entry={makeEntry()} isOpen onClose={onClose} presentation="panel" />)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has a close button with aria-label "Close details" that calls onClose when clicked', () => {
    const onClose = vi.fn()
    render(<DetailPanel entry={makeEntry()} isOpen onClose={onClose} presentation="panel" />)

    const closeButton = screen.getByRole('button', { name: 'Close details' })
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when isOpen is false or entry is null', () => {
    const { rerender, container } = render(
      <DetailPanel entry={makeEntry()} isOpen={false} onClose={() => {}} presentation="panel" />,
    )
    expect(container).toBeEmptyDOMElement()

    rerender(<DetailPanel entry={null} isOpen onClose={() => {}} presentation="panel" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('panel presentation is not modal (aria-modal false) and renders no scrim', () => {
    render(<DetailPanel entry={makeEntry()} isOpen onClose={() => {}} presentation="panel" />)

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false')
    expect(screen.queryByTestId('detail-panel-scrim')).toBeNull()
  })

  it('sheet presentation is modal (aria-modal true) with a scrim that closes on click', () => {
    const onClose = vi.fn()
    render(<DetailPanel entry={makeEntry()} isOpen onClose={onClose} presentation="sheet" />)

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    const scrim = screen.getByTestId('detail-panel-scrim')

    fireEvent.click(scrim)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab within the sheet, wrapping from the last focusable element back to the first', () => {
    render(<DetailPanel entry={makeEntry()} isOpen onClose={() => {}} presentation="sheet" />)

    const closeButton = screen.getByRole('button', { name: 'Close details' })
    closeButton.focus()
    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' })
    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(closeButton).toHaveFocus()
  })

  it('does not trap Tab on the docked panel (no keydown-based focus interception)', () => {
    render(<DetailPanel entry={makeEntry()} isOpen onClose={() => {}} presentation="panel" />)

    const closeButton = screen.getByRole('button', { name: 'Close details' })
    closeButton.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    const dispatched = screen.getByRole('dialog').dispatchEvent(event)

    // The trap only calls preventDefault() when isSheet -- for the panel it's never called, so
    // the native (unhandled, jsdom-default) event dispatch reports as not prevented.
    expect(event.defaultPrevented).toBe(false)
    expect(dispatched).toBe(true)
  })
})
