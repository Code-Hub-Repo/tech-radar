package gr.codehub.techradar.feature.auth

import gr.codehub.techradar.api.ErrorBody
import gr.codehub.techradar.api.ErrorResponse
import gr.codehub.techradar.api.LoginRequest
import gr.codehub.techradar.api.LoginResponse
import gr.codehub.techradar.constants.ApiRoutes
import gr.codehub.techradar.constants.ErrorCodes
import gr.codehub.techradar.constants.RateLimitConstants
import gr.codehub.techradar.usecases.auth.LoginUseCase
import io.ktor.http.HttpStatusCode
import io.ktor.server.plugins.ratelimit.RateLimitName
import io.ktor.server.plugins.ratelimit.rateLimit
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import org.koin.ktor.ext.inject

private const val UNAUTHORIZED_MESSAGE = "Invalid username or password"

// Public — you can't need a token to get one, so this is never wrapped in authenticate { }.
// Wrapped in the login rate limiter instead (T-01-11 mitigation): 5 requests/minute per remote
// address, 6th -> 429.
fun Route.authRoutes() {
    val loginUseCase by inject<LoginUseCase>()

    rateLimit(RateLimitName(RateLimitConstants.LOGIN_LIMITER_NAME)) {
        post(ApiRoutes.AUTH_LOGIN) {
            val request = call.receive<LoginRequest>()
            loginUseCase(request.username, request.password)
                .onSuccess { result ->
                    call.respond(
                        status = HttpStatusCode.OK,
                        message = LoginResponse(token = result.token, expiresAt = result.expiresAt),
                    )
                }
                .onFailure {
                    // Generic 401 regardless of failure cause — never reveals which part of the
                    // credential pair was wrong (T-01-13 mitigation).
                    call.respond(
                        status = HttpStatusCode.Unauthorized,
                        message = ErrorResponse(
                            error = ErrorBody(
                                code = ErrorCodes.UNAUTHORIZED,
                                message = UNAUTHORIZED_MESSAGE,
                            ),
                        ),
                    )
                }
        }
    }
}
