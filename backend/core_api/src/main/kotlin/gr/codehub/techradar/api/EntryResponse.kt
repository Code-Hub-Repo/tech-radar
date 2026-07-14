package gr.codehub.techradar.api

import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import kotlin.time.Instant
import kotlinx.serialization.Serializable

@Serializable
data class EntryResponse(
    val id: Int,
    val name: String,
    val quadrant: Quadrant,
    val ring: Ring,
    val description: String,
    val isNew: Boolean,
    val movement: Movement,
    val createdAt: Instant,
    val updatedAt: Instant,
)
