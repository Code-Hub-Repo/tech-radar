plugins {
    alias(libs.plugins.kotlin.jvm) apply false
}

subprojects {
    apply(plugin = "org.jetbrains.kotlin.jvm")
    kotlin {
        jvmToolchain(25)
    }
    tasks.withType<Test> {
        useJUnitPlatform()
    }
}
