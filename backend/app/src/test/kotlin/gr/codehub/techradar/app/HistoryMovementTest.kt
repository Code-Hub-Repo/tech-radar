package gr.codehub.techradar.app

import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.api.HistoryResponse
import gr.codehub.techradar.app.support.TestAppBootstrap
import gr.codehub.techradar.app.support.TestPostgres
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.ChangeType
import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import gr.codehub.techradar.db.model.Entry
import gr.codehub.techradar.db.model.HistoryRow
import gr.codehub.techradar.usecases.movement.MovementCalculator
import io.ktor.client.request.delete
import io.ktor.client.request.get
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
import java.sql.DriverManager
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.Clock
import kotlin.time.Duration.Companion.days
import kotlinx.serialization.json.Json

private const val MOVEMENT_ENTRY_NAME = "Movement Probe"

// Drives the full CREATED -> UPDATED -> UPDATED -> DELETED lifecycle over real HTTP against the
// real Testcontainers-backed app, asserting exactly one new history row per mutation and the
// resulting IN/OUT movement on GET /api/entries. The window-expiry case is asserted directly
// against the pure MovementCalculator (no DB/HTTP involved) per the plan's own allowance, since
// the running app's clock can't be fast-forwarded 90+ days.
class HistoryMovementTest {

    @Test
    fun `create then update then update then delete appends exactly one history row per mutation and reports IN OUT movement`() =
        TestAppBootstrap.runApp {
            val token = TestAppBootstrap.loginToken(client)

            // 1. Create — starts on HOLD, one CREATED row.
            val createResponse = client.post(ApiRoutes.ENTRIES) {
                header(HttpHeaders.Authorization, "Bearer $token")
                contentType(ContentType.Application.Json)
                setBody(Json.encodeToString(entryRequest(ring = "HOLD")))
            }
            assertEquals(HttpStatusCode.Created, createResponse.status)
            val entryId = Json.decodeFromString<EntryResponse>(createResponse.bodyAsText()).id

            val historyAfterCreate = historyFor(token, entryId)
            assertEquals(1, historyAfterCreate.size)
            assertEquals(ChangeType.CREATED, historyAfterCreate.first().changeType)

            // MovementCalculator short-circuits to NONE for isNew entries, and nothing in the write
            // path ever clears is_new after creation (confirmed live in 01-07) — flip it directly,
            // exactly like 01-07's own manual movement verification did, so the ring-changing PUTs
            // below actually exercise the IN/OUT computation rather than the isNew short-circuit.
            clearIsNewFlag(entryId)

            // 2. Update HOLD -> ADOPT (index 3 -> 0, decreased) — expect movement IN, one new row.
            val updateToAdopt = client.put("${ApiRoutes.ENTRIES}/$entryId") {
                header(HttpHeaders.Authorization, "Bearer $token")
                contentType(ContentType.Application.Json)
                setBody(Json.encodeToString(entryRequest(ring = "ADOPT")))
            }
            assertEquals(HttpStatusCode.OK, updateToAdopt.status)

            val historyAfterFirstUpdate = historyFor(token, entryId)
            assertEquals(2, historyAfterFirstUpdate.size)
            assertEquals(ChangeType.UPDATED, historyAfterFirstUpdate.first().changeType)
            assertEquals(Movement.IN, movementFor(entryId))

            // 3. Update ADOPT -> HOLD (index 0 -> 3, increased) — expect movement OUT, one new row.
            val updateToHold = client.put("${ApiRoutes.ENTRIES}/$entryId") {
                header(HttpHeaders.Authorization, "Bearer $token")
                contentType(ContentType.Application.Json)
                setBody(Json.encodeToString(entryRequest(ring = "HOLD")))
            }
            assertEquals(HttpStatusCode.OK, updateToHold.status)

            val historyAfterSecondUpdate = historyFor(token, entryId)
            assertEquals(3, historyAfterSecondUpdate.size)
            assertEquals(ChangeType.UPDATED, historyAfterSecondUpdate.first().changeType)
            assertEquals(Movement.OUT, movementFor(entryId))

            // 4. Delete — one DELETED row, surviving after the entry itself is gone.
            val deleteResponse = client.delete("${ApiRoutes.ENTRIES}/$entryId") {
                header(HttpHeaders.Authorization, "Bearer $token")
            }
            assertEquals(HttpStatusCode.NoContent, deleteResponse.status)

            val historyAfterDelete = historyFor(token, entryId)
            assertEquals(4, historyAfterDelete.size)
            assertEquals(ChangeType.DELETED, historyAfterDelete.first().changeType)

            val remainingEntries = Json.decodeFromString<List<EntryResponse>>(client.get(ApiRoutes.ENTRIES).bodyAsText())
            assertEquals(false, remainingEntries.any { it.id == entryId })
        }

    @Test
    fun `a ring change older than the movement window computes NONE via the pure MovementCalculator`() {
        val entry = Entry(
            id = 1,
            name = MOVEMENT_ENTRY_NAME,
            quadrant = Quadrant.TOOLS,
            ring = Ring.ADOPT,
            description = "A valid test description.",
            isNew = false,
            createdAt = Clock.System.now().minus(200.days),
            updatedAt = Clock.System.now().minus(100.days),
        )
        val expiredChange = Clock.System.now().minus(100.days)
        val recentHistoryDesc = listOf(
            HistoryRow(
                id = 2,
                entryId = 1,
                name = MOVEMENT_ENTRY_NAME,
                quadrant = Quadrant.TOOLS,
                ring = Ring.ADOPT,
                description = "A valid test description.",
                isNew = false,
                changeType = ChangeType.UPDATED,
                changedAt = expiredChange,
            ),
            HistoryRow(
                id = 1,
                entryId = 1,
                name = MOVEMENT_ENTRY_NAME,
                quadrant = Quadrant.TOOLS,
                ring = Ring.HOLD,
                description = "A valid test description.",
                isNew = false,
                changeType = ChangeType.CREATED,
                changedAt = Clock.System.now().minus(200.days),
            ),
        )

        assertEquals(Movement.NONE, MovementCalculator.computeMovement(entry, recentHistoryDesc))
    }
}

private fun entryRequest(ring: String): EntryRequest = EntryRequest(
    name = MOVEMENT_ENTRY_NAME,
    quadrant = "TOOLS",
    ring = ring,
    description = "A valid test description.",
)

private suspend fun ApplicationTestBuilder.historyFor(token: String, entryId: Int): List<HistoryResponse> {
    val response = client.get("${ApiRoutes.ENTRIES_HISTORY}?entryId=$entryId") {
        header(HttpHeaders.Authorization, "Bearer $token")
    }
    assertEquals(HttpStatusCode.OK, response.status)
    return Json.decodeFromString(response.bodyAsText())
}

private suspend fun ApplicationTestBuilder.movementFor(entryId: Int): Movement {
    val entries = Json.decodeFromString<List<EntryResponse>>(client.get(ApiRoutes.ENTRIES).bodyAsText())
    return entries.first { it.id == entryId }.movement
}

private fun clearIsNewFlag(entryId: Int) {
    DriverManager.getConnection(
        TestPostgres.container.jdbcUrl,
        TestPostgres.container.username,
        TestPostgres.container.password,
    ).use { connection ->
        connection.prepareStatement("UPDATE entries SET is_new = false WHERE id = ?").use { statement ->
            statement.setInt(1, entryId)
            statement.executeUpdate()
        }
    }
}
