import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Proposal } from '../../api/types'
import { ApproveProposalModal } from './ApproveProposalModal'

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 4,
    name: 'Ktor Client',
    quadrant: 'TOOLS',
    ring: 'ASSESS',
    description: 'A lightweight, coroutine-based HTTP client.',
    submitterName: 'Jane',
    status: 'PENDING',
    entryId: null,
    createdAt: '2026-07-14T00:00:00Z',
    reviewedAt: null,
    ...overrides,
  }
}

describe('ApproveProposalModal', () => {
  it('renders nothing when there is no proposal', () => {
    const { container } = render(
      <ApproveProposalModal
        isOpen={false}
        proposal={null}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('pre-fills every field from the proposal and shows submitter + date context', () => {
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Review "Ktor Client"' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ktor Client')
    expect(screen.getByLabelText('Quadrant')).toHaveValue('TOOLS')
    expect(screen.getByLabelText('Ring')).toHaveValue('ASSESS')
    expect(screen.getByLabelText('Description')).toHaveValue('A lightweight, coroutine-based HTTP client.')
    expect(screen.getByText(/Suggested by Jane/)).toBeInTheDocument()
    expect(screen.getByText(/14 Jul 2026/)).toBeInTheDocument()
  })

  it('shows "Anonymous" when the proposal has no submitter name', () => {
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal({ submitterName: null })}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText(/Suggested by Anonymous/)).toBeInTheDocument()
  })

  it('shows a field error on blur once the name is cleared', () => {
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
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
  })

  it('blocks submission when a required field is blank', () => {
    const onSubmit = vi.fn()
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
  })

  it('submits the edited overrides (not the original proposal values) on Approve', () => {
    const onSubmit = vi.fn()
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Ring'), { target: { value: 'TRIAL' } })
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ktor Client',
      quadrant: 'TOOLS',
      ring: 'TRIAL',
      description: 'A lightweight, coroutine-based HTTP client.',
    })
  })

  it('maps a 409 duplicate-name server error onto the name field, proposal stays open', () => {
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
        isSubmitting={false}
        serverErrors={{ name: "An entry named 'Ktor Client' already exists" }}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText("An entry named 'Ktor Client' already exists")).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dismisses a server error on the name field as soon as it is edited', () => {
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
        isSubmitting={false}
        serverErrors={{ name: "An entry named 'Ktor Client' already exists" }}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ktor Client 2' } })

    expect(screen.queryByText("An entry named 'Ktor Client' already exists")).toBeNull()
  })

  it('resets fields when reopened for a different proposal', () => {
    const { rerender } = render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal({ id: 4, name: 'Ktor Client' })}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Ktor Client')

    rerender(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal({ id: 5, name: 'Bun' })}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByLabelText('Name')).toHaveValue('Bun')
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
        isSubmitting={false}
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables the Approve button and shows a loading state while isSubmitting', () => {
    render(
      <ApproveProposalModal
        isOpen
        proposal={makeProposal()}
        isSubmitting
        serverErrors={{}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    )

    const approveButton = screen.getByRole('button', { name: 'Approve' })
    expect(approveButton).toBeDisabled()
    expect(approveButton).toHaveAttribute('aria-busy', 'true')
  })
})
