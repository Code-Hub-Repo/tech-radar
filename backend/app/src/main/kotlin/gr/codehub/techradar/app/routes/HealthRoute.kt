package gr.codehub.techradar.app.routes

import gr.codehub.techradar.constants.ApiRoutes
import io.ktor.http.HttpStatusCode
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import kotlinx.serialization.Serializable

private const val HEALTH_STATUS_OK = "ok"

@Serializable
private data class HealthResponse(
    val status: String,
)

// Intentionally trivial, no DB probe — DB readiness is the compose healthcheck's job, not this
// endpoint's (this is the uptime-monitor target).
fun Route.healthRoute() {
    get(ApiRoutes.HEALTH) {
        call.respond(
            status = HttpStatusCode.OK,
            message = HealthResponse(status = HEALTH_STATUS_OK),
        )
    }
}
