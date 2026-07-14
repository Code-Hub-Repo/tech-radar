# Code.Hub Tech Radar — Design

**Author:** Giorgos Vergidis
**Date:** 2026-07-14
**Source:** Code.Hub Tech Radar Implementation Plan

## 1. What we are building

A public technology radar for Code.Hub at **radar.codehub.gr**: an interactive visualization of the technologies Code.Hub teams use, arranged in 4 rings (**Adopt, Trial, Assess, Hold**) and 4 quadrants (**Languages & Frameworks, Tools, Platforms, Techniques**). Entries ("blips") are managed through an admin UI backed by a REST API at **api-radar.codehub.gr**, with full history of ring movements.

The implementation plan is a 4-team × 4-week program. This repository delivers everything a single codebase can deliver:

**In scope**
- Public radar UI: React + D3, Code.Hub branding, responsive, search/filter, legend, isNew indicator, detail panel, accessible list view
- Admin UI: login, add/edit/delete entries with validation
- REST API: public reads, JWT-protected writes, validation, history endpoint, seed script, CORS, health endpoint
- PostgreSQL schema + migrations
- 20 curated seed entries with real descriptions
- Deployment prep: Dockerfiles, docker-compose, GitHub Actions CI, API docs, deployment runbook with the go-live checklist
- Tests: backend endpoint tests, frontend unit tests, Playwright cross-browser smoke

**Out of scope** (organizational or needs real infra access — documented as runbooks instead)
- Actual DNS records, hosting provisioning, HTTPS certificates, uptime-monitor accounts
- Tech submission form, launch announcements, management sign-off meetings, quarterly refresh reminders

## 2. Approaches considered

| | A. Monorepo: React SPA + Ktor API + PostgreSQL | B. Next.js full-stack | C. Static JSON radar (Zalando-style) |
|---|---|---|---|
| Matches planned architecture (separate SPA + REST API on two subdomains) | ✅ exactly | ❌ merges them | ❌ no API at all |
| Admin CRUD + JWT + history (hard requirements) | ✅ | ✅ | ❌ fails |
| Maintainer fit (Kotlin expertise in-house) | ✅ | ❌ Node backend | n/a |
| Ops weight | medium (JVM container) | low | lowest |

**Decision: A.** The plan explicitly designs two deployables and offers Kotlin/Ktor as a backend choice. Kotlin maximizes maintainer fit, follows our Kotlin server architecture standards, and dogfoods the radar's own "Kotlin = Adopt" verdict. B contradicts the plan's structure; C fails hard requirements.

## 3. Architecture

```
tech-radar/                     (monorepo)
├── frontend/                   React 18+ · Vite · TypeScript · Tailwind CSS · D3 (math only) · TanStack Query
├── backend/                    Kotlin · Ktor 3 · Exposed · PostgreSQL · Flyway · Koin DI
├── deploy/                     docker-compose.yml, .env.example, nginx.conf, runbooks
├── design-system/              MASTER.md (visual source of truth)
└── docs/                       API.md, DEPLOYMENT.md, design docs
```

Deployment topology (prepared, not provisioned): `radar.codehub.gr` → static frontend (Cloudflare Pages or nginx container); `api-radar.codehub.gr` → Ktor container + PostgreSQL. Frontend calls the API via `VITE_API_BASE_URL`.

## 4. Backend design

### Modules (Kotlin server layout; Gradle multi-module)

```
backend/
├── app/                 Entry point only: Ktor Application, Koin wiring, route registration, AppConfig
├── feature_entries/     Route handlers: entries CRUD + history
├── feature_auth/        Route handler: login
├── core_usecases/       GetEntries, CreateEntry, UpdateEntry, DeleteEntry, GetHistory, Login — operator fun invoke(), Result<T>
├── core_api/            DTOs + kotlinx.serialization (EntryResponse, EntryRequest, HistoryResponse, LoginRequest/Response, ErrorResponse)
├── core_db/             Exposed tables, EntriesRepository, HistoryRepository, Flyway migrations
└── core_constants/      ApiRoutes, ValidationConstants, ErrorCodes, LogTags
```

