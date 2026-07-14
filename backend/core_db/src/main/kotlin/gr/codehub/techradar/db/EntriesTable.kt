package gr.codehub.techradar.db

import gr.codehub.techradar.constants.ValidationConstants
import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone

// Plain Exposed v1 Table mirror — DDL lives solely in the Flyway migrations under
// db/migration/. Deliberately carries no column-level check-constraint or unique-index DSL calls
// here: adding schema-shaping DSL to this mirror would create a second, competing source of
// schema truth (RESEARCH.md Pitfall 15).
object EntriesTable : Table("entries") {
    val id = integer("id").autoIncrement()
    val name = varchar("name", ValidationConstants.NAME_MAX_LENGTH)
    val quadrant = varchar("quadrant", 30)
    val ring = varchar("ring", 10)
    val description = text("description")
    val isNew = bool("is_new")
    val createdAt = timestampWithTimeZone("created_at")
    val updatedAt = timestampWithTimeZone("updated_at")

    override val primaryKey = PrimaryKey(id)
}
