// core_db — Exposed table mirrors, Flyway migrations, HikariCP connection pooling.

dependencies {
    implementation(project(":core_constants"))

    implementation(libs.exposed.core)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.java.time)
    implementation(libs.hikaricp)
    implementation(libs.postgresql)
    implementation(libs.flyway.core)
    implementation(libs.flyway.database.postgresql)
}
