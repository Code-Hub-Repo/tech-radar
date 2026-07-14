package gr.codehub.techradar.db

import javax.sql.DataSource
import org.flywaydb.core.Flyway

fun runFlywayMigration(dataSource: DataSource) {
    Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration")
        .load()
        .migrate()
}
