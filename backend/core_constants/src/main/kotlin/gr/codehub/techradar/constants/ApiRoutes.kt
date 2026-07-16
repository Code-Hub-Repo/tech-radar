package gr.codehub.techradar.constants

object ApiRoutes {
    const val ENTRIES = "/api/entries"
    const val ENTRY_BY_ID = "/api/entries/{id}"
    const val ENTRIES_HISTORY = "/api/entries/history"
    const val AUTH_LOGIN = "/api/auth/login"
    const val HEALTH = "/api/health"

    const val PROPOSALS = "/api/proposals"
    const val PROPOSAL_APPROVE = "/api/proposals/{id}/approve"
    const val PROPOSAL_REJECT = "/api/proposals/{id}/reject"
}
