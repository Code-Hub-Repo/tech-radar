package gr.codehub.techradar.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import gr.codehub.techradar.constants.AppConfig
import org.jetbrains.exposed.v1.jdbc.Database

fun createHikariDataSource(config: AppConfig): HikariDataSource {
    val hikariConfig = HikariConfig().apply {
        jdbcUrl = config.databaseUrl
        driverClassName = "org.postgresql.Driver"
        username = config.databaseUsername
        password = config.databasePassword
        maximumPoolSize = config.databasePoolSize
    }
    return HikariDataSource(hikariConfig)
}

fun connectDatabase(dataSource: HikariDataSource): Database = Database.connect(dataSource)
