package gr.codehub.techradar.api

import kotlinx.serialization.Serializable

// All fields optional — the admin may adjust a proposal's content before it becomes an entry.
// Any field left null falls back to the proposal's own submitted value (ApproveProposalUseCase).
// Body itself is optional too: the route accepts a missing/empty body as "no overrides".
@Serializable
data class ApproveProposalRequest(
    val name: String? = null,
    val quadrant: String? = null,
    val ring: String? = null,
    val description: String? = null,
)
