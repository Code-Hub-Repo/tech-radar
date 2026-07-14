package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.HistoryResponse
import gr.codehub.techradar.db.repository.HistoryRepository
import gr.codehub.techradar.usecases.mapping.toHistoryResponse

class GetHistoryUseCase(
    private val historyRepository: HistoryRepository,
) {
    suspend operator fun invoke(entryId: Int?): Result<List<HistoryResponse>> = runCatching {
        val historyRows = if (entryId != null) {
            // Already newest-first for a single entry (ORDER BY changed_at DESC).
            historyRepository.findByEntryId(entryId)
        } else {
            // findAllOrderedByEntryDesc() orders by (entryId ASC, changedAt DESC) — that shape is
            // for GetEntriesUseCase's per-entry grouping, not a global newest-first listing. Re-sort
            // in Kotlin (no extra query) so the unfiltered history feed is genuinely newest-first.
            historyRepository.findAllOrderedByEntryDesc().sortedByDescending { it.changedAt }
        }
        historyRows.map { it.toHistoryResponse() }
    }
}
