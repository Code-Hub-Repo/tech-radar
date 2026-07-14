// feature_entries — entries + history route handlers. Delegates all logic to core_usecases.

dependencies {
    implementation(project(":core_usecases"))
    implementation(project(":core_api"))
    implementation(project(":core_constants"))

    implementation(libs.ktor.server.core)
    // authenticate("auth-jwt") { } guards the write routes — needs the auth plugin's Route
    // extension directly, not just what app's own classpath already has.
    implementation(libs.ktor.server.auth)
    implementation(libs.koin.ktor)
}
