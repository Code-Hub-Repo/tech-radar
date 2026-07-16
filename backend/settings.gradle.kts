plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "tech-radar-backend"

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}

include(
    "app",
    "feature_entries",
    "feature_auth",
    "feature_proposals",
    "core_usecases",
    "core_api",
    "core_db",
    "core_constants",
)
