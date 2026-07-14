package gr.codehub.techradar.app.support

import gr.codehub.techradar.api.LoginRequest
import gr.codehub.techradar.api.LoginResponse
import gr.codehub.techradar.app.module
import gr.codehub.techradar.constants.ApiRoutes
import io.ktor.client.HttpClient
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import java.sql.DriverManager
import kotlinx.serialization.json.Json

// Test-only bootstrap. The Postgres CONTAINER is a suite-wide singleton (TestPostgres), but the
// Ktor Application/Koin/RateLimit state is NOT shared — testApplication{} boots a fresh Application
// on every call, so only the DATA in the shared container needs resetting between tests.
object TestAppBootstrap {

    // Resets data, then boots a fresh Application against the shared container and runs `block`.
    // Every test starts from a clean, freshly re-seeded 20-entry baseline.
    fun runApp(block: suspend ApplicationTestBuilder.() -> Unit) {
        resetData()
        testApplication {
            application { module(TestPostgres.toAppConfig()) }
            block()
        }
    }

    // Logs in with the known test admin credentials (TestPostgres.toAppConfig() carries a real
    // bcrypt hash of TEST_ADMIN_PASSWORD) and returns the raw bearer token for write-route tests.
    suspend fun loginToken(client: HttpClient): String {
        val adminUsername = TestPostgres.toAppConfig().adminUsername
        val response = client.post(ApiRoutes.AUTH_LOGIN) {
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(LoginRequest(username = adminUsername, password = TestPostgres.TEST_ADMIN_PASSWORD)))
        }
        return Json.decodeFromString<LoginResponse>(response.bodyAsText()).token
    }

    // Truncates entries + entry_history directly via JDBC — no Koin/Exposed dependency needed here,
    // since this must be safe to call before any Application has ever booted (the very first test's
    // very first call, before Flyway has created the schema yet). to_regclass() returns null for a
    // not-yet-existing table, so the truncate is skipped rather than throwing on that first call.
    fun resetData() {
        DriverManager.getConnection(
            TestPostgres.container.jdbcUrl,
            TestPostgres.container.username,
            TestPostgres.container.password,
        ).use { connection ->
            connection.createStatement().use { statement ->
                val entriesTableExists = statement.executeQuery(
                    "SELECT to_regclass('public.entries') IS NOT NULL AS table_exists",
                ).use { resultSet -> resultSet.next() && resultSet.getBoolean("table_exists") }

                if (entriesTableExists) {
                    statement.execute("TRUNCATE TABLE entry_history, entries RESTART IDENTITY CASCADE")
                }
            }
        }
    }
}
