package gr.codehub.techradar.app.plugins

import com.zaxxer.hikari.HikariDataSource
import gr.codehub.techradar.constants.AppConfig
import gr.codehub.techradar.db.connectDatabase
import gr.codehub.techradar.db.createHikariDataSource
import gr.codehub.techradar.db.repository.EntriesRepository
import gr.codehub.techradar.db.repository.HistoryRepository
import gr.codehub.techradar.db.repository.ProposalsRepository
import gr.codehub.techradar.db.runFlywayMigration
import io.ktor.server.application.Application
import io.ktor.server.application.install
import org.koin.dsl.module
import org.koin.dsl.onClose
import org.koin.ktor.ext.get
import org.koin.ktor.plugin.Koin

// Parameterized module (not a top-level val) — the Testcontainers seam: 01-08's test suite can call
// dbModule(testConfig) with a container-backed AppConfig instead of the production one.
//
// onClose { it?.close() } on the HikariDataSource singleton: koin-ktor closes the KoinApplication
// (firing every definition's onClose) when the Ktor Application stops. Without this, each fresh
// Application boot (production restart, or Ktor's testApplication { } in 01-08's suite — one
// Application per test) leaks its whole connection pool, since HikariDataSource.close() is never
// called on the old instance. Discovered live: 01-08's suite exhausted PostgreSQL's
// max_connections after ~20 tests without this hook.
fun dbModule(config: AppConfig) = module {
    single { createHikariDataSource(config) } onClose { it?.close() }
    single { connectDatabase(get()) }
    single { EntriesRepository(get()) }
    single { HistoryRepository(get()) }
    single { ProposalsRepository(get()) }
}

// Installs Koin with dbModule, then runs Flyway against the exact HikariDataSource Koin just
// created — exactly one connection pool, migrations complete before routing is registered.
fun Application.configureDatabase(config: AppConfig) {
    install(Koin) {
        modules(dbModule(config))
    }

    val dataSource = get<HikariDataSource>()
    runFlywayMigration(dataSource)
}
