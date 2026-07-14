package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.db.repository.EntriesRepository
import gr.codehub.techradar.db.repository.HistoryRepository
import gr.codehub.techradar.usecases.mapping.toEntryResponse
import gr.codehub.techradar.usecases.model.EntryWithMovement
import gr.codehub.techradar.usecases.movement.MovementCalculator

class GetEntriesUseCase(
    private val entriesRepository: EntriesRepository,
    private val historyRepository: HistoryRepository,
) {
    // Exactly 2 bounded queries regardless of entry count (API-08): one for all entries, one for
    // all history rows already ordered (entryId ASC, changedAt DESC) so groupBy + take(2) needs no
    // further queries per entry — no N+1.
    suspend operator fun invoke(): Result<List<EntryResponse>> = runCatching {
        val entries = entriesRepository.findAll()
        val historyByEntry = historyRepository.findAllOrderedByEntryDesc().groupBy { it.entryId }

        entries.map { entry ->
            val recentHistory = historyByEntry[entry.id].orEmpty().take(2)
            val movement = MovementCalculator.computeMovement(entry, recentHistory)
            EntryWithMovement(entry = entry, movement = movement).toEntryResponse()
        }
    }
}
