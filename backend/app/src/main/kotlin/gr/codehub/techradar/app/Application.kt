package gr.codehub.techradar.app

import gr.codehub.techradar.constants.AppConfig
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty

fun main() {
    val config = AppConfig.fromEnvironment()
    embeddedServer(
        factory = Netty,
        port = config.port,
        host = "0.0.0.0",
    ) {
        module(config)
    }.start(wait = true)
}
