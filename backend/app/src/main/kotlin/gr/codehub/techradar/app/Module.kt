package gr.codehub.techradar.app

import gr.codehub.techradar.app.plugins.configureCallLogging
import gr.codehub.techradar.app.plugins.configureCors
import gr.codehub.techradar.app.plugins.configureDatabase
import gr.codehub.techradar.app.plugins.configureSerialization
import gr.codehub.techradar.app.plugins.configureStatusPages
import gr.codehub.techradar.app.routes.healthRoute
import gr.codehub.techradar.constants.AppConfig
import io.ktor.server.application.Application
import io.ktor.server.routing.routing

fun Application.module(config: AppConfig) {
    configureSerialization()
    configureCors(config)
    configureStatusPages()
    configureCallLogging()

    // Installs Koin (EntriesRepository/HistoryRepository) and runs Flyway migrations against a
    // real Postgres before any route accepts traffic.
    configureDatabase(config)

    // Seam (01-05): seed(config) — called here, after configureDatabase, once the seed runner exists.
    // Seam (01-06): configureAuthentication(config), configureRateLimit() — called here, before
    // routing, so authenticate("auth-jwt") { } is available to write routes below.

    routing {
        healthRoute()

        // Seam (01-05/01-07): entriesRoutes(), historyRoutes(), authRoutes() registered here.
        // Write routes (POST/PUT/DELETE) wrapped in authenticate("auth-jwt") { } once 01-06 lands.
    }
}
