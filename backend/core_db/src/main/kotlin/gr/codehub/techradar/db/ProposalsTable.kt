package gr.codehub.techradar.db

import gr.codehub.techradar.constants.ValidationConstants
import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone

// Plain Exposed v1 Table mirror — DDL lives solely in V3__create_proposals.sql. No column-level
// check-constraint or unique-index DSL here either (RESEARCH.md Pitfall 15): name deliberately
// carries no uniqueness (CONTEXT.md — dupes allowed, admin dedupes at review). entry_id carries no
// FK constraint (here or in SQL), mirroring EntryHistoryTable's own entry_id convention.
object ProposalsTable : Table("proposals") {
    val id = integer("id").autoIncrement()
    val name = varchar("name", ValidationConstants.NAME_MAX_LENGTH)
    val quadrant = varchar("quadrant", 30)
    val ring = varchar("ring", 10)
    val description = text("description")
    val submitterName = varchar("submitter_name", ValidationConstants.SUBMITTER_NAME_MAX_LENGTH).nullable()
    val status = varchar("status", 10)
    val entryId = integer("entry_id").nullable()
    val createdAt = timestampWithTimeZone("created_at")
    val reviewedAt = timestampWithTimeZone("reviewed_at").nullable()

    override val primaryKey = PrimaryKey(id)
}
