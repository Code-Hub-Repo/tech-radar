package gr.codehub.techradar.db.repository

import gr.codehub.techradar.constants.ChangeType
import gr.codehub.techradar.db.EntriesTable
import gr.codehub.techradar.db.EntryHistoryTable
import gr.codehub.techradar.db.mapping.toEntry
import gr.codehub.techradar.db.model.Entry
import gr.codehub.techradar.db.model.NewEntry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.lowerCase
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.suspendTransaction

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
}
