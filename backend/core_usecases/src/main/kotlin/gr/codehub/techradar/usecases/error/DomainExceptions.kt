package gr.codehub.techradar.usecases.error

private const val DEFAULT_VALIDATION_MESSAGE = "Validation failed"

// Shared base for every UseCase-layer failure StatusPages maps to a typed HTTP response — gives
// the three concrete failures below a single family, matching the domain-specific 400/409/404
// dispositions in the API contract (as opposed to the generic exception<Throwable> 500 fallback).
sealed class DomainException(message: String) : Exception(message)

class ValidationException(
    val fieldErrors: Map<String, String>,
    message: String = DEFAULT_VALIDATION_MESSAGE,
) : DomainException(message)

class DuplicateNameException(name: String) : DomainException("An entry named '$name' already exists")

class NotFoundException(id: Int) : DomainException("Entry $id was not found")
