package gr.codehub.techradar.usecases

import gr.codehub.techradar.usecases.auth.JwtService
import gr.codehub.techradar.usecases.auth.LoginUseCase
import org.koin.dsl.module

val authModule = module {
    single { JwtService(get()) }
    single { LoginUseCase(get(), get()) }
}
