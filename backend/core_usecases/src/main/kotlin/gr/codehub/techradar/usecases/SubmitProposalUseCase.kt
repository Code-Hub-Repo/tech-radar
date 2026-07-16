package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.ProposalRequest
import gr.codehub.techradar.api.ProposalResponse
import gr.codehub.techradar.db.repository.ProposalsRepository
import gr.codehub.techradar.usecases.mapping.toProposalResponse
import gr.codehub.techradar.usecases.validation.ProposalValidator

// Public entry point (PROP-01) — the ONLY write path a non-admin caller can reach. Never touches
// EntriesRepository: a proposal becomes a real entry solely through ApproveProposalUseCase.
class SubmitProposalUseCase(
    private val proposalsRepository: ProposalsRepository,
) {
    suspend operator fun invoke(request: ProposalRequest): Result<ProposalResponse> = runCatching {
        val newProposal = ProposalValidator.validateForSubmit(request)
        proposalsRepository.create(newProposal).toProposalResponse()
    }
}
