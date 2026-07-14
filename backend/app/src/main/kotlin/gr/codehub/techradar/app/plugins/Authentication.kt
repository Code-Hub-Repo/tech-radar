package gr.codehub.techradar.app.plugins

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import gr.codehub.techradar.api.ErrorBody
import gr.codehub.techradar.api.ErrorResponse
import gr.codehub.techradar.constants.AppConfig
import gr.codehub.techradar.constants.ErrorCodes
import gr.codehub.techradar.constants.JwtConstants
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.response.respond

private const val AUTH_JWT_PROVIDER_NAME = "auth-jwt"
private const val UNAUTHORIZED_MESSAGE = "Token is not valid or has expired"

// Guard for write routes (01-07's authenticate("auth-jwt") { }). The verifier is built from the
// exact same AppConfig JwtService signs with — issuer/audience/secret can never diverge
// (T-01-12 mitigation).
fun Application.configureAuthentication(config: AppConfig) {
    // Fail fast on a weak secret at the point of use, not just at AppConfig construction — defense
    // in depth for T-01-12 (JWT forgery / alg-confusion).
    require(config.jwtSecret.length >= JwtConstants.JWT_SECRET_MIN_LENGTH) {
        "JWT_SECRET must be at least ${JwtConstants.JWT_SECRET_MIN_LENGTH} characters long"
    }

    install(Authentication) {
        jwt(AUTH_JWT_PROVIDER_NAME) {
            realm = config.jwtRealm
            verifier(
                JWT.require(Algorithm.HMAC256(config.jwtSecret))
                    .withIssuer(config.jwtIssuer)
                    .withAudience(config.jwtAudience)
                    .build(),
            )
            validate { credential ->
                if (credential.payload.audience.contains(config.jwtAudience)) {
                    JWTPrincipal(credential.payload)
                } else {
                    null
                }
            }
            challenge { _, _ ->
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
