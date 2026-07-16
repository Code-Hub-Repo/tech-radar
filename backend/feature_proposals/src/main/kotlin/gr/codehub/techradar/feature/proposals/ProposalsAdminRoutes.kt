package gr.codehub.techradar.feature.proposals

import gr.codehub.techradar.api.ApproveProposalRequest
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.ProposalStatus
import gr.codehub.techradar.usecases.ApproveProposalUseCase
import gr.codehub.techradar.usecases.GetProposalsUseCase
import gr.codehub.techradar.usecases.RejectProposalUseCase
import io.ktor.http.HttpStatusCode
import io.ktor.server.auth.authenticate
import io.ktor.server.plugins.CannotTransformContentToTypeException
import io.ktor.server.request.receiveNullable
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import org.koin.ktor.ext.inject

private const val AUTH_JWT_PROVIDER_NAME = "auth-jwt"
private const val ID_PARAM = "id"
private const val STATUS_QUERY_PARAM = "status"

// JWT-guarded moderation surface (PROP-02/03/04) — every verb here is nested inside
// authenticate("auth-jwt") { }; no token or an invalid/expired one -> 401 before a handler ever
// runs (mirrors EntriesWriteRoutes.kt). A malformed {id} throws NumberFormatException from
// .toInt(), and an unrecognized ?status= throws IllegalArgumentException from
// ProposalStatus.fromApiName — both left uncaught here so StatusPages maps them to 400
// INVALID_PARAMETER, the same "malformed but harmless input" convention EntriesReadRoutes.kt
// already established for ?entryId=.
fun Route.proposalsAdminRoutes() {
    val getProposals by inject<GetProposalsUseCase>()
    val approveProposal by inject<ApproveProposalUseCase>()
    val rejectProposal by inject<RejectProposalUseCase>()

    authenticate(AUTH_JWT_PROVIDER_NAME) {
        get(ApiRoutes.PROPOSALS) {
            val status = call.request.queryParameters[STATUS_QUERY_PARAM]?.let { ProposalStatus.fromApiName(it) }
            getProposals(status)
                .onSuccess { call.respond(HttpStatusCode.OK, it) }
                .onFailure { throw it }
        }

        post(ApiRoutes.PROPOSAL_APPROVE) {
            val id = requireNotNull(call.parameters[ID_PARAM]) { "id path parameter is required" }.toInt()
            // Body is optional (admin may approve with zero overrides). receiveNullable<T>() only
            // reliably returns null when a Content-Type IS present with zero body bytes; a request
            // with NO Content-Type header at all (curl/no-body POST) throws
            // CannotTransformContentToTypeException instead of returning null — verified empirically
            // against this exact Ktor 3.5.1 test-host stack. Both "genuinely no body" cases collapse
            // to the same "no overrides" outcome here.
            val overrides = try {
                call.receiveNullable<ApproveProposalRequest>() ?: ApproveProposalRequest()
            } catch (e: CannotTransformContentToTypeException) {
                ApproveProposalRequest()
            }
            approveProposal(id, overrides)
                .onSuccess { call.respond(HttpStatusCode.OK, it) }
                .onFailure { throw it }
        }

        post(ApiRoutes.PROPOSAL_REJECT) {
            val id = requireNotNull(call.parameters[ID_PARAM]) { "id path parameter is required" }.toInt()
            rejectProposal(id)
                .onSuccess { call.respond(HttpStatusCode.OK, it) }
                .onFailure { throw it }
        }
    }
}
