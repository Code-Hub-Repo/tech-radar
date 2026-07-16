package gr.codehub.techradar.app

import gr.codehub.techradar.api.ApproveProposalRequest
import gr.codehub.techradar.api.ApproveProposalResponse
import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.api.ErrorResponse
import gr.codehub.techradar.api.HistoryResponse
import gr.codehub.techradar.api.ProposalRequest
import gr.codehub.techradar.api.ProposalResponse
import gr.codehub.techradar.app.support.TestAppBootstrap
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.ChangeType
import gr.codehub.techradar.constants.ErrorCodes
import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.constants.ValidationConstants
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json

private const val PROPOSALS_LIMIT = 5
private const val SEEDED_DUPLICATE_NAME = "Kotlin"

// POST /api/proposals (public, rate-limited) and the JWT-guarded list/approve/reject moderation
// surface, against the real Testcontainers-backed app — mirrors WriteValidationTest/AuthTest's own
// TestAppBootstrap.runApp pattern. The public submit path never writes to entries directly; only
// approve does, through the same validated CreateEntryUseCase path admin-created entries use.
class ProposalsTest {

    @Test
    fun `POST proposals with valid fields returns 201 PENDING`() = TestAppBootstrap.runApp {
        val response = submitProposal(validProposalRequest())
        assertEquals(HttpStatusCode.Created, response.status)

        val proposal = Json.decodeFromString<ProposalResponse>(response.bodyAsText())
        assertEquals(ProposalStatus.PENDING, proposal.status)
        assertNull(proposal.entryId)
        assertNull(proposal.reviewedAt)
    }

    @Test
    fun `POST proposals with a blank name returns 400 with a name field detail`() = TestAppBootstrap.runApp {
        val error = submitAndExpectValidationError(validProposalRequest(name = ""))
        assertNotNull(error.error.details?.get("name"))
    }

    @Test
    fun `POST proposals with a name over 100 chars returns 400 with a name field detail`() = TestAppBootstrap.runApp {
        val tooLongName = "A".repeat(ValidationConstants.NAME_MAX_LENGTH + 1)
        val error = submitAndExpectValidationError(validProposalRequest(name = tooLongName))
        assertNotNull(error.error.details?.get("name"))
    }

    @Test
    fun `POST proposals with an invalid ring returns 400 with a ring field detail`() = TestAppBootstrap.runApp {
        val error = submitAndExpectValidationError(validProposalRequest(ring = "BOGUS_RING"))
        assertNotNull(error.error.details?.get("ring"))
    }

    @Test
    fun `POST proposals with an invalid quadrant returns 400 with a quadrant field detail`() = TestAppBootstrap.runApp {
        val error = submitAndExpectValidationError(validProposalRequest(quadrant = "BOGUS_QUADRANT"))
        assertNotNull(error.error.details?.get("quadrant"))
    }

    @Test
    fun `POST proposals with a blank description returns 400 with a description field detail`() =
        TestAppBootstrap.runApp {
            val error = submitAndExpectValidationError(validProposalRequest(description = ""))
            assertNotNull(error.error.details?.get("description"))
        }

    @Test
    fun `POST proposals with a submitterName over 100 chars returns 400 with a submitterName field detail`() =
        TestAppBootstrap.runApp {
            val tooLongSubmitter = "A".repeat(ValidationConstants.SUBMITTER_NAME_MAX_LENGTH + 1)
            val error = submitAndExpectValidationError(validProposalRequest(submitterName = tooLongSubmitter))
            assertNotNull(error.error.details?.get("submitterName"))
        }

    @Test
    fun `exceeding 5 proposal submissions per window returns 429 on the 6th`() = TestAppBootstrap.runApp {
        repeat(PROPOSALS_LIMIT) {
            val response = submitProposal(validProposalRequest())
            assertEquals(HttpStatusCode.Created, response.status)
        }

        val sixthResponse = submitProposal(validProposalRequest())
        assertEquals(HttpStatusCode.TooManyRequests, sixthResponse.status)
    }