Standards honored: features → UseCases → Repositories (never DB direct); no magic values (all in `core_constants`); `AppConfig` object is the only place reading `System.getenv()`; SLF4J/Logback logging in `MODULE :: File :: function() :: message` format; enums for domains: `Ring { ADOPT, TRIAL, ASSESS, HOLD }`, `Quadrant { LANGUAGES_FRAMEWORKS, TOOLS, PLATFORMS, TECHNIQUES }` with `apiName` + `fromApiName()` — no string `when` blocks.

DI is **Koin** — the idiomatic Ktor choice for constructor-injected, testable components.

### Data model (PostgreSQL, Flyway-migrated)

```sql
entries (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,        -- unique, case-insensitive (UNIQUE INDEX on LOWER(name))
  quadrant     VARCHAR(30)  NOT NULL,        -- CHECK: 4 quadrant values
  ring         VARCHAR(10)  NOT NULL,        -- CHECK: ADOPT|TRIAL|ASSESS|HOLD
  description  TEXT         NOT NULL,
  is_new       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
)

entry_history (                               -- append-only snapshot per mutation
  id           SERIAL PRIMARY KEY,
  entry_id     INTEGER      NOT NULL,        -- no FK cascade delete; history survives entry deletion
  name         VARCHAR(100) NOT NULL,
  quadrant     VARCHAR(30)  NOT NULL,
  ring         VARCHAR(10)  NOT NULL,
  description  TEXT         NOT NULL,
  is_new       BOOLEAN      NOT NULL,
  change_type  VARCHAR(10)  NOT NULL,        -- CREATED | UPDATED | DELETED
  changed_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
)
```

Every successful POST/PUT/DELETE appends one history row (the resulting state; for DELETED, the last state). "When did X move rings" = consecutive history rows for an entry with different `ring`.

### API contract

| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/api/entries` | public | `200` `[Entry]` |
| GET | `/api/entries/history?entryId=` | public | `200` `[HistoryRow]` (desc by changedAt; optional filter) |
| POST | `/api/entries` | Bearer JWT | `201` Entry · `400` validation · `401` · `409` duplicate name |
| PUT | `/api/entries/{id}` | Bearer JWT | `200` Entry · `400` · `401` · `404` · `409` |
| DELETE | `/api/entries/{id}` | Bearer JWT | `204` · `401` · `404` |
| POST | `/api/auth/login` | public | `200` `{token, expiresAt}` · `401` |
| GET | `/api/health` | public | `200` `{status:"ok"}` (uptime monitoring target) |

Error envelope: `{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": { "field": "reason" } } }`.

Validation: `name` required, ≤100 chars, unique case-insensitive; `ring`/`quadrant` must parse via enum `fromApiName()`; `description` required non-blank. JSON casing over the wire: camelCase (`isNew`, `createdAt`).

### Auth

Single admin account. Env: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (bcrypt), `JWT_SECRET`. `POST /api/auth/login` verifies bcrypt, issues HS256 JWT (8h expiry, issuer/audience claims). Ktor `Authentication(jwt)` plugin guards write routes. GET stays public per the plan.

CORS: allowlist `https://radar.codehub.gr` + localhost dev ports, methods GET/POST/PUT/DELETE, `Authorization` header allowed.

### Seed

`SeedRunner` (invoked via `--seed` program arg or gradle task): inserts 20 entries only when the table is empty (idempotent), writing CREATED history rows. Content reflects Code.Hub reality — e.g. Kotlin (Adopt), Jetpack Compose (Adopt), KMP (Trial), Ktor (Trial), TypeScript (Adopt), React (Adopt), XML Views (Hold), GitHub Actions (Adopt), Detekt (Trial), Renovate (Assess), Jenkins (Hold), Firebase (Adopt), PostgreSQL (Adopt), Docker (Adopt), Cloudflare Pages (Trial), Supabase (Assess), MVI Architecture (Adopt), Trunk-Based Development (Trial), TDD (Trial), GitFlow (Hold) — exactly 20 at implementation, 5 per quadrant, each with a 2–3 sentence "what it is · why this ring · which project" description.

## 5. Frontend design

### Structure

```
frontend/src/
├── api/            typed client (fetch), TanStack Query hooks, DTO types
├── components/     Button, Input, Chip, Modal, Toast, ConfirmDialog … (design-system tokens)
├── features/
│   ├── radar/      RadarChart (SVG), blip layout engine, Legend, BlipTooltip
│   ├── entries/    EntryListView (quadrant→ring groups), DetailPanel, FilterBar
│   └── admin/      LoginPage, AdminPage, EntryTable, EntryFormModal
├── lib/            radarGeometry.ts (pure), seededRandom.ts, filtering.ts (pure)
├── pages/          HomePage, AdminPage, LoginPage (React Router)
└── styles/         tokens.css (CSS variables from design-system/MASTER.md), Tailwind config
```

### Radar rendering (the core component)

**D3 computes, React renders.** D3 supplies math (scales, arcs, deterministic layout); React owns the DOM and renders SVG elements. No `d3-selection` DOM mutation — avoids two owners of the tree, keeps components testable.

- Geometry: quadrant = 90° sector; rings = radial bands with edges at `[0, 0.36, 0.62, 0.82, 1.0] × R` (inner rings wider — classic radar look, Adopt innermost).
- Blip placement: `computeBlipLayout(entries, size)` — deterministic seeded-random position within each blip's sector×band (seed = entry id, so positions are stable across reloads), then iterative collision relaxation clamped to the band. Pure function, unit-tested: stays inside its band/sector, no overlaps beyond tolerance, deterministic.
- Blips: numbered dots (Fira Code) colored by ring (see design system: Adopt `#f97316`, Trial `#38bdf8`, Assess `#a78bfa`, Hold `#8b8b93`); `isNew` gets an accent glow + pulse ring (disabled under `prefers-reduced-motion`) — numbers cross-reference the list view.
- Interaction: hover → tooltip; click/Enter → detail panel; blips are real buttons in the a11y tree (tabbable, labeled "Kotlin — Adopt, Languages & Frameworks"); hit area extended to ≥44px via transparent overlay circle.
- Filtering dims non-matching blips to 25% opacity instead of removing them (spatial stability).
- Performance: layout memoized on `(entries, size)`; SVG with ≤100 nodes renders far under the 1s budget; no re-layout on hover/selection.

### Pages & UX (per `design-system/code.hub-tech-radar/MASTER.md`)

- **Home `/`:** header (logo, title, search), filter chips (quadrants, rings, "New only"), radar + slide-in detail panel (60/40 split ≥1024px), legend, grouped list view below (always rendered — the accessible and SEO representation). Mobile <768px: list is primary, radar becomes compact overview, detail panel becomes bottom sheet.
- **Deep-linkable state:** filters and selected entry live in URL search params (`?quadrant=tools&ring=adopt&q=kotlin&entry=12`) — shareable views for free.
- **Login `/admin/login`:** single card form, inline errors, loading state on submit.
- **Admin `/admin`:** guarded route; entries table (sort, filter), add/edit via modal form (validation on blur, errors below fields), delete with confirm dialog, toasts for outcomes. Token in localStorage, 401 responses auto-redirect to login.
- Empty/error/loading states everywhere: skeleton radar while loading, friendly empty state, error state with retry.

### State

TanStack Query for server state (entries list cached, invalidated on mutations — no polling); URL params for filter/selection state; tiny auth context for the token. No Redux/Zustand — nothing left to hold.

## 6. Testing

- **Backend:** Ktor `testApplication` endpoint tests — CRUD happy paths, 400 validation (bad ring/quadrant/blank name), 401 without/with-bad token, 404, 409 duplicate, history append on each mutation, login success/failure, health. DB: H2 in PostgreSQL-compatibility mode for speed (Flyway runs same migrations; PG-specific SQL avoided).
- **Frontend:** Vitest + RTL — `radarGeometry` invariants, `filtering` logic, API client behavior (mocked fetch), FilterBar/DetailPanel component tests.
- **E2E:** Playwright against docker-compose stack — chromium + firefox + webkit projects (the plan's cross-browser matrix): radar loads with seeded blips, click blip → panel, filter works, admin login → create entry → visible on radar.

## 7. Deployment prep (DevOps deliverables)

- `backend/Dockerfile`: multi-stage Gradle build → JRE 21 slim; `frontend/Dockerfile`: Vite build → nginx.
- `deploy/docker-compose.yml`: postgres (volume, healthcheck) + backend (waits healthy) + frontend; `deploy/.env.example` documents every variable.
- `.github/workflows/`: backend (build + test), frontend (typecheck + test + build); deploy jobs templated with commented Cloudflare Pages / registry-push steps ready to arm when secrets are configured.
- `docs/DEPLOYMENT.md`: DNS record table (radar → Pages/host, api-radar → server), HTTPS notes, uptime check on `/api/health`, daily `pg_dump` backup cron, secret inventory, redeploy steps, and the go-live checklist.
- `docs/API.md`: endpoint list with request/response examples.

## 8. Success criteria (from the implementation plan, verifiable)

1. Radar renders < 1s with 100 entries; page interactive < 2s on broadband.
2. API p95 < 200ms for GET /api/entries at this scale.
3. Works in Chrome, Firefox, Safari (WebKit), Edge; usable at 375px, 768px, 1024px+.
4. GET endpoints public; POST/PUT/DELETE return 401 without a valid JWT.
5. Validation rejects bad ring/quadrant/blank name with field-level errors.
6. Every mutation appends a history row; `GET /api/entries/history` returns ring-movement trail.
7. Seed produces 20 entries (5 per quadrant) with real descriptions; radar shows them immediately.
8. Admin can log in, create, edit, delete — changes visible on the public radar after refetch.
9. No CORS errors from the configured origins.
10. `docker compose up` from a clean checkout yields a fully working stack.

## 9. Decision log

| Decision | Choice | Why |
|---|---|---|
| Backend language | Kotlin/Ktor | Plan offers it; in-house Kotlin expertise; dogfoods "Kotlin=Adopt" |
| DI | Koin | Idiomatic for Ktor; constructor injection, testable |
| ORM/migrations | Exposed + Flyway | Kotlin-native querying; real migration history for schema evolution |
| Blip color semantics | By ring, orange = Adopt only | Ring is the verdict; brand color marks what Code.Hub backs; Hold dimmest |
| D3 role | Math only, React renders | One DOM owner; testable pure layout |
| Blip layout | Seeded by entry id + collision relax | Stable positions across reloads; no layout jumps |
| Filter state | URL search params | Shareable deep links, back/forward works |
| List view | Always rendered below radar | Accessibility + SEO + mobile primary view, not an afterthought |
| History model | Append-only snapshots, no FK cascade | Survives deletions; simplest model answering "when did it move" |
| Name uniqueness | Case-insensitive unique + 409 | Duplicate techs must be merged; DB enforces it |
| Tests DB | H2 in PG mode | Fast unit tests; compose stack + Playwright covers real PG |
| Auth storage | localStorage + auto-redirect on 401 | Internal admin tool; documented trade-off, 8h token expiry |

## 10. Build order

1. **Backend foundation** — Gradle modules, config, DB, migrations, CRUD + auth + history + seed + tests + Dockerfile
2. **Frontend radar** — scaffold, tokens, geometry engine, radar SVG, legend, detail panel, list view, search/filter, responsive
3. **Admin** — login, guarded CRUD UI, toasts/validation
4. **Ship-ready** — compose stack, CI workflows, Playwright cross-browser, API/deployment docs, performance verification
