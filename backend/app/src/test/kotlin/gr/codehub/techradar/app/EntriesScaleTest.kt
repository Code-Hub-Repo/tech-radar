package gr.codehub.techradar.app

import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.app.support.TestAppBootstrap
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json

private const val SEEDED_ENTRY_COUNT = 20
private const val BULK_INSERT_COUNT = 80
private const val TOTAL_ENTRY_COUNT = SEEDED_ENTRY_COUNT + BULK_INSERT_COUNT // 100
private const val BULK_NAME_PREFIX = "Bulk Entry "
private const val LATENCY_SAMPLE_REQUESTS = 20

// This ceiling is deliberately looser than API-08's real <200ms p95 target because in-test/CI
// wall-clock timing is noisy (shared runner, cold caches, container overhead over Testcontainers'
// dynamic port mapping). It exists only to catch pathological/quadratic regressions as the entry
// count grows to 100 — the strict <200ms p95 measurement is a manual dev-server check in this
// plan's <verification> section, not an automated assertion.
private const val LOOSE_LATENCY_CEILING_MILLIS = 1000L

// API-08 at 100 entries: bulk-inserts to 100 total, asserts every returned entry carries a correct
// movement field, then samples GET /api/entries latency against a CI-variance-safe ceiling.
class EntriesScaleTest {

    @Test
    fun `100 entries all report a correct movement field and GET latency stays under the CI-safe ceiling`() =
        TestAppBootstrap.runApp {
            val token = TestAppBootstrap.loginToken(client)

            repeat(BULK_INSERT_COUNT) { index ->
                val quadrant = Quadrant.entries[index % Quadrant.entries.size]
                val ring = Ring.entries[index % Ring.entries.size]
                val request = EntryRequest(
                    name = "$BULK_NAME_PREFIX${(index + 1).toString().padStart(3, '0')}",
                    quadrant = quadrant.apiName,
                    ring = ring.apiName,
                    description = "A bulk-inserted test description for scale verification.",
                )
                val response = client.post(ApiRoutes.ENTRIES) {
                    header(HttpHeaders.Authorization, "Bearer $token")
                    contentType(ContentType.Application.Json)
                    setBody(Json.encodeToString(request))
                }
                assertEquals(HttpStatusCode.Created, response.status)
            }

            val entries = Json.decodeFromString<List<EntryResponse>>(client.get(ApiRoutes.ENTRIES).bodyAsText())
            assertEquals(TOTAL_ENTRY_COUNT, entries.size)
            assertTrue(entries.all { it.movement in Movement.entries })

            val bulkEntries = entries.filter { it.name.startsWith(BULK_NAME_PREFIX) }
            assertEquals(BULK_INSERT_COUNT, bulkEntries.size)
            assertTrue(bulkEntries.all { it.movement == Movement.NONE })

            // Plain System.nanoTime() (not kotlin.time.measureTime) — measureTime's block parameter
            // is a non-suspend () -> Unit, and suspend HTTP calls need a suspend-safe measurement.
            val sampleDurationsMillis = (1..LATENCY_SAMPLE_REQUESTS).map {
                val startNanos = System.nanoTime()
                val response = client.get(ApiRoutes.ENTRIES)
                assertEquals(HttpStatusCode.OK, response.status)
                (System.nanoTime() - startNanos) / NANOS_PER_MILLI
            }.sorted()

            // p95 over a small sample (n=20): index 19 (the max) is a standard, simple
            // approximation of the 95th percentile for this sample size.
            val p95Index = (sampleDurationsMillis.size * PERCENTILE_95_FRACTION).toInt()
                .coerceAtMost(sampleDurationsMillis.size - 1)
            val p95Millis = sampleDurationsMillis[p95Index]

            assertTrue(
                p95Millis < LOOSE_LATENCY_CEILING_MILLIS,
                "p95 latency over $LATENCY_SAMPLE_REQUESTS requests at $TOTAL_ENTRY_COUNT entries was " +
                    "${p95Millis}ms, expected under ${LOOSE_LATENCY_CEILING_MILLIS}ms (loose CI ceiling; " +
                    "see the strict <200ms manual check in the plan's verification section)",
            )
        }
}

private const val PERCENTILE_95_FRACTION = 0.95
private const val NANOS_PER_MILLI = 1_000_000L
