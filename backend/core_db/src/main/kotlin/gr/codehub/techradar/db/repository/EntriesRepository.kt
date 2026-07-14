package gr.codehub.techradar.db.repository

import gr.codehub.techradar.constants.ChangeType
import gr.codehub.techradar.db.EntriesTable
import gr.codehub.techradar.db.EntryHistoryTable
import gr.codehub.techradar.db.mapping.toEntry
import gr.codehub.techradar.db.model.Entry
import gr.codehub.techradar.db.model.EntryUpdate
import gr.codehub.techradar.db.model.NewEntry
import java.time.OffsetDateTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.lowerCase
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.suspendTransaction
import org.jetbrains.exposed.v1.jdbc.update

class EntriesRepository(
    private val database: Database,
) {
    // Atomic: the entry insert and the CREATED history snapshot happen inside this ONE
    // suspendTransaction — a mutation without a matching history row is structurally impossible.
    suspend fun create(newEntry: NewEntry): Entry = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val id = EntriesTable.insert {
                it[name] = newEntry.name
                it[quadrant] = newEntry.quadrant.apiName
                it[ring] = newEntry.ring.apiName
                it[description] = newEntry.description
                it[isNew] = newEntry.isNew
            } get EntriesTable.id

            val created = EntriesTable.selectAll()
                .where { EntriesTable.id eq id }
                .single()
                .toEntry()

            EntryHistoryTable.insert {
                it[entryId] = created.id
                it[name] = created.name
                it[quadrant] = created.quadrant.apiName
                it[ring] = created.ring.apiName
                it[description] = created.description
                it[isNew] = created.isNew
                it[changeType] = ChangeType.CREATED.apiName
            }

            created
        }
    }

    suspend fun findAll(): List<Entry> = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            EntriesTable.selectAll()
                .orderBy(EntriesTable.name)
                .map { it.toEntry() }
        }
    }

    suspend fun findById(id: Int): Entry? = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            EntriesTable.selectAll()
                .where { EntriesTable.id eq id }
                .singleOrNull()
                ?.toEntry()
        }
    }

    suspend fun existsByNameIgnoreCase(name: String, excludeId: Int? = null): Boolean = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val nameMatches = EntriesTable.name.lowerCase() eq name.lowercase()
            val condition = if (excludeId != null) {
                nameMatches and (EntriesTable.id neq excludeId)
            } else {
                nameMatches
            }
            EntriesTable.selectAll().where { condition }.count() > 0
        }
    }

    // Atomic: the entry update and the UPDATED history snapshot happen inside this ONE
    // suspendTransaction. Returns null when no row matched id (caller maps that to a 404).
    suspend fun update(id: Int, update: EntryUpdate): Entry? = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val updatedRows = EntriesTable.update({ EntriesTable.id eq id }) {
                it[name] = update.name
                it[quadrant] = update.quadrant.apiName
                it[ring] = update.ring.apiName
                it[description] = update.description
                it[updatedAt] = OffsetDateTime.now()
            }

            if (updatedRows == 0) {
                return@suspendTransaction null
            }

            val updated = EntriesTable.selectAll()
                .where { EntriesTable.id eq id }
                .single()
                .toEntry()

            EntryHistoryTable.insert {
                it[entryId] = updated.id
                it[name] = updated.name
                it[quadrant] = updated.quadrant.apiName
                it[ring] = updated.ring.apiName
                it[description] = updated.description
                it[isNew] = updated.isNew
                it[changeType] = ChangeType.UPDATED.apiName
            }

            updated
        }
    }

    // Atomic: the DELETED history snapshot (the entry's last state) is written and the entries
    // row is removed inside this ONE suspendTransaction. entry_history has no FK cascade, so the
    // snapshot survives the delete — an auditable trail even after the entry is gone.
    suspend fun delete(id: Int): Boolean = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            val existing = EntriesTable.selectAll()
                .where { EntriesTable.id eq id }
                .singleOrNull()
                ?.toEntry()
                ?: return@suspendTransaction false

            EntryHistoryTable.insert {
                it[entryId] = existing.id
                it[name] = existing.name
                it[quadrant] = existing.quadrant.apiName
                it[ring] = existing.ring.apiName
                it[description] = existing.description
                it[isNew] = existing.isNew
                it[changeType] = ChangeType.DELETED.apiName
            }

            EntriesTable.deleteWhere { EntriesTable.id eq id }

            true
        }
    }
}
