package gr.codehub.techradar.api

import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import kotlin.time.Instant
import kotlinx.serialization.Serializable

@Serializable
data class ProposalResponse(
    val id: Int,
    val name: String,
    val quadrant: Quadrant,
    val ring: Ring,
    val description: String,
    val submitterName: String?,
    val status: ProposalStatus,
    val entryId: Int?,
    val createdAt: Instant,
    val reviewedAt: Instant?,
)
