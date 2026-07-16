package gr.codehub.techradar.usecases.validation

import gr.codehub.techradar.api.ProposalRequest
import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import gr.codehub.techradar.constants.ValidationConstants
import gr.codehub.techradar.db.model.NewProposal
import gr.codehub.techradar.usecases.error.ValidationException

private const val FIELD_NAME = "name"
private const val FIELD_RING = "ring"
private const val FIELD_QUADRANT = "quadrant"
private const val FIELD_DESCRIPTION = "description"
private const val FIELD_SUBMITTER_NAME = "submitterName"

private const val ERROR_NAME_REQUIRED = "Name is required"
private val ERROR_NAME_TOO_LONG = "Name must be ${ValidationConstants.NAME_MAX_LENGTH} characters or fewer"
private const val ERROR_RING_INVALID = "Ring must be one of ADOPT, TRIAL, ASSESS, HOLD"
private const val ERROR_QUADRANT_INVALID = "Quadrant must be one of the four defined quadrants"
private const val ERROR_DESCRIPTION_REQUIRED = "Description is required"
private val ERROR_SUBMITTER_NAME_TOO_LONG =
    "Submitter name must be ${ValidationConstants.SUBMITTER_NAME_MAX_LENGTH} characters or fewer"

// UseCase-layer field validation for public proposal submissions — mirrors EntryValidator's
// name/quadrant/ring/description rules exactly (CONTEXT.md: "validation identical to entries").
// Kept as its own object rather than sharing EntryValidator's internals: proposals additionally
// validate the entry-less submitterName field, and this is the ONLY validator a public,
// unauthenticated caller can reach, so it stays independently evolvable from the admin-only
// entries path per CLAUDE.md's surgical-changes rule (don't touch EntryValidator for this).
object ProposalValidator {

    fun validateForSubmit(request: ProposalRequest): NewProposal {
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

        val submitterName = request.submitterName?.takeIf { it.isNotBlank() }
        if (submitterName != null && submitterName.length > ValidationConstants.SUBMITTER_NAME_MAX_LENGTH) {
            fieldErrors[FIELD_SUBMITTER_NAME] = ERROR_SUBMITTER_NAME_TOO_LONG
        }

        if (fieldErrors.isNotEmpty()) {
            throw ValidationException(fieldErrors)
        }

        return NewProposal(
            name = request.name,
            quadrant = requireNotNull(quadrant) { "quadrant must be non-null once fieldErrors is empty" },
            ring = requireNotNull(ring) { "ring must be non-null once fieldErrors is empty" },
            description = request.description,
            submitterName = submitterName,
        )
    }
}
