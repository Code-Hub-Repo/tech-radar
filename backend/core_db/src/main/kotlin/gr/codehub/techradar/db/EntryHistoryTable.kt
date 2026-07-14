package gr.codehub.techradar.db

import gr.codehub.techradar.constants.ValidationConstants
import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone

// Plain Exposed v1 Table mirror — append-only history, DDL lives solely in the Flyway migrations.
// No column-level check-constraint or unique-index DSL here either (RESEARCH.md Pitfall 15);
// entry_id deliberately carries no FK constraint (here or in SQL) — history rows survive entry
// deletion (DESIGN.md §4).
object EntryHistoryTable : Table("entry_history") {
    val id = integer("id").autoIncrement()
    val entryId = integer("entry_id")
    val name = varchar("name", ValidationConstants.NAME_MAX_LENGTH)
    val quadrant = varchar("quadrant", 30)
    val ring = varchar("ring", 10)
    val description = text("description")
    val isNew = bool("is_new")
    val changeType = varchar("change_type", 10)
    val changedAt = timestampWithTimeZone("changed_at")

    override val primaryKey = PrimaryKey(id)
}
