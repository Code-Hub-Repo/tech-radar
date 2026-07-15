import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} entryName="Kotlin" onConfirm={() => {}} onCancel={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('states the exact confirmation copy with the entry name', () => {
    render(<ConfirmDialog isOpen entryName="Kotlin" onConfirm={() => {}} onCancel={() => {}} />)

    const dialog = screen.getByRole('dialog', { name: "Delete 'Kotlin'?" })
    expect(dialog).toHaveTextContent("This can't be undone.")
  })

  it('focuses Cancel by default, never Delete', () => {
    render(<ConfirmDialog isOpen entryName="Kotlin" onConfirm={() => {}} onCancel={() => {}} />)

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('calls onConfirm when Delete is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog isOpen entryName="Kotlin" onConfirm={onConfirm} onCancel={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when Cancel is clicked or Escape is pressed', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog isOpen entryName="Kotlin" onConfirm={() => {}} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('disables Delete and shows a loading state while isPending', () => {
    render(<ConfirmDialog isOpen entryName="Kotlin" isPending onConfirm={() => {}} onCancel={() => {}} />)

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton).toBeDisabled()
    expect(deleteButton).toHaveAttribute('aria-busy', 'true')
  })
})
