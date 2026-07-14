package gr.codehub.techradar.api

import kotlinx.serialization.Serializable

// Client-writable fields ONLY — no id/isNew/createdAt. Server-controlled fields are structurally
// absent so a client has nothing to over-post (mass-assignment guard). quadrant/ring stay raw
// Strings here so invalid values fail as a 400 validation error, not a deserialization crash.
@Serializable
data class EntryRequest(
    val name: String,
    val quadrant: String,
    val ring: String,
    val description: String,
)
