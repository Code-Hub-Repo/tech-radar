// core_api — request/response DTOs and API-facing models.

plugins {
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    implementation(project(":core_constants"))

    implementation(libs.kotlinx.serialization.json)
}
