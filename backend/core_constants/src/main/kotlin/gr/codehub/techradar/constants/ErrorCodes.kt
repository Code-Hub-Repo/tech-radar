package gr.codehub.techradar.constants

object ErrorCodes {
    const val VALIDATION_FAILED = "VALIDATION_FAILED"
    const val DUPLICATE_NAME = "DUPLICATE_NAME"
    const val NOT_FOUND = "NOT_FOUND"
    const val UNAUTHORIZED = "UNAUTHORIZED"
    const val RATE_LIMITED = "RATE_LIMITED"
    const val INTERNAL_ERROR = "INTERNAL_ERROR"

    // Malformed non-numeric path/query parameter (e.g. GET /api/entries/{id} with a non-integer id).
    const val INVALID_PARAMETER = "INVALID_PARAMETER"

    // A proposal approve/reject targeting a proposal that is no longer PENDING (not 200 per
    // CONTEXT.md's documented double-review disposition).
    const val ALREADY_REVIEWED = "ALREADY_REVIEWED"
}
