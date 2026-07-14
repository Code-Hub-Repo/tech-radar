package gr.codehub.techradar.app

import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.api.ErrorResponse
import gr.codehub.techradar.api.HistoryResponse
import gr.codehub.techradar.app.support.TestAppBootstrap
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.ErrorCodes
import gr.codehub.techradar.constants.Movement
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json

private const val SEEDED_ENTRY_COUNT = 20
private const val QUADRANT_COUNT = 4
private const val ENTRIES_PER_QUADRANT = 5

// Public GET /api/entries and /api/entries/history against the real Testcontainers-backed app —
// TestAppBootstrap.runApp wraps Ktor's testApplication { } with a shared, freshly re-seeded
// PostgreSQL 18 container for every test in this class.
class EntriesReadTest {

    @Test
    fun `GET entries returns 20 seeded entries with movement NONE, 5 per quadrant`() = TestAppBootstrap.runApp {
        val response = client.get(ApiRoutes.ENTRIES)
        assertEquals(HttpStatusCode.OK, response.status)

        val entries = Json.decodeFromString<List<EntryResponse>>(response.bodyAsText())
        assertEquals(SEEDED_ENTRY_COUNT, entries.size)
        assertTrue(entries.all { it.movement == Movement.NONE })
        assertTrue(entries.all { it.isNew })

        val byQuadrant = entries.groupBy { it.quadrant }
        assertEquals(QUADRANT_COUNT, byQuadrant.size)
        assertTrue(byQuadrant.values.all { it.size == ENTRIES_PER_QUADRANT })
    }

    @Test
    fun `GET entries history returns rows newest-first`() = TestAppBootstrap.runApp {
        val response = client.get(ApiRoutes.ENTRIES_HISTORY)
        assertEquals(HttpStatusCode.OK, response.status)

        val history = Json.decodeFromString<List<HistoryResponse>>(response.bodyAsText())
        assertEquals(SEEDED_ENTRY_COUNT, history.size)

        val timestamps = history.map { it.changedAt }
        assertEquals(timestamps.sortedDescending(), timestamps)
    }

    @Test
    fun `GET entries history filtered by entryId returns only that entry's rows`() = TestAppBootstrap.runApp {
        val allEntries = Json.decodeFromString<List<EntryResponse>>(client.get(ApiRoutes.ENTRIES).bodyAsText())
        val targetId = allEntries.first().id

        val response = client.get("${ApiRoutes.ENTRIES_HISTORY}?entryId=$targetId")
        assertEquals(HttpStatusCode.OK, response.status)

        val history = Json.decodeFromString<List<HistoryResponse>>(response.bodyAsText())
        assertTrue(history.isNotEmpty())
        assertTrue(history.all { it.entryId == targetId })
    }

    @Test
    fun `GET entries history with malformed entryId returns 400 INVALID_PARAMETER`() = TestAppBootstrap.runApp {
        val response = client.get("${ApiRoutes.ENTRIES_HISTORY}?entryId=abc")
        assertEquals(HttpStatusCode.BadRequest, response.status)

        val error = Json.decodeFromString<ErrorResponse>(response.bodyAsText())
        assertEquals(ErrorCodes.INVALID_PARAMETER, error.error.code)
    }
}
