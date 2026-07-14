package gr.codehub.techradar.db.repository

import gr.codehub.techradar.db.EntryHistoryTable
import gr.codehub.techradar.db.mapping.toHistoryRow
import gr.codehub.techradar.db.model.HistoryRow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.suspendTransaction

// Read-only — entry_history is written exclusively by EntriesRepository, inside the same
// transaction as the entry mutation it snapshots.
class HistoryRepository(
    private val database: Database,
) {
    suspend fun findAllOrderedByEntryDesc(): List<HistoryRow> = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            EntryHistoryTable.selectAll()
                .orderBy(
                    EntryHistoryTable.entryId to SortOrder.ASC,
                    EntryHistoryTable.changedAt to SortOrder.DESC,
                )
                .map { it.toHistoryRow() }
        }
    }

    suspend fun findByEntryId(entryId: Int): List<HistoryRow> = withContext(Dispatchers.IO) {
        suspendTransaction(db = database) {
            EntryHistoryTable.selectAll()
                .where { EntryHistoryTable.entryId eq entryId }
                .orderBy(EntryHistoryTable.changedAt, SortOrder.DESC)
                .map { it.toHistoryRow() }
        }
    }
}
