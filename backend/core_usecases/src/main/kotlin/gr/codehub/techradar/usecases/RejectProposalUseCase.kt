package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.ProposalResponse
import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.db.repository.ProposalsRepository
import gr.codehub.techradar.usecases.error.ProposalAlreadyReviewedException
import gr.codehub.techradar.usecases.error.ProposalNotFoundException
import gr.codehub.techradar.usecases.mapping.toProposalResponse

// PROP-04 — never touches entries/entry_history at all.
class RejectProposalUseCase(
    private val proposalsRepository: ProposalsRepository,
) {
    suspend operator fun invoke(id: Int): Result<ProposalResponse> = runCatching {
        val proposal = proposalsRepository.findById(id) ?: throw ProposalNotFoundException(id)
        if (proposal.status != ProposalStatus.PENDING) {
            throw ProposalAlreadyReviewedException(id)
        }

        val updated = proposalsRepository.markRejected(id) ?: throw ProposalAlreadyReviewedException(id)
        updated.toProposalResponse()
    }
}
