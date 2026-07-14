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
    "core_usecases",
    "core_api",
    "core_db",
    "core_constants",
)
