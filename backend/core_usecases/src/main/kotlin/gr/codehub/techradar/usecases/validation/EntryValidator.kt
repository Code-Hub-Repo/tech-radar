package gr.codehub.techradar.usecases.validation

import gr.codehub.techradar.api.EntryRequest
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import gr.codehub.techradar.constants.ValidationConstants
import gr.codehub.techradar.db.model.EntryUpdate
import gr.codehub.techradar.db.model.NewEntry
import gr.codehub.techradar.usecases.error.ValidationException

private const val FIELD_NAME = "name"
private const val FIELD_RING = "ring"
private const val FIELD_QUADRANT = "quadrant"
private const val FIELD_DESCRIPTION = "description"

private const val ERROR_NAME_REQUIRED = "Name is required"
private val ERROR_NAME_TOO_LONG = "Name must be ${ValidationConstants.NAME_MAX_LENGTH} characters or fewer"
private const val ERROR_RING_INVALID = "Ring must be one of ADOPT, TRIAL, ASSESS, HOLD"
private const val ERROR_QUADRANT_INVALID = "Quadrant must be one of the four defined quadrants"
private const val ERROR_DESCRIPTION_REQUIRED = "Description is required"

// UseCase-layer field validation — the first correctness gate before any repository/DB call
// (RESEARCH.md's Architectural Responsibility Map). Name uniqueness is deliberately NOT checked
// here: it needs the repository, so CreateEntryUseCase/UpdateEntryUseCase perform that check
// themselves, backstopped by the DB's own LOWER(name) unique index (DATA-01).
object EntryValidator {

    fun validateForCreate(request: EntryRequest): NewEntry {
        val fields = validateFields(request)
        return NewEntry(
            name = fields.name,
            quadrant = fields.quadrant,
            ring = fields.ring,
            description = fields.description,
        )
    }

    fun validateForUpdate(request: EntryRequest): EntryUpdate {
        val fields = validateFields(request)
        return EntryUpdate(
            name = fields.name,
            quadrant = fields.quadrant,
            ring = fields.ring,
            description = fields.description,
        )
    }

    private fun validateFields(request: EntryRequest): ValidatedFields {
        val fieldErrors = mutableMapOf<String, String>()

        if (request.name.isBlank()) {
            fieldErrors[FIELD_NAME] = ERROR_NAME_REQUIRED
        } else if (request.name.length > ValidationConstants.NAME_MAX_LENGTH) {
            fieldErrors[FIELD_NAME] = ERROR_NAME_TOO_LONG
        }

        val ring = try {
            Ring.fromApiName(request.ring)
        } catch (e: IllegalArgumentException) {
            fieldErrors[FIELD_RING] = ERROR_RING_INVALID
            null
        }

        val quadrant = try {
            Quadrant.fromApiName(request.quadrant)
        } catch (e: IllegalArgumentException) {
            fieldErrors[FIELD_QUADRANT] = ERROR_QUADRANT_INVALID
            null
        }

        if (request.description.isBlank()) {
            fieldErrors[FIELD_DESCRIPTION] = ERROR_DESCRIPTION_REQUIRED
        }

        if (fieldErrors.isNotEmpty()) {
            throw ValidationException(fieldErrors)
        }

        return ValidatedFields(
            name = request.name,
            quadrant = requireNotNull(quadrant) { "quadrant must be non-null once fieldErrors is empty" },
            ring = requireNotNull(ring) { "ring must be non-null once fieldErrors is empty" },
            description = request.description,
        )
    }

    private data class ValidatedFields(
        val name: String,
        val quadrant: Quadrant,
        val ring: Ring,
        val description: String,
    )
}
