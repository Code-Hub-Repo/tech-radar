package gr.codehub.techradar.usecases.movement

import gr.codehub.techradar.constants.Movement
import gr.codehub.techradar.constants.MovementConstants
import gr.codehub.techradar.db.model.Entry
import gr.codehub.techradar.db.model.HistoryRow
import kotlin.time.Clock
import kotlin.time.Duration.Companion.days

// Pure, DB-free, unit-testable: derives the IN/OUT/NONE marker purely from an entry and its two
// most-recent history rows (newest first). Never queries the database itself — callers (e.g.
// GetEntriesUseCase) supply recentHistoryDesc from an already-fetched, Kotlin-side-grouped result.
object MovementCalculator {
    fun computeMovement(entry: Entry, recentHistoryDesc: List<HistoryRow>): Movement {
        if (entry.isNew) {
            return Movement.NONE
        }
        if (recentHistoryDesc.size < 2) {
            return Movement.NONE
        }

        val latest = recentHistoryDesc[0]
        val previous = recentHistoryDesc[1]

        if (latest.ring == previous.ring) {
            return Movement.NONE
        }

        val windowStart = Clock.System.now().minus(MovementConstants.MOVED_WINDOW_DAYS.days)
        if (latest.changedAt < windowStart) {
            return Movement.NONE
        }

        return if (latest.ring.orderIndex < previous.ring.orderIndex) {
            Movement.IN
        } else {
            Movement.OUT
        }
    }
}
