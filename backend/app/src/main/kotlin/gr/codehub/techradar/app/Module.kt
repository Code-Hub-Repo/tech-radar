package gr.codehub.techradar.app

import gr.codehub.techradar.app.plugins.configureCallLogging
import gr.codehub.techradar.app.plugins.configureCors
import gr.codehub.techradar.app.plugins.configureDatabase
import gr.codehub.techradar.app.plugins.configureSerialization
import gr.codehub.techradar.app.plugins.configureStatusPages
import gr.codehub.techradar.app.routes.healthRoute
import gr.codehub.techradar.constants.AppConfig
import gr.codehub.techradar.db.repository.EntriesRepository
import gr.codehub.techradar.db.seed.seed
import gr.codehub.techradar.feature.entries.entriesReadRoutes
import gr.codehub.techradar.usecases.usecaseModule
import io.ktor.server.application.Application
import io.ktor.server.routing.routing
import kotlinx.coroutines.runBlocking
import org.koin.ktor.ext.get
import org.koin.ktor.ext.getKoin

fun Application.module(config: AppConfig) {
    configureSerialization()
    configureCors(config)
    configureStatusPages()
    configureCallLogging()

    // Installs Koin (EntriesRepository/HistoryRepository) and runs Flyway migrations against a
    // real Postgres before any route accepts traffic.
    configureDatabase(config)

    // Extends the already-installed Koin instance with the UseCase layer.
    getKoin().loadModules(listOf(usecaseModule))

    // Idempotent seed — the empty-table gate inside seed() makes this safe on every boot; only the
    // first boot against an empty database actually inserts anything.
    runBlocking { seed(get<EntriesRepository>()) }

    // Seam (01-06): configureAuthentication(config), configureRateLimit() — called here, before
    // routing, so authenticate("auth-jwt") { } is available to write routes below.

    routing {
        healthRoute()
        entriesReadRoutes()

        // Seam (01-07): authRoutes() and the write (POST/PUT/DELETE) entries routes, the latter
        // wrapped in authenticate("auth-jwt") { } once 01-06 lands.
    }
}
