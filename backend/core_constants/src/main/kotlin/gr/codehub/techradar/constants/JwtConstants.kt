package gr.codehub.techradar.constants

object JwtConstants {
    const val EXPIRY_HOURS = 8
    const val ISSUER = "techradar-api"
    const val AUDIENCE = "techradar-clients"
    const val REALM = "techradar"
    const val USERNAME_CLAIM = "username"
    const val JWT_SECRET_MIN_LENGTH = 32
}
