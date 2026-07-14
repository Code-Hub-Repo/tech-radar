package gr.codehub.techradar.usecases

import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.api.EntryResponse
import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.db.repository.EntriesRepository
import gr.codehub.techradar.usecases.error.DuplicateNameException
import gr.codehub.techradar.usecases.mapping.toEntryResponse
import gr.codehub.techradar.usecases.model.EntryWithMovement
import gr.codehub.techradar.usecases.validation.EntryValidator

// A newly created entry has no history pair to compare against yet, so its movement is always
// NONE — matches MovementCalculator's own isNew short-circuit, no history query needed here.
class CreateEntryUseCase(
    private val entriesRepository: EntriesRepository,
) {
    suspend operator fun invoke(request: EntryRequest): Result<EntryResponse> = runCatching {
        val newEntry = EntryValidator.validateForCreate(request)

        if (entriesRepository.existsByNameIgnoreCase(newEntry.name)) {
            throw DuplicateNameException(newEntry.name)
        }

        val created = entriesRepository.create(newEntry)
        EntryWithMovement(entry = created, movement = Movement.NONE).toEntryResponse()
    }
}
