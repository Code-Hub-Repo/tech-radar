// Mirrors DetailPanel.test.tsx's own focus-management coverage style (fireEvent, no
// userEvent dependency) for this shared primitive.
import { useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Example">
        <p>Body</p>
      </Modal>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a labeled, modal dialog with its title and children when open', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Add technology">
        <p>Form fields go here</p>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Add technology' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent('Form fields go here')
  })

  it('moves focus to the heading on open by default', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Add technology">
        <p>Body</p>
      </Modal>,
    )

    expect(screen.getByRole('heading', { name: 'Add technology' })).toHaveFocus()
  })

  it('moves focus to initialFocusRef instead of the heading when provided', () => {
    function Wrapper() {
      const cancelRef = useRef<HTMLButtonElement>(null)
      return (
        <Modal isOpen onClose={() => {}} title="Delete 'Kotlin'?" initialFocusRef={cancelRef}>
          <button ref={cancelRef} type="button">
            Cancel
          </button>
        </Modal>
      )
    }
    render(<Wrapper />)

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Example">
        <p>Body</p>
      </Modal>,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the scrim is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen onClose={onClose} title="Example">
        <p>Body</p>
      </Modal>,
    )

    const scrim = container.querySelector('[aria-hidden="true"]')
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim as Element)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Example">
        <p>Body</p>
      </Modal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab within the dialog, wrapping from the last focusable element back to the first', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Example">
        <input aria-label="Name" />
      </Modal>,
    )

    const closeButton = screen.getByRole('button', { name: 'Close dialog' })
    const nameInput = screen.getByLabelText('Name')

    nameInput.focus()
    expect(nameInput).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' })
    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(nameInput).toHaveFocus()
  })

  it('returns focus to the trigger element after closing', () => {
    function Wrapper() {
      const [isOpen, setIsOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Example">
            <p>Body</p>
          </Modal>
        </div>
      )
    }
    render(<Wrapper />)

    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    fireEvent.click(openButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(openButton).toHaveFocus()
  })
})
