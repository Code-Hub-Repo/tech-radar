package gr.codehub.techradar.constants

data class AppConfig(
    val databaseUrl: String,
    val databaseUsername: String,
    val databasePassword: String,
    val databasePoolSize: Int,
    val jwtSecret: String,
    val jwtIssuer: String,
    val jwtAudience: String,
    val jwtRealm: String,
    val adminUsername: String,
    val adminPasswordHash: String,
    val port: Int,
    val corsAllowedOrigins: List<CorsOrigin>,
) {
    companion object {
        private const val DEFAULT_DATABASE_URL = "jdbc:postgresql://localhost:5432/techradar"
        private const val DEFAULT_DATABASE_USERNAME = "techradar"
        private const val DEFAULT_DATABASE_PASSWORD = ""
        private const val DEFAULT_DATABASE_POOL_SIZE = 10
        private const val DEFAULT_ADMIN_USERNAME = "admin"
        private const val DEFAULT_ADMIN_PASSWORD_HASH = ""
        private const val DEFAULT_PORT = 8080
        private const val DEFAULT_CORS_ALLOWED_ORIGINS =
            "https://radar.codehub.gr,http://localhost:5173,http://localhost:4173"
        private const val TEST_JWT_SECRET = "test-secret-not-for-production"

        // The ONLY function in the codebase that reads System.getenv(). Non-secret values fall back
        // to sane dev defaults; the JWT secret has none and hard-fails so a misconfigured deploy
        // never runs with a blank or guessable secret.
        fun fromEnvironment(): AppConfig = AppConfig(
            databaseUrl = System.getenv("DATABASE_URL") ?: DEFAULT_DATABASE_URL,
            databaseUsername = System.getenv("POSTGRES_USER") ?: DEFAULT_DATABASE_USERNAME,
            databasePassword = System.getenv("POSTGRES_PASSWORD") ?: DEFAULT_DATABASE_PASSWORD,
            databasePoolSize = System.getenv("DB_POOL_SIZE")?.toIntOrNull() ?: DEFAULT_DATABASE_POOL_SIZE,
            jwtSecret = readJwtSecret(),
            jwtIssuer = JwtConstants.ISSUER,
            jwtAudience = JwtConstants.AUDIENCE,
            jwtRealm = JwtConstants.REALM,
            adminUsername = System.getenv("ADMIN_USERNAME") ?: DEFAULT_ADMIN_USERNAME,
            adminPasswordHash = System.getenv("ADMIN_PASSWORD_HASH") ?: DEFAULT_ADMIN_PASSWORD_HASH,
            port = System.getenv("PORT")?.toIntOrNull() ?: DEFAULT_PORT,
            corsAllowedOrigins = parseCorsOrigins(
                System.getenv("CORS_ALLOWED_ORIGINS") ?: DEFAULT_CORS_ALLOWED_ORIGINS,
            ),
        )

        // Deliberately does NOT delegate to fromEnvironment() — tests must not depend on the ambient
        // environment providing a valid JWT_SECRET. Overrides the three database fields (typically a
        // Testcontainers-managed instance) and uses a fixed non-production JWT secret.
        fun forTest(
            databaseUrl: String,
            databaseUsername: String,
            databasePassword: String,
        ): AppConfig = AppConfig(
            databaseUrl = databaseUrl,
            databaseUsername = databaseUsername,
            databasePassword = databasePassword,
            databasePoolSize = DEFAULT_DATABASE_POOL_SIZE,
            jwtSecret = TEST_JWT_SECRET,
            jwtIssuer = JwtConstants.ISSUER,
            jwtAudience = JwtConstants.AUDIENCE,
            jwtRealm = JwtConstants.REALM,
            adminUsername = DEFAULT_ADMIN_USERNAME,
            adminPasswordHash = DEFAULT_ADMIN_PASSWORD_HASH,
            port = DEFAULT_PORT,
            corsAllowedOrigins = parseCorsOrigins(DEFAULT_CORS_ALLOWED_ORIGINS),
        )

        private fun readJwtSecret(): String {
            val secret = System.getenv("JWT_SECRET") ?: error("JWT_SECRET must be set")
            require(secret.length >= JwtConstants.JWT_SECRET_MIN_LENGTH) {
                "JWT_SECRET must be at least ${JwtConstants.JWT_SECRET_MIN_LENGTH} characters long"
            }
            return secret
        }

        private fun parseCorsOrigins(rawValue: String): List<CorsOrigin> {
            return rawValue.split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .map { origin ->
                    CorsOrigin(
                        scheme = origin.substringBefore("://"),
                        hostWithPort = origin.substringAfter("://"),
                    )
                }
        }
    }
}
