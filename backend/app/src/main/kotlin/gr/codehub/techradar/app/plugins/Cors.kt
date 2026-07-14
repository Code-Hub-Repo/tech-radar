package gr.codehub.techradar.app.plugins

import gr.codehub.techradar.constants.AppConfig
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.cors.routing.CORS

// Explicit allowlist only — no anyHost(), no allowCredentials. Bearer-in-header auth needs neither
// (T-01-01 mitigation, RESEARCH.md Pitfall 4): every allowed origin comes from AppConfig.corsAllowedOrigins.
fun Application.configureCors(config: AppConfig) {
    install(CORS) {
        config.corsAllowedOrigins.forEach { origin ->
            allowHost(
                host = origin.hostWithPort,
                schemes = listOf(origin.scheme),
            )
        }
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        // GET, POST, HEAD, OPTIONS are Ktor CORS defaults — no explicit allowMethod() needed for those.
    }
}
