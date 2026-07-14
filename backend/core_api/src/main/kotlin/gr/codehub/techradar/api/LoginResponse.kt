package gr.codehub.techradar.api

import kotlin.time.Instant
import kotlinx.serialization.Serializable

@Serializable
data class LoginResponse(
    val token: String,
    val expiresAt: Instant,
)
