package gr.codehub.techradar.db.model

import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring

data class EntryUpdate(
    val name: String,
    val quadrant: Quadrant,
    val ring: Ring,
    val description: String,
)
