package gr.codehub.techradar.db.seed

import gr.codehub.techradar.constants.LogTags
import gr.codehub.techradar.db.repository.EntriesRepository
import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("SeedRunner")

// Idempotent: the empty-table check on entriesRepository.findAll() is the single idempotency
// guard. Safe to call on every application boot — inserts SeedData only the very first time the
// entries table is empty, and is a no-op skip on every subsequent boot. Runs through
// EntriesRepository.create() (never a raw insert), so every seeded entry gets a matching CREATED
// history row atomically.
suspend fun seed(entriesRepository: EntriesRepository) {
    val existingEntries = entriesRepository.findAll()
    if (existingEntries.isNotEmpty()) {
        logger.info(
            "${LogTags.CORE_DB} :: SeedRunner :: seed() :: " +
                "Entries table already has ${existingEntries.size} rows, skipping seed",
        )
        return
    }

    SeedData.entries.forEach { newEntry ->
        entriesRepository.create(newEntry)
    }

    logger.info(
        "${LogTags.CORE_DB} :: SeedRunner :: seed() :: " +
            "Inserted ${SeedData.entries.size} seed entries with CREATED history",
    )
}
