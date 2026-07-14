package gr.codehub.techradar.feature.entries

import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.usecases.CreateEntryUseCase
import gr.codehub.techradar.usecases.DeleteEntryUseCase
import gr.codehub.techradar.usecases.UpdateEntryUseCase
import io.ktor.http.HttpStatusCode
import io.ktor.server.auth.authenticate
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import org.koin.ktor.ext.inject

private const val AUTH_JWT_PROVIDER_NAME = "auth-jwt"
private const val ID_PARAM = "id"

// JWT-guarded (T-01-15) — every verb here is nested inside authenticate("auth-jwt") { }; no token
// or an invalid/expired one -> 401 before a handler ever runs. A malformed {id} throws
// NumberFormatException from requireNotNull(...).toInt(), left uncaught here so 01-03's
// StatusPages maps it to 400 INVALID_PARAMETER -- a nonexistent-but-numeric id is a 404 instead,
// produced by the UseCase's own NotFoundException (never confused with the malformed-id case).
fun Route.entriesWriteRoutes() {
    val createEntry by inject<CreateEntryUseCase>()
    val updateEntry by inject<UpdateEntryUseCase>()
    val deleteEntry by inject<DeleteEntryUseCase>()

    authenticate(AUTH_JWT_PROVIDER_NAME) {
        post(ApiRoutes.ENTRIES) {
            val request = call.receive<EntryRequest>()
            createEntry(request)
                .onSuccess { call.respond(HttpStatusCode.Created, it) }
                .onFailure { throw it }
        }

        put(ApiRoutes.ENTRY_BY_ID) {
            val id = requireNotNull(call.parameters[ID_PARAM]) { "id path parameter is required" }.toInt()
            val request = call.receive<EntryRequest>()
            updateEntry(id, request)
                .onSuccess { call.respond(HttpStatusCode.OK, it) }
                .onFailure { throw it }
        }

        delete(ApiRoutes.ENTRY_BY_ID) {
            val id = requireNotNull(call.parameters[ID_PARAM]) { "id path parameter is required" }.toInt()
            deleteEntry(id)
                .onSuccess { call.respond(HttpStatusCode.NoContent) }
                .onFailure { throw it }
        }
    }
}
