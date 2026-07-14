// app — entry point only: Ktor Application, Koin wiring, route registration. No business logic.

plugins {
    alias(libs.plugins.ktor)
    alias(libs.plugins.kotlin.serialization)
}

application {
    mainClass.set("gr.codehub.techradar.app.ApplicationKt")
}

dependencies {
    implementation(project(":feature_entries"))
    implementation(project(":feature_auth"))
    implementation(project(":core_usecases"))
    implementation(project(":core_api"))
    implementation(project(":core_db"))
    implementation(project(":core_constants"))

    implementation(libs.ktor.server.netty)
    implementation(libs.ktor.server.auth)
    implementation(libs.ktor.server.auth.jwt)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.cors)
    implementation(libs.ktor.server.call.logging)
    implementation(libs.ktor.server.status.pages)
    implementation(libs.ktor.server.rate.limit)
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.koin.ktor)
    implementation(libs.logback.classic)

    // SHIP-01 endpoint suite (Testcontainers + real PostgreSQL 18) — test scope only.
    testImplementation(libs.ktor.server.test.host)
    testImplementation(kotlin("test-junit5"))
    testImplementation(platform(libs.testcontainers.bom))
    testImplementation(libs.testcontainers.postgresql)
    // bcrypt is only `implementation` inside core_usecases (not `api`), so it isn't compile-visible
    // here transitively; TestPostgres needs it directly to hash a known test admin password.
    testImplementation(libs.bcrypt)
}
