package gr.codehub.techradar.api

import kotlinx.serialization.Serializable

@Serializable
data class ErrorResponse(
    val error: ErrorBody,
)

@Serializable
data class ErrorBody(
    val code: String,
    val message: String,
    val details: Map<String, String>? = null,
)
