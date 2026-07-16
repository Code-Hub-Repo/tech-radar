package gr.codehub.techradar.api

import kotlinx.serialization.Serializable

// Public submit body — quadrant/ring stay raw Strings here (same reasoning as EntryRequest): an
// invalid value fails as a 400 validation error, not a deserialization crash. submitterName is
// optional free-text, never used for anything beyond display.
@Serializable
data class ProposalRequest(
    val name: String,
    val quadrant: String,
    val ring: String,
    val description: String,
    val submitterName: String? = null,
)
