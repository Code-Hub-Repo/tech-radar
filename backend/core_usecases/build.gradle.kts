// core_usecases — business logic UseCases (operator fun invoke(): Result<T>), JWT issuance, password hashing.

dependencies {
    implementation(project(":core_db"))
    implementation(project(":core_api"))
    implementation(project(":core_constants"))

    implementation(libs.bcrypt)
    implementation(libs.java.jwt)
    implementation(libs.kotlinx.coroutines.core)
}