    @Test
    fun `GET proposals without a token returns 401`() = TestAppBootstrap.runApp {
        val response = client.get(ApiRoutes.PROPOSALS)
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `POST proposals approve without a token returns 401`() = TestAppBootstrap.runApp {
        val response = client.post("${ApiRoutes.PROPOSALS}/1/approve")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `POST proposals reject without a token returns 401`() = TestAppBootstrap.runApp {
        val response = client.post("${ApiRoutes.PROPOSALS}/1/reject")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `GET proposals with a token respects the status filter`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val submitted = Json.decodeFromString<ProposalResponse>(
            submitProposal(validProposalRequest(name = "Filter Target")).bodyAsText(),
        )

        val pending = Json.decodeFromString<List<ProposalResponse>>(
            authorizedGet("${ApiRoutes.PROPOSALS}?status=PENDING", token).bodyAsText(),
        )
        assertTrue(pending.any { it.id == submitted.id })

        val approved = Json.decodeFromString<List<ProposalResponse>>(
            authorizedGet("${ApiRoutes.PROPOSALS}?status=APPROVED", token).bodyAsText(),
        )
        assertTrue(approved.none { it.id == submitted.id })
    }

    @Test
    fun `approve creates a real entry with history and flips the proposal to APPROVED`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val submitted = Json.decodeFromString<ProposalResponse>(
            submitProposal(validProposalRequest(name = "Approve Target")).bodyAsText(),
        )

        val approveResponse = approveProposal(submitted.id, token)
        assertEquals(HttpStatusCode.OK, approveResponse.status)

        val result = Json.decodeFromString<ApproveProposalResponse>(approveResponse.bodyAsText())
        assertEquals(ProposalStatus.APPROVED, result.proposal.status)
        assertEquals(result.entry.id, result.proposal.entryId)
        assertNotNull(result.proposal.reviewedAt)
        assertEquals(submitted.name, result.entry.name)

        val entries = Json.decodeFromString<List<EntryResponse>>(client.get(ApiRoutes.ENTRIES).bodyAsText())
        assertTrue(entries.any { it.id == result.entry.id && it.name == submitted.name })

        val history = Json.decodeFromString<List<HistoryResponse>>(
            client.get("${ApiRoutes.ENTRIES_HISTORY}?entryId=${result.entry.id}").bodyAsText(),
        )
        assertTrue(history.any { it.entryId == result.entry.id && it.changeType == ChangeType.CREATED })
    }

    @Test
    fun `approve with overrides uses the overridden fields, not the proposal's original ones`() =
        TestAppBootstrap.runApp {
            val token = TestAppBootstrap.loginToken(client)
            val submitted = Json.decodeFromString<ProposalResponse>(
                submitProposal(
                    validProposalRequest(name = "Override Target", description = "Original description."),
                ).bodyAsText(),
            )

            val approveResponse = client.post("${ApiRoutes.PROPOSALS}/${submitted.id}/approve") {
                header(HttpHeaders.Authorization, "Bearer $token")
                contentType(ContentType.Application.Json)
                setBody(Json.encodeToString(ApproveProposalRequest(description = "Admin-adjusted description.")))
            }
            assertEquals(HttpStatusCode.OK, approveResponse.status)

            val result = Json.decodeFromString<ApproveProposalResponse>(approveResponse.bodyAsText())
            assertEquals("Admin-adjusted description.", result.entry.description)
            assertEquals(submitted.name, result.entry.name)
        }

    @Test
    fun `approve with a name already on the radar returns 409 and leaves the proposal PENDING`() =
        TestAppBootstrap.runApp {
            val token = TestAppBootstrap.loginToken(client)
            val submitted = Json.decodeFromString<ProposalResponse>(
                submitProposal(validProposalRequest(name = SEEDED_DUPLICATE_NAME)).bodyAsText(),
            )

            val approveResponse = approveProposal(submitted.id, token)
            assertEquals(HttpStatusCode.Conflict, approveResponse.status)
            val error = Json.decodeFromString<ErrorResponse>(approveResponse.bodyAsText())
            assertEquals(ErrorCodes.DUPLICATE_NAME, error.error.code)

            val pending = Json.decodeFromString<List<ProposalResponse>>(
                authorizedGet("${ApiRoutes.PROPOSALS}?status=PENDING", token).bodyAsText(),
            )
            assertTrue(pending.any { it.id == submitted.id })
        }

    @Test
    fun `reject flips the proposal to REJECTED`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val submitted = Json.decodeFromString<ProposalResponse>(
            submitProposal(validProposalRequest(name = "Reject Target")).bodyAsText(),
        )

        val rejectResponse = client.post("${ApiRoutes.PROPOSALS}/${submitted.id}/reject") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        assertEquals(HttpStatusCode.OK, rejectResponse.status)

        val rejected = Json.decodeFromString<ProposalResponse>(rejectResponse.bodyAsText())
        assertEquals(ProposalStatus.REJECTED, rejected.status)
        assertNotNull(rejected.reviewedAt)
    }

    @Test
    fun `re-reviewing an already-reviewed proposal returns 409, not 200`() = TestAppBootstrap.runApp {
        val token = TestAppBootstrap.loginToken(client)
        val submitted = Json.decodeFromString<ProposalResponse>(
            submitProposal(validProposalRequest(name = "Double Review Target")).bodyAsText(),
        )

        val firstReject = client.post("${ApiRoutes.PROPOSALS}/${submitted.id}/reject") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }
        assertEquals(HttpStatusCode.OK, firstReject.status)

        val secondReview = approveProposal(submitted.id, token)
        assertEquals(HttpStatusCode.Conflict, secondReview.status)
        val error = Json.decodeFromString<ErrorResponse>(secondReview.bodyAsText())
        assertEquals(ErrorCodes.ALREADY_REVIEWED, error.error.code)
    }

    private suspend fun ApplicationTestBuilder.submitProposal(request: ProposalRequest): HttpResponse =
        client.post(ApiRoutes.PROPOSALS) {
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(request))
        }

    private suspend fun ApplicationTestBuilder.approveProposal(id: Int, token: String): HttpResponse =
        client.post("${ApiRoutes.PROPOSALS}/$id/approve") {
            header(HttpHeaders.Authorization, "Bearer $token")
        }

    private suspend fun ApplicationTestBuilder.authorizedGet(path: String, token: String): HttpResponse =
        client.get(path) {
            header(HttpHeaders.Authorization, "Bearer $token")
        }

    private suspend fun ApplicationTestBuilder.submitAndExpectValidationError(
        request: ProposalRequest,
    ): ErrorResponse {
        val response = submitProposal(request)
        assertEquals(HttpStatusCode.BadRequest, response.status)

        val error = Json.decodeFromString<ErrorResponse>(response.bodyAsText())
        assertEquals(ErrorCodes.VALIDATION_FAILED, error.error.code)
        return error
    }
}

private fun validProposalRequest(
    name: String = "Zig",
    quadrant: String = "LANGUAGES_FRAMEWORKS",
    ring: String = "ADOPT",
    description: String = "A valid test description.",
    submitterName: String? = "A Curious Coder",
): ProposalRequest = ProposalRequest(
    name = name,
    quadrant = quadrant,
    ring = ring,
    description = description,
    submitterName = submitterName,
)
