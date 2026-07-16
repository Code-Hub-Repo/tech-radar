import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Proposal } from '../../api/types'
import { ProposalsTab } from './ProposalsTab'

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

describe('ProposalsTab', () => {
  it('shows loading skeletons while pending', () => {
    const { container } = render(
      <ProposalsTab proposals={[]} isPending isError={false} onRetry={() => {}} onApprove={() => {}} onReject={() => {}} />,
    )

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('No pending suggestions')).toBeNull()
  })

  it('shows an error state with a retry action on failure', () => {
    const onRetry = vi.fn()
    render(
      <ProposalsTab
        proposals={[]}
        isPending={false}
        isError
        onRetry={onRetry}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: "Couldn't load proposals" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there are no pending proposals', () => {
    render(
      <ProposalsTab
        proposals={[]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No pending suggestions' })).toBeInTheDocument()
  })

  it('renders a card per proposal with name, quadrant/ring, description, submitter, and date', () => {
    render(
      <ProposalsTab
        proposals={[makeProposal()]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    )

    expect(screen.getByText('Ktor Client')).toBeInTheDocument()
    expect(screen.getByText('Tools · Assess')).toBeInTheDocument()
    expect(screen.getByText('A lightweight, coroutine-based HTTP client.')).toBeInTheDocument()
    expect(screen.getByText(/Suggested by Jane/)).toBeInTheDocument()
    expect(screen.getByText(/14 Jul 2026/)).toBeInTheDocument()
  })

  it('shows "Anonymous" for a proposal with no submitter name', () => {
    render(
      <ProposalsTab
        proposals={[makeProposal({ submitterName: null })]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    )

    expect(screen.getByText(/Suggested by Anonymous/)).toBeInTheDocument()
  })

  it('calls onApprove with the clicked proposal', () => {
    const onApprove = vi.fn()
    const proposal = makeProposal()
    render(
      <ProposalsTab
        proposals={[proposal]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        onApprove={onApprove}
        onReject={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onApprove).toHaveBeenCalledWith(proposal)
  })

  it('calls onReject with the clicked proposal', () => {
    const onReject = vi.fn()
    const proposal = makeProposal()
    render(
      <ProposalsTab
        proposals={[proposal]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        onApprove={() => {}}
        onReject={onReject}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(onReject).toHaveBeenCalledWith(proposal)
  })

  it('renders one card per proposal when there are multiple', () => {
    render(
      <ProposalsTab
        proposals={[makeProposal({ id: 1, name: 'Ktor Client' }), makeProposal({ id: 2, name: 'Bun' })]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    )

    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(2)
    expect(screen.getByText('Ktor Client')).toBeInTheDocument()
    expect(screen.getByText('Bun')).toBeInTheDocument()
  })
})
