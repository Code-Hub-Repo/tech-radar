package gr.codehub.techradar.constants

enum class Quadrant(
    val apiName: String,
) {
    LANGUAGES_FRAMEWORKS(apiName = "LANGUAGES_FRAMEWORKS"),
    TOOLS(apiName = "TOOLS"),
    PLATFORMS(apiName = "PLATFORMS"),
    TECHNIQUES(apiName = "TECHNIQUES"),
    ;

    companion object {
        fun fromApiName(apiName: String): Quadrant {
            return entries.find { it.apiName == apiName }
                ?: throw IllegalArgumentException("Unknown Quadrant apiName: $apiName")
        }
    }
}
