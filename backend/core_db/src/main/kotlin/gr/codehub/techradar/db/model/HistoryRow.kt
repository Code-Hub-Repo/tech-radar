package gr.codehub.techradar.db.model

import gr.codehub.techradar.constants.ChangeType
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import kotlin.time.Instant

data class HistoryRow(
    val id: Int,
    val entryId: Int,
    val name: String,
    val quadrant: Quadrant,
    val ring: Ring,
    val description: String,
    val isNew: Boolean,
    val changeType: ChangeType,
    val changedAt: Instant,
)
