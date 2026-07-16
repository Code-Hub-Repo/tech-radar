package gr.codehub.techradar.feature.proposals

import gr.codehub.techradar.api.ProposalRequest
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.RateLimitConstants
import gr.codehub.techradar.usecases.SubmitProposalUseCase
import io.ktor.http.HttpStatusCode
import io.ktor.server.plugins.ratelimit.RateLimitName
import io.ktor.server.plugins.ratelimit.rateLimit
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import org.koin.ktor.ext.inject

// Public — no authenticate {} wrapper: anyone can suggest a technology (PROP-01). The public NEVER
// writes to entries directly, only ever to the moderated proposals queue (SubmitProposalUseCase).
// Wrapped in the proposals rate limiter instead (5 requests/15 min per remote address, CONTEXT.md)
// — the primary defense for this public write endpoint, backstopped by ProposalValidator's field
// checks. Mirrors AuthRoutes.kt's own rateLimit { post { } } shape.
fun Route.proposalsPublicRoutes() {
    val submitProposal by inject<SubmitProposalUseCase>()

    rateLimit(RateLimitName(RateLimitConstants.PROPOSALS_LIMITER_NAME)) {
        post(ApiRoutes.PROPOSALS) {
            val request = call.receive<ProposalRequest>()
            submitProposal(request)
                .onSuccess { call.respond(HttpStatusCode.Created, it) }
                .onFailure { throw it }
        }
    }
}
