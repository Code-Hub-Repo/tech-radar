package gr.codehub.techradar.usecases

import gr.codehub.techradar.db.repository.EntriesRepository
import gr.codehub.techradar.usecases.error.NotFoundException

class DeleteEntryUseCase(
    private val entriesRepository: EntriesRepository,
) {
    suspend operator fun invoke(id: Int): Result<Unit> = runCatching {
        if (!entriesRepository.delete(id)) {
            throw NotFoundException(id)
        }
    }
}
