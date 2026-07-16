package gr.codehub.techradar.constants

enum class ProposalStatus(
    val apiName: String,
) {
    PENDING(apiName = "PENDING"),
    APPROVED(apiName = "APPROVED"),
    REJECTED(apiName = "REJECTED"),
    ;

    companion object {
        fun fromApiName(apiName: String): ProposalStatus {
            return entries.find { it.apiName == apiName }
                ?: throw IllegalArgumentException("Unknown ProposalStatus apiName: $apiName")
        }
    }
}
