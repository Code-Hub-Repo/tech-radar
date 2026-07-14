// core_db — Exposed table mirrors, Flyway migrations, HikariCP connection pooling.

dependencies {
    implementation(project(":core_constants"))

    implementation(libs.exposed.core)
    // api: core_db's own public functions (createHikariDataSource, connectDatabase,
    // EntriesRepository/HistoryRepository constructors) return/accept these types directly, so
    // consumers like app need them on their own compile classpath, not just the runtime one.
    api(libs.exposed.jdbc)
    api(libs.hikaricp)
    implementation(libs.exposed.java.time)
    implementation(libs.postgresql)
    implementation(libs.flyway.core)
    implementation(libs.flyway.database.postgresql)
    implementation(libs.kotlinx.coroutines.core)
}
