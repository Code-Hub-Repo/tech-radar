package gr.codehub.techradar.app

import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.api.ErrorResponse
import gr.codehub.techradar.app.support.TestAppBootstrap
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.ErrorCodes
import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.constants.ValidationConstants
import io.ktor.client.request.delete
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlinx.serialization.json.Json

// Nonexistent numeric id — RESTART IDENTITY on every reset means seeded ids never reach this high.
private const val NONEXISTENT_ID = 999_999
private const val SEEDED_ENTRY_NAME_DIFFERENT_CASE = "KOTLIN"

// JWT-guarded POST/PUT/DELETE /api/entries* against the real Testcontainers-backed app —
// HttpStatusCode.Unauthorized covers the "no/bad token" matrix.
class WriteValidationTest {

    @Test
    fun `POST without a token returns 401`() = TestAppBootstrap.runApp {
        val response = client.post(ApiRoutes.ENTRIES) {
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(validEntryRequest()))
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `PUT without a token returns 401`() = TestAppBootstrap.runApp {
        val response = client.put("${ApiRoutes.ENTRIES}/1") {
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(validEntryRequest()))
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `DELETE without a token returns 401`() = TestAppBootstrap.runApp {
        val response = client.delete("${ApiRoutes.ENTRIES}/1")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `POST with a blank name returns 400 with a name field detail`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val error = createAndExpectValidationError(token, validEntryRequest(name = ""))
        assertNotNull(error.error.details?.get("name"))
    }

    @Test
    fun `POST with a name over 100 chars returns 400 with a name field detail`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val tooLongName = "A".repeat(ValidationConstants.NAME_MAX_LENGTH + 1)
        val error = createAndExpectValidationError(token, validEntryRequest(name = tooLongName))
        assertNotNull(error.error.details?.get("name"))
    }

    @Test
    fun `POST with an invalid ring returns 400 with a ring field detail`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val error = createAndExpectValidationError(token, validEntryRequest(ring = "BOGUS_RING"))
        assertNotNull(error.error.details?.get("ring"))
    }

    @Test
    fun `POST with an invalid quadrant returns 400 with a quadrant field detail`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val error = createAndExpectValidationError(token, validEntryRequest(quadrant = "BOGUS_QUADRANT"))
        assertNotNull(error.error.details?.get("quadrant"))
    }

    @Test
    fun `POST with a blank description returns 400 with a description field detail`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val error = createAndExpectValidationError(token, validEntryRequest(description = ""))
        assertNotNull(error.error.details?.get("description"))
    }

    @Test
    fun `POST with a case-insensitive duplicate name returns 409`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val response = client.post(ApiRoutes.ENTRIES) {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(validEntryRequest(name = SEEDED_ENTRY_NAME_DIFFERENT_CASE)))
        }
        assertEquals(HttpStatusCode.Conflict, response.status)

        val error = Json.decodeFromString<ErrorResponse>(response.bodyAsText())
        assertEquals(ErrorCodes.DUPLICATE_NAME, error.error.code)
    }

    @Test
    fun `PUT with a malformed id returns 400 INVALID_PARAMETER`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val response = client.put("${ApiRoutes.ENTRIES}/abc") {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(validEntryRequest()))
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)

        val error = Json.decodeFromString<ErrorResponse>(response.bodyAsText())
        assertEquals(ErrorCodes.INVALID_PARAMETER, error.error.code)
    }

    @Test
    fun `POST with valid fields returns 201 with movement NONE`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val request = validEntryRequest(name = "Zig")
        val response = client.post(ApiRoutes.ENTRIES) {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(request))
        }
        assertEquals(HttpStatusCode.Created, response.status)

        val created = Json.decodeFromString<EntryResponse>(response.bodyAsText())
        assertEquals(request.name, created.name)
        assertEquals(Movement.NONE, created.movement)
        assertEquals(true, created.isNew)
    }

    @Test
    fun `PUT a nonexistent numeric id returns 404`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val response = client.put("${ApiRoutes.ENTRIES}/$NONEXISTENT_ID") {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(validEntryRequest()))
        }
        assertEquals(HttpStatusCode.NotFound, response.status)

        val error = Json.decodeFromString<ErrorResponse>(response.bodyAsText())
        assertEquals(ErrorCodes.NOT_FOUND, error.error.code)
    }

    @Test
    fun `DELETE a nonexistent numeric id returns 404`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val response = client.delete("${ApiRoutes.ENTRIES}/$NONEXISTENT_ID") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    @Test
    fun `DELETE a valid entry returns 204`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val response = client.delete("${ApiRoutes.ENTRIES}/1") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        assertEquals(HttpStatusCode.NoContent, response.status)
        assertEquals("", response.bodyAsText())
    }

    private suspend fun ApplicationTestBuilder.createAndExpectValidationError(
        token: String,
        request: EntryRequest,
    ): ErrorResponse {
        val response = client.post(ApiRoutes.ENTRIES) {
            header(HttpHeaders.Authorization, "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(request))
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)

        val error = Json.decodeFromString<ErrorResponse>(response.bodyAsText())
        assertEquals(ErrorCodes.VALIDATION_FAILED, error.error.code)
        return error
    }
}

private fun validEntryRequest(
    name: String = "Zig",
    quadrant: String = "LANGUAGES_FRAMEWORKS",
    ring: String = "ADOPT",
    description: String = "A valid test description.",
): EntryRequest = EntryRequest(name = name, quadrant = quadrant, ring = ring, description = description)
