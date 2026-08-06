# AGENTS.md — SlidesInejoma

## Architecture

- **Monorepo**: `backend/` (Rust + Axum), `frontend/` (React + Vite), PostgreSQL 16.
- **Backend port**: 3000. **Frontend dev port**: 5173. Both set in `docker-compose.yml`.
- **PPT uploads**: Despite README mentioning PPT/PPTX, the backend actually expects **PDF** files. It uses `pdftoppm` (poppler-utils) to render each page to PNG at 200 DPI. Slides are stored as `uploads/{presentation_uuid}/slide_1.png`, `slide_2.png`, etc.
- **DB migrations**: Tables are created automatically at startup (`backend/src/db.rs` uses `CREATE TABLE IF NOT EXISTS`). There are no migration files — schema changes require editing `db.rs` and the `seed` binary.
- **WebSocket room model**: A `broadcast::channel` per 4-char presentation code, held in `WsState` (in-memory). Spectator count tracked via a separate `HashMap`.

## Commands

```bash
# Docker (all services)
docker-compose up --build
docker-compose exec backend cargo run --bin seed   # create admin user

# Local backend (needs PostgreSQL running)
cd backend && cargo run

# Local frontend
cd frontend && npm install && npm run dev

# Specific binaries
cargo run --bin seed          # seed admin user + create tables
cargo run --bin slides-inejoma-backend   # main server
```

## Environment variables

All in root `.env` (load by `dotenvy` in backend, by docker-compose for containers):

| Variable | Used by | Default |
|---|---|---|
| `DATABASE_URL` | backend | `postgres://postgres:postgres@localhost:5432/slides_inejoma_db` |
| `JWT_SECRET` | backend | hardcoded fallback |
| `PORT` | backend | `3000` |
| `ADMIN_EMAIL` | seed | `admin@inejoma.edu.co` |
| `ADMIN_PASSWORD` | seed | `AdminPass2026!` |
| `ADMIN_NAME` | seed | `Prof. Administrador` |
| `VITE_API_URL` | frontend (build-time via Docker ARG) | `http://localhost:3000` |
| `VITE_WS_URL` | frontend (build-time via Docker ARG) | `ws://localhost:3000/ws` |

## Backend state per route group

Route handlers use different Axum state types:

- `/api/auth/*` → `(PgPool, Config)`
- `/api/grades/*`, `/api/subjects/*`, `/api/presentations/*` → `PgPool` only
- `/ws` → `WsState`
- `/uploads/*` → static files (no state)

When adding routes, match the `.with_state()` pattern in `main.rs`.

## Key details

- **Grades are scoped to the current year** via `chrono::Utc::now().year()` — grades from past years won't show.
- **Presentation codes**: 4 alphanumeric chars, uppercase, excluding ambiguous characters (`0`, `O`, `I`, `1`).
- **Auth**: JWT with 12h expiry. Frontend stores token in `localStorage` with a matching 12h local expiry check.
- **Max upload body**: 100 MB (set in `main.rs` for PPT/PDF uploads).
- **No test suite, no CI, no linters/formatters** are configured. Manual verification only.
- **Frontend has no Vite proxy** — it calls the backend directly using `VITE_API_URL` / `VITE_WS_URL` env vars.
