package gr.codehub.techradar.constants

enum class ChangeType(
    val apiName: String,
) {
    CREATED(apiName = "CREATED"),
    UPDATED(apiName = "UPDATED"),
    DELETED(apiName = "DELETED"),
}
