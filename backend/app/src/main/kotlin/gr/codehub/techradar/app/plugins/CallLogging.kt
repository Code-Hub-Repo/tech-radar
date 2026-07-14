package gr.codehub.techradar.app.plugins

import gr.codehub.techradar.constants.LogTags
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.request.httpMethod
import io.ktor.server.request.path
import org.slf4j.event.Level

fun Application.configureCallLogging() {
    install(CallLogging) {
        level = Level.INFO
        format { call ->
            val status = call.response.status()
            val method = call.request.httpMethod.value
            val path = call.request.path()
            "${LogTags.LOGIC_API} :: CallLogging :: request() :: $method $path -> $status"
        }
    }
}
