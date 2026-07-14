package gr.codehub.techradar.app

import gr.codehub.techradar.app.support.TestAppBootstrap
import gr.codehub.techradar.constants.ApiRoutes
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.options
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val ALLOWED_ORIGIN = "https://radar.codehub.gr"
private const val DISALLOWED_ORIGIN = "https://evil.example"

// Exercises GET /api/health and the CORS allowlist against the real Testcontainers-backed app
// (TestAppBootstrap.runApp wraps Ktor's testApplication { } with a shared, pre-seeded PostgreSQL
// 18 container per Task 1).
class HealthCorsTest {

    @Test
    fun `health endpoint returns 200 with status ok`() = TestAppBootstrap.runApp {
        val response = client.get(ApiRoutes.HEALTH)

        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.bodyAsText().contains("\"status\":\"ok\""))
    }

    @Test
    fun `preflight from an allowed origin is accepted and reflected`() = TestAppBootstrap.runApp {
        val response = client.options(ApiRoutes.ENTRIES) {
            header(HttpHeaders.Origin, ALLOWED_ORIGIN)
            header(HttpHeaders.AccessControlRequestMethod, "POST")
        }

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(ALLOWED_ORIGIN, response.headers[HttpHeaders.AccessControlAllowOrigin])
    }

    @Test
    fun `preflight from an unlisted origin is rejected and not reflected`() = TestAppBootstrap.runApp {
        val response = client.options(ApiRoutes.ENTRIES) {
            header(HttpHeaders.Origin, DISALLOWED_ORIGIN)
            header(HttpHeaders.AccessControlRequestMethod, "POST")
        }

        assertEquals(HttpStatusCode.Forbidden, response.status)
        assertNull(response.headers[HttpHeaders.AccessControlAllowOrigin])
    }
}
