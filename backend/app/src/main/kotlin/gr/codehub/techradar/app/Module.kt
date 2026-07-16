package gr.codehub.techradar.app

import gr.codehub.techradar.app.plugins.configureAuthentication
import gr.codehub.techradar.app.plugins.configureCallLogging
import gr.codehub.techradar.app.plugins.configureCors
import gr.codehub.techradar.app.plugins.configureDatabase
import gr.codehub.techradar.app.plugins.configureRateLimit
import gr.codehub.techradar.app.plugins.configureSerialization
import gr.codehub.techradar.app.plugins.configureStatusPages
import gr.codehub.techradar.app.routes.healthRoute
import gr.codehub.techradar.constants.AppConfig
import gr.codehub.techradar.db.repository.EntriesRepository
import gr.codehub.techradar.db.seed.seed
import gr.codehub.techradar.feature.auth.authRoutes
import gr.codehub.techradar.feature.entries.entriesReadRoutes
import gr.codehub.techradar.feature.entries.entriesWriteRoutes
import gr.codehub.techradar.feature.proposals.proposalsAdminRoutes
import gr.codehub.techradar.feature.proposals.proposalsPublicRoutes
import gr.codehub.techradar.usecases.authModule
import gr.codehub.techradar.usecases.usecaseModule
import io.ktor.server.application.Application
import io.ktor.server.routing.routing
import kotlinx.coroutines.runBlocking
import org.koin.dsl.module
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

    // Extends the already-installed Koin instance with the UseCase layer, a binding for this exact
    // AppConfig instance (authModule's JwtService/LoginUseCase resolve it via Koin get()), and the
    // auth module itself.
    getKoin().loadModules(listOf(usecaseModule, module { single { config } }, authModule))

    // Idempotent seed — the empty-table gate inside seed() makes this safe on every boot; only the
    // first boot against an empty database actually inserts anything.
    runBlocking { seed(get<EntriesRepository>()) }

    // Installed before routing so authenticate("auth-jwt") { } is available to 01-07's write
    // routes; the login rate limiter (registered here) guards authRoutes() below.
    configureAuthentication(config)
    configureRateLimit()

    routing {
        healthRoute()
        entriesReadRoutes()
        entriesWriteRoutes()
        authRoutes()
        proposalsPublicRoutes()
        proposalsAdminRoutes()
    }
}
