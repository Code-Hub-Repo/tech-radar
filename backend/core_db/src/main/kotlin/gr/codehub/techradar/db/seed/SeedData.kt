package gr.codehub.techradar.db.seed

import gr.codehub.techradar.constants.Quadrant
import gr.codehub.techradar.constants.Ring
import gr.codehub.techradar.db.model.NewEntry

// Exactly 20 curated Code.Hub entries, 5 per quadrant, matching docs/DESIGN.md §4's seed list and
// locked ring assignments. Consumed once by SeedRunner.seed() via EntriesRepository.create() —
// never inserted directly, so every row gets a matching CREATED history snapshot.
object SeedData {
    val entries: List<NewEntry> = listOf(
        // Languages & Frameworks
        NewEntry(
            name = "Kotlin",
            quadrant = Quadrant.LANGUAGES_FRAMEWORKS,
            ring = Ring.ADOPT,
            description = "Kotlin is Code.Hub's default language for Android, backend services, and " +
                "increasingly shared business logic across platforms. Full IDE tooling, null safety, and " +
                "coroutines make it the safe first choice for every new service, including this Tech " +
                "Radar's own Ktor API. Every production Android app and this backend run on it today.",
        ),
        NewEntry(
            name = "TypeScript",
            quadrant = Quadrant.LANGUAGES_FRAMEWORKS,
            ring = Ring.ADOPT,
            description = "TypeScript is the standard for every frontend and Node-adjacent build script " +
                "at Code.Hub, catching type errors before they ever reach production. It replaced plain " +
                "JavaScript on all new web projects, including this radar's own frontend. Its gradual " +
                "typing and mature tooling make it a low-risk default for any team joining a project " +
                "mid-stream.",
        ),
        NewEntry(
            name = "React",
            quadrant = Quadrant.LANGUAGES_FRAMEWORKS,
            ring = Ring.ADOPT,
            description = "React is our default UI library for web frontends, chosen for its component " +
                "model, ecosystem size, and the depth of the hiring pool that knows it. Several client " +
                "dashboards and this radar's own public site are built on it. Its stability across major " +
                "versions keeps it a safe long-term bet rather than a moving target.",
        ),
        NewEntry(
            name = "Jetpack Compose",
            quadrant = Quadrant.LANGUAGES_FRAMEWORKS,
            ring = Ring.ADOPT,
            description = "Jetpack Compose is the default toolkit for native Android UI, replacing the " +
                "older View system on every new screen we build. It cuts boilerplate sharply compared to " +
                "XML layouts and pairs naturally with coroutines and our MVI state pattern. Every current " +
                "Android feature at Code.Hub ships with Compose, with no new XML screens being written.",
        ),
        NewEntry(
            name = "Ktor",
            quadrant = Quadrant.LANGUAGES_FRAMEWORKS,
            ring = Ring.TRIAL,
            description = "Ktor is Kotlin's own lightweight server framework, being evaluated as the " +
                "backend for this very Tech Radar API. It lets a Kotlin-first team stay in one language " +
                "end-to-end instead of adopting a heavier JVM framework. We're trialing it on this " +
                "project before recommending it as the default for future backend services.",
        ),
        // Tools
        NewEntry(
            name = "GitHub Actions",
            quadrant = Quadrant.TOOLS,
            ring = Ring.ADOPT,
            description = "GitHub Actions runs CI/CD for the majority of Code.Hub repositories, from " +
                "Android release builds to this radar's own backend and frontend pipelines. It needs no " +
                "separate infrastructure since our source already lives on GitHub, and workflows are " +
                "reviewable YAML alongside the code they build. It's the default choice for any new " +
                "repository.",
        ),
        NewEntry(
            name = "Detekt",
            quadrant = Quadrant.TOOLS,
            ring = Ring.TRIAL,
            description = "Detekt is a static analysis tool for Kotlin that flags code smells and " +
                "complexity issues before human review even starts. A handful of teams have wired it " +
                "into their CI pipelines to enforce house style automatically. We're trialing it more " +
                "broadly before mandating it across every Kotlin repository.",
        ),
        NewEntry(
            name = "Renovate",
            quadrant = Quadrant.TOOLS,
            ring = Ring.ASSESS,
            description = "Renovate opens automated pull requests to keep Gradle and npm dependencies " +
                "current, cutting the manual toil of version bumps. A couple of teams have piloted it on " +
                "smaller repositories with encouraging early results. We're assessing it against " +
                "Dependabot before standardizing on one dependency-update tool org-wide.",
        ),
        NewEntry(
            name = "Jenkins",
            quadrant = Quadrant.TOOLS,
            ring = Ring.HOLD,
            description = "Jenkins was Code.Hub's original CI server before most teams migrated to " +
                "GitHub Actions for its tighter GitHub integration and lower maintenance burden. A few " +
                "legacy pipelines still run on it, but no new project should adopt it. It stays in Hold " +
                "while the last jobs are decommissioned.",
        ),
        NewEntry(
            name = "Docker",
            quadrant = Quadrant.TOOLS,
            ring = Ring.ADOPT,
            description = "Docker packages every backend service and local development database into a " +
                "reproducible container, including this radar API's own dev PostgreSQL instance. It " +
                "eliminates 'works on my machine' drift across a team with varied laptops and OSes. " +
                "Every new backend project ships with a Dockerfile and a compose file from day one.",
        ),
        // Platforms
        NewEntry(
            name = "Firebase",
            quadrant = Quadrant.PLATFORMS,
            ring = Ring.ADOPT,
            description = "Firebase backs push notifications, crash reporting, and remote config for the " +
                "majority of Code.Hub's Android apps. Its tight Android SDK integration and generous " +
                "free tier make it the default mobile backend service. Multiple production apps depend " +
                "on it daily without incident.",
        ),
        NewEntry(
            name = "PostgreSQL",
            quadrant = Quadrant.PLATFORMS,
            ring = Ring.ADOPT,
            description = "PostgreSQL is the default relational database for every new backend service, " +
                "including this Tech Radar's own entry and history tables. Its functional indexes, " +
                "strong constraint support, and mature JVM driver ecosystem make it the safer default " +
                "over MySQL. Any service that needs durable relational storage reaches for it first.",
        ),
        NewEntry(
            name = "Cloudflare Pages",
            quadrant = Quadrant.PLATFORMS,
            ring = Ring.TRIAL,
            description = "Cloudflare Pages hosts static frontend builds on a global CDN with zero " +
                "server management, evaluated here as this radar's own frontend host. Its generous free " +
                "tier and Git-based deploy previews suit smaller client sites well. We're trialing it on " +
                "a few projects before it replaces ad-hoc hosting as the default.",
        ),
        NewEntry(
            name = "Supabase",
            quadrant = Quadrant.PLATFORMS,
            ring = Ring.ASSESS,
            description = "Supabase bundles a managed PostgreSQL instance with auth, storage, and " +
                "realtime subscriptions behind a single API. A couple of prototype projects used it to " +
                "skip writing a bespoke backend entirely. We're assessing whether it fits client work " +
                "long-term or whether a dedicated Ktor backend remains the better choice.",
        ),
        NewEntry(
            name = "KMP",
            quadrant = Quadrant.PLATFORMS,
            ring = Ring.TRIAL,
            description = "Kotlin Multiplatform lets teams share business logic, networking, and data " +
                "layers across Android, iOS, and beyond from a single Kotlin codebase. One internal app " +
                "is piloting shared use-case and repository code between its Android and iOS targets. " +
                "We're trialing it before recommending it as the default for future cross-platform " +
                "products.",
        ),
        // Techniques
        NewEntry(
            name = "MVI Architecture",
            quadrant = Quadrant.TECHNIQUES,
            ring = Ring.ADOPT,
            description = "Model-View-Intent structures every Android screen at Code.Hub around one " +
                "unidirectional state flow, an explicit event contract, and a dedicated side-effect " +
                "channel. It keeps ViewModels testable and screens free of business logic, matching our " +
                "house architecture rules exactly. Every feature screen in every Android app follows " +
                "this pattern without exception.",
        ),
        NewEntry(
            name = "Trunk-Based Development",
            quadrant = Quadrant.TECHNIQUES,
            ring = Ring.TRIAL,
            description = "Trunk-based development keeps feature branches short-lived and merges to " +
                "main multiple times a day behind flags, avoiding long-running branch drift. A few " +
                "fast-moving client teams have adopted it successfully already. We're trialing it more " +
                "broadly before it replaces GitFlow as the org default.",
        ),
        NewEntry(
            name = "TDD",
            quadrant = Quadrant.TECHNIQUES,
            ring = Ring.TRIAL,
            description = "Test-driven development — writing a failing test before the implementation " +
                "that makes it pass — is practiced by a growing number of teams on new backend work, " +
                "including parts of this radar's own API. It catches regressions early and documents " +
                "intended behavior directly in code. We're trialing it as a default practice before " +
                "mandating it org-wide.",
        ),
        NewEntry(
            name = "GitFlow",
            quadrant = Quadrant.TECHNIQUES,
            ring = Ring.HOLD,
            description = "GitFlow's long-lived develop/release/hotfix branch model was Code.Hub's " +
                "original branching strategy before trunk-based development proved simpler for " +
                "continuous deployment. Its heavy merge overhead slows down fast-moving client projects. " +
                "It stays in Hold for legacy repositories only — no new project should adopt it.",
        ),
        NewEntry(
            name = "XML Views",
            quadrant = Quadrant.TECHNIQUES,
            ring = Ring.HOLD,
            description = "XML-based layouts were Android's original approach to building UI: separate " +
                "layout files paired with manual, imperative view-binding code. Jetpack Compose's " +
                "declarative model has replaced it on every new screen we build. It remains in Hold, " +
                "present only in code that hasn't been migrated yet.",
        ),
    )
}
