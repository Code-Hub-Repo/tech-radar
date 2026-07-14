// feature_entries — entries + history route handlers. Delegates all logic to core_usecases.

dependencies {
    implementation(project(":core_usecases"))
    implementation(project(":core_api"))
    implementation(project(":core_constants"))

    implementation(libs.ktor.server.core)
    implementation(libs.koin.ktor)
}
