package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.ProposalResponse
import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.db.repository.ProposalsRepository
import gr.codehub.techradar.usecases.mapping.toProposalResponse

// PROP-02 — status == null lists every proposal (CONTEXT.md: "no status param -> all").
class GetProposalsUseCase(
    private val proposalsRepository: ProposalsRepository,
) {
    suspend operator fun invoke(status: ProposalStatus?): Result<List<ProposalResponse>> = runCatching {
        proposalsRepository.findAll(status).map { it.toProposalResponse() }
    }
}
