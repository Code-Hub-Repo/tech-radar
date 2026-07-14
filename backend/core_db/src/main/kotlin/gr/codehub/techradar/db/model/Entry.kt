package gr.codehub.techradar.db.model

import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import kotlin.time.Instant

data class Entry(
    val id: Int,
    val name: String,
    val quadrant: Quadrant,
    val ring: Ring,
    val description: String,
    val isNew: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)
