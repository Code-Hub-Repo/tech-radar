package gr.codehub.techradar.usecases.auth

import at.favre.lib.crypto.bcrypt.BCrypt
import gr.codehub.techradar.constants.AppConfig
import gr.codehub.techradar.usecases.auth.model.TokenResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// Never reveals whether the username or the password was wrong (T-01-13 mitigation) — a single
// generic failure for both, and bcrypt always runs (never short-circuited on a bad username) so
// response timing doesn't leak which part of the credential pair was incorrect.
class LoginUseCase(
    private val config: AppConfig,
    private val jwtService: JwtService,
) {
    suspend operator fun invoke(username: String, password: String): Result<TokenResult> = runCatching {
        val isUsernameValid = username == config.adminUsername
        // bcrypt is CPU-bound — dispatched off the event loop, never Dispatchers.IO.
        val isPasswordValid = withContext(Dispatchers.Default) {
            BCrypt.verifyer().verify(password.toCharArray(), config.adminPasswordHash).verified
        }

        if (!isUsernameValid || !isPasswordValid) {
            throw InvalidCredentialsException()
        }

        jwtService.issue(username)
    }
}

class InvalidCredentialsException : Exception("Invalid username or password")
