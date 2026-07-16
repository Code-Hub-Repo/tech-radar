package gr.codehub.techradar.api

import kotlinx.serialization.Serializable

@Serializable
data class ApproveProposalResponse(
    val proposal: ProposalResponse,
    val entry: EntryResponse,
)
