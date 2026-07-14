package gr.codehub.techradar.app.plugins

import gr.codehub.techradar.api.ErrorBody
import gr.codehub.techradar.api.ErrorResponse
import gr.codehub.techradar.constants.ErrorCodes
import gr.codehub.techradar.constants.LogTags
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.request.path
import io.ktor.server.response.respond
import org.slf4j.LoggerFactory

private const val INVALID_PARAMETER_MESSAGE = "Invalid or malformed request parameter"
private const val INTERNAL_ERROR_MESSAGE = "An unexpected error occurred"
private const val ROUTE_NOT_FOUND_MESSAGE = "The requested resource was not found"

private val logger = LoggerFactory.getLogger("StatusPages")

// Centralized error envelope for the whole app. T-01-02 mitigation: no exception message, stack
// trace, or SQL fragment ever reaches the HTTP response body — full detail goes only to SLF4J logs.
// The typed ValidationException/DuplicateNameException/NotFoundException handlers are added by
// 01-07; the generic exception<Throwable> handler is kept last so those future handlers can be
// registered ahead of it.
fun Application.configureStatusPages() {
    install(StatusPages) {
        exception<NumberFormatException> { call, cause ->
            logger.warn(
                "${LogTags.APP} :: StatusPages :: configureStatusPages() :: " +
                    "Malformed numeric parameter on ${call.request.path()}: ${cause.message}",
            )
            call.respond(
                status = HttpStatusCode.BadRequest,
                message = ErrorResponse(
                    error = ErrorBody(
                        code = ErrorCodes.INVALID_PARAMETER,
                        message = INVALID_PARAMETER_MESSAGE,
                    ),
                ),
            )
        }
        exception<BadRequestException> { call, cause ->
            logger.warn(
                "${LogTags.APP} :: StatusPages :: configureStatusPages() :: " +
                    "Bad request on ${call.request.path()}: ${cause.message}",
            )
            call.respond(
                status = HttpStatusCode.BadRequest,
                message = ErrorResponse(
                    error = ErrorBody(
                        code = ErrorCodes.INVALID_PARAMETER,
                        message = INVALID_PARAMETER_MESSAGE,
                    ),
                ),
            )
        }
        // Fallback for requests that never matched a route (no exception is thrown in that case —
        // Ktor's routing plugin finalizes a bare 404). Rewrites it to the standard JSON envelope.
        status(HttpStatusCode.NotFound) { call, status ->
            call.respond(
                status = status,
                message = ErrorResponse(
                    error = ErrorBody(
                        code = ErrorCodes.NOT_FOUND,
                        message = ROUTE_NOT_FOUND_MESSAGE,
                    ),
                ),
            )
        }
        exception<Throwable> { call, cause ->
            logger.error(
                "${LogTags.APP} :: StatusPages :: configureStatusPages() :: " +
                    "Unhandled exception on ${call.request.path()}",
                cause,
            )
            call.respond(
                status = HttpStatusCode.InternalServerError,
                message = ErrorResponse(
                    error = ErrorBody(
                        code = ErrorCodes.INTERNAL_ERROR,
                        message = INTERNAL_ERROR_MESSAGE,
                    ),
                ),
            )
        }
    }
}
