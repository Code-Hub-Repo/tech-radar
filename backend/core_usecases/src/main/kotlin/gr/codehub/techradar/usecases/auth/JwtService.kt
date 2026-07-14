package gr.codehub.techradar.usecases.auth

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import gr.codehub.techradar.constants.AppConfig
import gr.codehub.techradar.constants.JwtConstants
import gr.codehub.techradar.usecases.auth.model.TokenResult
import kotlin.time.Clock
import kotlin.time.Duration.Companion.hours
import kotlin.time.toJavaInstant

// Issues the token; app/plugins/Authentication.kt builds the matching verifier from the same
// AppConfig — issuer/audience/secret must never diverge between the two (T-01-12 mitigation).
class JwtService(
    private val config: AppConfig,
) {
    fun issue(username: String): TokenResult {
        val expiresAt = Clock.System.now().plus(JwtConstants.EXPIRY_HOURS.hours)
        val token = JWT.create()
            .withIssuer(config.jwtIssuer)
            .withAudience(config.jwtAudience)
            .withClaim(JwtConstants.USERNAME_CLAIM, username)
            .withExpiresAt(expiresAt.toJavaInstant())
            .sign(Algorithm.HMAC256(config.jwtSecret))

        return TokenResult(token = token, expiresAt = expiresAt)
    }
}
