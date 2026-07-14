package gr.codehub.techradar.app

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import gr.codehub.techradar.api.ErrorResponse
import gr.codehub.techradar.api.LoginRequest
import gr.codehub.techradar.api.LoginResponse
import gr.codehub.techradar.app.support.TestAppBootstrap
import gr.codehub.techradar.app.support.TestPostgres
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.ErrorCodes
import gr.codehub.techradar.constants.JwtConstants
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.time.Clock
import kotlin.time.Duration.Companion.hours
import kotlinx.serialization.json.Json

private const val WRONG_PASSWORD = "definitely-not-the-right-password"
private const val WRONG_USERNAME = "not-the-admin"
private const val LOGIN_LIMIT = 5

// POST /api/auth/login against the real Testcontainers-backed app — success/failure/rate-limit,
// verified against a live-issued token (real HS256 signature verification), not just source
// inspection.
class AuthTest {

    @Test
    fun `login with valid credentials returns a token decoding HS256 with 8h expiry and correct claims`() =
        TestAppBootstrap.runApp {
            val config = TestPostgres.toAppConfig()
            val response = loginRequest(config.adminUsername, TestPostgres.TEST_ADMIN_PASSWORD)
            assertEquals(HttpStatusCode.OK, response.status)

            val loginResponse = Json.decodeFromString<LoginResponse>(response.bodyAsText())

            val verifier = JWT.require(Algorithm.HMAC256(config.jwtSecret))
                .withIssuer(JwtConstants.ISSUER)
                .withAudience(JwtConstants.AUDIENCE)
                .build()
            val decoded = verifier.verify(loginResponse.token)

            assertEquals(config.adminUsername, decoded.getClaim(JwtConstants.USERNAME_CLAIM).asString())

            val now = Clock.System.now()
            assertTrue(loginResponse.expiresAt > now.plus(7.hours))
            assertTrue(loginResponse.expiresAt < now.plus(9.hours))
        }

    @Test
    fun `login with wrong password returns 401`() = TestAppBootstrap.runApp {
        val config = TestPostgres.toAppConfig()
        val response = loginRequest(config.adminUsername, WRONG_PASSWORD)
        assertEquals(HttpStatusCode.Unauthorized, response.status)

        val error = Json.decodeFromString<ErrorResponse>(response.bodyAsText())
        assertEquals(ErrorCodes.UNAUTHORIZED, error.error.code)
    }

    @Test
    fun `login with wrong username returns the same 401 body as a wrong password`() = TestAppBootstrap.runApp {
        val config = TestPostgres.toAppConfig()

        val wrongUsernameResponse = loginRequest(WRONG_USERNAME, TestPostgres.TEST_ADMIN_PASSWORD)
        assertEquals(HttpStatusCode.Unauthorized, wrongUsernameResponse.status)

        val wrongPasswordResponse = loginRequest(config.adminUsername, WRONG_PASSWORD)
        assertEquals(HttpStatusCode.Unauthorized, wrongPasswordResponse.status)

        assertEquals(wrongPasswordResponse.bodyAsText(), wrongUsernameResponse.bodyAsText())
    }

    @Test
    fun `exceeding 5 login requests per minute returns 429 on the 6th`() = TestAppBootstrap.runApp {
        val config = TestPostgres.toAppConfig()

        repeat(LOGIN_LIMIT) {
            val response = loginRequest(config.adminUsername, TestPostgres.TEST_ADMIN_PASSWORD)
            assertEquals(HttpStatusCode.OK, response.status)
        }

        val sixthResponse = loginRequest(config.adminUsername, TestPostgres.TEST_ADMIN_PASSWORD)
        assertEquals(HttpStatusCode.TooManyRequests, sixthResponse.status)
    }
}

private suspend fun ApplicationTestBuilder.loginRequest(username: String, password: String): HttpResponse =
    client.post(ApiRoutes.AUTH_LOGIN) {
        contentType(ContentType.Application.Json)
        setBody(Json.encodeToString(LoginRequest(username = username, password = password)))
    }
