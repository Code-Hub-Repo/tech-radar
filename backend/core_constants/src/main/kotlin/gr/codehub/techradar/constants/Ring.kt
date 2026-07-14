package gr.codehub.techradar.constants

enum class Ring(
    val apiName: String,
    val orderIndex: Int,
) {
    ADOPT(
        apiName = "ADOPT",
        orderIndex = 0,
    ),
    TRIAL(
        apiName = "TRIAL",
        orderIndex = 1,
    ),
    ASSESS(
        apiName = "ASSESS",
        orderIndex = 2,
    ),
    HOLD(
        apiName = "HOLD",
        orderIndex = 3,
    ),
    ;

    companion object {
        fun fromApiName(apiName: String): Ring {
            return entries.find { it.apiName == apiName }
                ?: throw IllegalArgumentException("Unknown Ring apiName: $apiName")
        }
    }
}
