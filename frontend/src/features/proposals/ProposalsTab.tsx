// Admin moderation queue (PROP-02) -- lists PENDING proposals with their proposed fields,
// submitter, and date, each with Approve/Reject actions. A card list rather than EntryTable's
// sortable table shape: proposals have no admin-defined sort/filter need (the backend already
// returns them newest-first per createdAt, CONTEXT.md), and a description-bearing row reads
// better as a card than a cramped table cell. AdminPage owns every mutation call site (Approve
// opens ApproveProposalModal, Reject opens ConfirmDialog) -- this component only renders and
// reports which proposal was acted on, mirroring EntryTable's own onEdit/onDeleteRequest shape.
import { Check, X } from 'lucide-react'
import type { Proposal } from '../../api/types'
import { quadrantLabel, ringLabel } from '../../api/types'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Skeleton } from '../../components/Skeleton'

interface ProposalsTabProps {
  proposals: Proposal[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  onApprove: (proposal: Proposal) => void
  onReject: (proposal: Proposal) => void
}

const LOADING_CARD_COUNT = 3
const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function ProposalsTab({ proposals, isPending, isError, onRetry, onApprove, onReject }: ProposalsTabProps) {
  if (isError) {
    return (
      <ErrorState
        heading="Couldn't load proposals"
        body="Something went wrong fetching the latest data. Check your connection and try again."
        onRetry={onRetry}
      />
    )
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
          <Skeleton key={index} shape="rect" width="100%" height={120} />
        ))}
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <EmptyState
        heading="No pending suggestions"
        body="New suggestions from the public radar will show up here for review."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {proposals.map((proposal) => (
        <li key={proposal.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold leading-[1.3] text-foreground">{proposal.name}</h3>
              <p className="mt-1 font-mono text-[13px] leading-[1.4] text-muted">
                {quadrantLabel[proposal.quadrant]} · {ringLabel[proposal.ring]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => onReject(proposal)}>
                <X size={16} aria-hidden="true" />
                Reject
              </Button>
              <Button variant="primary" onClick={() => onApprove(proposal)}>
                <Check size={16} aria-hidden="true" />
                Approve
              </Button>
            </div>
          </div>
          <p className="text-[14px] leading-[1.5] text-foreground">{proposal.description}</p>
          <p className="font-mono text-[12px] leading-[1.4] text-muted">
            Suggested by {proposal.submitterName ?? 'Anonymous'} ·{' '}
            {DATE_FORMATTER.format(new Date(proposal.createdAt))}
          </p>
        </li>
      ))}
    </ul>
  )
}
