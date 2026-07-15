import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Entry } from '../../api/types'
import { EntryFormModal } from './EntryFormModal'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 7,
    name: 'Kotlin',
    quadrant: 'LANGUAGES_FRAMEWORKS',
    ring: 'ADOPT',
    description: 'A pragmatic, statically typed language.',
    isNew: false,
    movement: 'NONE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('EntryFormModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <EntryFormModal
        isOpen={false}
        mode="create"
        initialEntry={null}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('starts with empty fields in create mode, and has no isNew control (backend cannot accept it)', () => {
    render(
      <EntryFormModal
        isOpen
        mode="create"
        initialEntry={null}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add technology' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Description')).toHaveValue('')
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('pre-fills every field from initialEntry in edit mode', () => {
    render(
      <EntryFormModal
        isOpen
        mode="edit"
        initialEntry={makeEntry()}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit Kotlin' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Kotlin')
    expect(screen.getByLabelText('Quadrant')).toHaveValue('LANGUAGES_FRAMEWORKS')
    expect(screen.getByLabelText('Ring')).toHaveValue('ADOPT')
    expect(screen.getByLabelText('Description')).toHaveValue('A pragmatic, statically typed language.')
  })

  it('shows a field error on blur once the name is cleared', () => {
    render(
      <EntryFormModal
        isOpen
        mode="edit"
        initialEntry={makeEntry()}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.blur(nameInput)

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('blocks submission and surfaces every error when required fields are blank', () => {
    const onSubmit = vi.fn()
    render(
      <EntryFormModal
        isOpen
        mode="create"
        initialEntry={null}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add technology' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
  })

  it('submits the exact EntryRequest shape (no isNew, no id) when valid', () => {
    const onSubmit = vi.fn()
    render(
      <EntryFormModal
        isOpen
        mode="create"
        initialEntry={null}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Svelte' } })
    fireEvent.change(screen.getByLabelText('Quadrant'), { target: { value: 'TOOLS' } })
    fireEvent.change(screen.getByLabelText('Ring'), { target: { value: 'ASSESS' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A compiler-based UI framework.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add technology' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Svelte',
      quadrant: 'TOOLS',
      ring: 'ASSESS',
      description: 'A compiler-based UI framework.',
    })
  })

  it('maps a 409 duplicate-name server error onto the name field', () => {
    render(
      <EntryFormModal
        isOpen
        mode="create"
        initialEntry={null}
        isSubmitting={false}
        serverErrors={{ name: "An entry named 'Kotlin' already exists" }}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText("An entry named 'Kotlin' already exists")).toBeInTheDocument()
  })

  it('dismisses a server error on the name field as soon as it is edited', () => {
    render(
      <EntryFormModal
        isOpen
        mode="create"
        initialEntry={null}
        isSubmitting={false}
        serverErrors={{ name: "An entry named 'Kotlin' already exists" }}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Kotlin 2' } })

    expect(screen.queryByText("An entry named 'Kotlin' already exists")).toBeNull()
  })

  it('resets fields when reopened for a different entry', () => {
    const { rerender } = render(
      <EntryFormModal
        isOpen
        mode="edit"
        initialEntry={makeEntry({ id: 7, name: 'Kotlin' })}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Kotlin')

    rerender(
      <EntryFormModal
        isOpen
        mode="edit"
        initialEntry={makeEntry({ id: 8, name: 'TypeScript' })}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByLabelText('Name')).toHaveValue('TypeScript')
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <EntryFormModal
        isOpen
        mode="create"
        initialEntry={null}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables the submit button and shows a loading state while isSubmitting', () => {
    render(
      <EntryFormModal
        isOpen
        mode="create"
        initialEntry={null}
        isSubmitting
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    const submitButton = screen.getByRole('button', { name: 'Add technology' })
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveAttribute('aria-busy', 'true')
  })
})
