package gr.codehub.techradar.feature.entries

import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.usecases.GetEntriesUseCase
import gr.codehub.techradar.usecases.GetHistoryUseCase
import io.ktor.http.HttpStatusCode
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import org.koin.ktor.ext.inject

// Public — no authenticate {} wrapper. Write routes (POST/PUT/DELETE) land in 01-07, wrapped
// separately.
fun Route.entriesReadRoutes() {
    val getEntries by inject<GetEntriesUseCase>()
    val getHistory by inject<GetHistoryUseCase>()

    get(ApiRoutes.ENTRIES) {
        getEntries()
            .onSuccess { call.respond(HttpStatusCode.OK, it) }
            .onFailure { throw it }
    }

    get(ApiRoutes.ENTRIES_HISTORY) {
        // Absent -> null (unfiltered). Present but non-numeric -> toInt() throws
        // NumberFormatException, left uncaught here so 01-03's StatusPages maps it to
        // 400 INVALID_PARAMETER — never swallowed into a 404 or 500.
        val entryId = call.request.queryParameters[ENTRY_ID_PARAM]?.toInt()
        getHistory(entryId)
            .onSuccess { call.respond(HttpStatusCode.OK, it) }
            .onFailure { throw it }
    }
}

private const val ENTRY_ID_PARAM = "entryId"
