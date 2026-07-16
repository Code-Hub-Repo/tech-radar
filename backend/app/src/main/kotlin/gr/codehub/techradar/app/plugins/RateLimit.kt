package gr.codehub.techradar.app.plugins

import gr.codehub.techradar.constants.RateLimitConstants
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.origin
import io.ktor.server.plugins.ratelimit.RateLimit
import io.ktor.server.plugins.ratelimit.RateLimitName
import kotlin.time.Duration.Companion.minutes

// Fixed-window limiter keyed by remote address, registered under RateLimitConstants.LOGIN_LIMITER_NAME
// and applied to POST /api/auth/login (AuthRoutes.kt) — caps credential-stuffing/brute-force attempts
// (T-01-11 mitigation). The 6th request within the window gets Ktor's default 429 response.
//
// A second named limiter (RateLimitConstants.PROPOSALS_LIMITER_NAME) guards the public
// POST /api/proposals (ProposalsPublicRoutes.kt) — 5 requests/15 min per remote address
// (CONTEXT.md), the primary defense for that public write endpoint. Both limiters coexist under
// one install(RateLimit) block; RateLimitName keeps their buckets independent.
fun Application.configureRateLimit() {
    install(RateLimit) {
        register(RateLimitName(RateLimitConstants.LOGIN_LIMITER_NAME)) {
            rateLimiter(
                limit = RateLimitConstants.LOGIN_LIMIT,
                refillPeriod = RateLimitConstants.LOGIN_WINDOW_MINUTES.minutes,
            )
            requestKey { call -> call.request.origin.remoteHost }
        }
        register(RateLimitName(RateLimitConstants.PROPOSALS_LIMITER_NAME)) {
            rateLimiter(
                limit = RateLimitConstants.PROPOSALS_LIMIT,
                refillPeriod = RateLimitConstants.PROPOSALS_WINDOW_MINUTES.minutes,
            )
            requestKey { call -> call.request.origin.remoteHost }
        }
    }
}
