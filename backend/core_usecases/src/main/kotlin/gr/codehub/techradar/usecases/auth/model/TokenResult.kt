package gr.codehub.techradar.usecases.auth.model

import kotlin.time.Instant

data class TokenResult(
    val token: String,
    val expiresAt: Instant,
)
