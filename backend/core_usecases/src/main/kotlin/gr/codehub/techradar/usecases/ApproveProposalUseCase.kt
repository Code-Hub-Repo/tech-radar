package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.ApproveProposalRequest
import gr.codehub.techradar.api.ApproveProposalResponse
import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.db.repository.ProposalsRepository
import gr.codehub.techradar.usecases.error.ProposalAlreadyReviewedException
import gr.codehub.techradar.usecases.error.ProposalNotFoundException
import gr.codehub.techradar.usecases.mapping.toProposalResponse

// PROP-03 — composes the SAME validated, atomic entry-creation path admin-created entries use
// (CreateEntryUseCase -> EntryValidator + EntriesRepository.create): a proposal's content is never
// trusted directly into the entries table, and the admin's optional overrides go through that
// exact validator too.
//
// Two-step, not one shared transaction (CONTEXT.md's documented safe two-step order): the entry
// insert + its CREATED history row happen inside CreateEntryUseCase's own suspendTransaction
// first; only on success does ProposalsRepository.markApproved flip the proposal in its own
// suspendTransaction. A crash between the two leaves the proposal PENDING with the entry already
// created — retrying the approve then surfaces a 409 duplicate-name for an admin to resolve by
// hand, exactly as CONTEXT.md specifies. A DuplicateNameException from step one (bad merged name)
// propagates as-is and the proposal is never touched, satisfying PROP-05 (still PENDING on 409).
class ApproveProposalUseCase(
    private val proposalsRepository: ProposalsRepository,
    private val createEntryUseCase: CreateEntryUseCase,
) {
    suspend operator fun invoke(id: Int, overrides: ApproveProposalRequest): Result<ApproveProposalResponse> =
        runCatching {
            val proposal = proposalsRepository.findById(id) ?: throw ProposalNotFoundException(id)
            if (proposal.status != ProposalStatus.PENDING) {
                throw ProposalAlreadyReviewedException(id)
            }

            val entryRequest = EntryRequest(
                name = overrides.name ?: proposal.name,
                quadrant = overrides.quadrant ?: proposal.quadrant.apiName,
                ring = overrides.ring ?: proposal.ring.apiName,
                description = overrides.description ?: proposal.description,
            )

            val entry = createEntryUseCase(entryRequest).getOrThrow()

            // 0 rows updated means the proposal was reviewed by someone else between the findById
            // check above and this write — surfaced as the same 409 ALREADY_REVIEWED disposition.
            val updatedProposal = proposalsRepository.markApproved(id, entry.id)
                ?: throw ProposalAlreadyReviewedException(id)

            ApproveProposalResponse(
                proposal = updatedProposal.toProposalResponse(),
                entry = entry,
            )
        }
}
