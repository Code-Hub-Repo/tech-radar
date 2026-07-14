package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.db.repository.EntriesRepository
import gr.codehub.techradar.usecases.error.DuplicateNameException
import gr.codehub.techradar.usecases.error.NotFoundException
import gr.codehub.techradar.usecases.mapping.toEntryResponse
import gr.codehub.techradar.usecases.model.EntryWithMovement
import gr.codehub.techradar.usecases.validation.EntryValidator

// The response's own `movement` is a NONE placeholder (this UseCase only depends on
// EntriesRepository, not HistoryRepository, per the locked interface) — the authoritative
// computed movement is what GET /api/entries reports immediately after, which is how API-06's
// ring-change verification is actually performed.
class UpdateEntryUseCase(
    private val entriesRepository: EntriesRepository,
) {
    suspend operator fun invoke(id: Int, request: EntryRequest): Result<EntryResponse> = runCatching {
        val update = EntryValidator.validateForUpdate(request)

        if (entriesRepository.existsByNameIgnoreCase(update.name, excludeId = id)) {
            throw DuplicateNameException(update.name)
        }

        val updated = entriesRepository.update(id, update) ?: throw NotFoundException(id)
        EntryWithMovement(entry = updated, movement = Movement.NONE).toEntryResponse()
    }
}
