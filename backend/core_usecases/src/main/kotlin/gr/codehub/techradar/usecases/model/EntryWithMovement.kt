package gr.codehub.techradar.usecases.model

import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.db.model.Entry

// Bridge type between a persisted Entry and its read-time-computed Movement — the exact "Entry +
// Movement" pair ApiMapping.toEntryResponse() converts into the public EntryResponse DTO.
data class EntryWithMovement(
    val entry: Entry,
    val movement: Movement,
)
