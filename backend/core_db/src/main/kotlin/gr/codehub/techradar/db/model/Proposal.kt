package gr.codehub.techradar.db.model

import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import kotlin.time.Instant

data class Proposal(
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
