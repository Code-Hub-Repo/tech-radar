package gr.codehub.techradar.app.support

import at.favre.lib.crypto.bcrypt.BCrypt
import gr.codehub.techradar.constants.AppConfig
import gr.codehub.techradar.constants.SecurityConstants
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

// A plain Kotlin `object` is itself a JVM singleton, lazily initialized on first reference and
// reused across every test class in this module — true cross-suite sharing (one postgres:18-alpine
// container for the whole run), which a @Testcontainers/@Container per-class annotation would not
// achieve (that mechanism only shares a static field within one test class).
//
// Uses org.testcontainers.postgresql.PostgreSQLContainer (not the legacy, @Deprecated
// org.testcontainers.containers.PostgreSQLContainer<SELF>) — Testcontainers 2.x split every
// database module into its own package and dropped the self-referencing generic for this class,
// confirmed via javap against the real 2.0.5 jar rather than trusting pre-2.x tutorial snippets.
object TestPostgres {
    private const val POSTGRES_IMAGE = "postgres:18-alpine"
    private const val TEST_DATABASE_NAME = "techradar_test"
    private const val TEST_DATABASE_USERNAME = "test"
    private const val TEST_DATABASE_PASSWORD = "test"

    // AppConfig.forTest() only sets a real adminUsername ("admin"); its adminPasswordHash defaults
    // to "" (no valid bcrypt hash), so login tests need a real hash of a known plaintext. Computed
    // once via the same at.favre.lib:bcrypt library production code uses, at the same cost factor.
    const val TEST_ADMIN_PASSWORD = "tech-radar-test-admin-password"

    val container: PostgreSQLContainer = PostgreSQLContainer(DockerImageName.parse(POSTGRES_IMAGE))
        .withDatabaseName(TEST_DATABASE_NAME)
        .withUsername(TEST_DATABASE_USERNAME)
        .withPassword(TEST_DATABASE_PASSWORD)
        .apply { start() }

    private val testAdminPasswordHash: String by lazy {
        BCrypt.withDefaults().hashToString(SecurityConstants.BCRYPT_COST_FACTOR, TEST_ADMIN_PASSWORD.toCharArray())
    }

    fun toAppConfig(): AppConfig = AppConfig.forTest(
        databaseUrl = container.jdbcUrl,
        databaseUsername = container.username,
        databasePassword = container.password,
    ).copy(adminPasswordHash = testAdminPasswordHash)
}
