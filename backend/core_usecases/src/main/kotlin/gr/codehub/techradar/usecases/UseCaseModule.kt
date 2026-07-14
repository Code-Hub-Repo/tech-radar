package gr.codehub.techradar.usecases

import org.koin.dsl.module

val usecaseModule = module {
    single { GetEntriesUseCase(get(), get()) }
    single { GetHistoryUseCase(get()) }
    single { CreateEntryUseCase(get()) }
    single { UpdateEntryUseCase(get()) }
    single { DeleteEntryUseCase(get()) }
}
