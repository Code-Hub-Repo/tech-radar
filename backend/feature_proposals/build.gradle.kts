// feature_proposals — public submit + admin moderation route handlers. Delegates all logic to core_usecases.

dependencies {
    implementation(project(":core_usecases"))
    implementation(project(":core_api"))
    implementation(project(":core_constants"))

    implementation(libs.ktor.server.core)
    // authenticate("auth-jwt") { } guards the admin list/approve/reject routes.
    implementation(libs.ktor.server.auth)
    // rateLimit(RateLimitName(...)) { } guards the public submit route.
    implementation(libs.ktor.server.rate.limit)
    implementation(libs.koin.ktor)
}
