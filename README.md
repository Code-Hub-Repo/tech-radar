# Code.Hub Tech Radar

Interactive technology radar for [Code.Hub](https://codehub.gr) — a single, always-current view of which technologies our teams **Adopt**, **Trial**, **Assess**, or **Hold**, across four quadrants: Languages & Frameworks, Tools, Platforms, and Techniques.

- **Live:** radar.codehub.gr *(pending deployment)*
- **API:** api-radar.codehub.gr *(pending deployment)*

## Repository layout

| Path | What it is |
|---|---|
| `frontend/` | Radar UI — React · Vite · TypeScript · Tailwind CSS · D3 |
| `backend/` | REST API — Kotlin · Ktor · Exposed · Flyway · PostgreSQL |
| `deploy/` | docker-compose stack, environment templates, runbooks |
| `design-system/` | Visual design tokens and component specs |
| `docs/` | Design spec, API reference, deployment guide |

## Documentation

- [Design spec](docs/DESIGN.md) — architecture, API contract, data model, decision log
- [Design system](design-system/code.hub-tech-radar/MASTER.md) — palette, typography, component specs

## Status

Design complete; implementation in progress. `frontend/`, `backend/`, and `deploy/` land phase by phase — each phase arrives with its tests.

---

Maintained by Giorgos Vergidis — Senior Android Developer & Tech Ambassador, Code.Hub
