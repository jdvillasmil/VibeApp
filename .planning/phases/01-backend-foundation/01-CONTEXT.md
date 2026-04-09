# Phase 1: Backend Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding, Railway wiring, DB migration, and code quality baseline. No feature code — the goal is a connected, tested infrastructure that unblocks every subsequent phase. Success: `GET /health` returns 200 from Railway, Angular emulator calls it without CORS errors, all DB tables exist, and ESLint/Prettier pass clean.

</domain>

<decisions>
## Implementation Decisions

### Repo Organization
- Monorepo: `backend/` and `frontend/` as subfolders in a single git repo
- Railway service root directory set to `backend/` in Railway settings — Railway only sees the backend subfolder
- One root-level `.gitignore` covering both subfolders (node_modules, .env, dist, www, android/ build artifacts)
- Branch strategy: `main` + feature branches; Railway auto-deploys on push to `main`
- Ownership split: roughly one developer owns backend, one owns frontend (not a hard rule)

### Backend Folder Structure
- Layered MVC inside `backend/src/`:
  - `routes/` — Express routers
  - `controllers/` — req/res handling
  - `services/` — business logic
  - `middleware/` — auth, error handler, Multer upload
  - `config/` — db.js (pg Pool), migrate.js
  - `uploads/` — served as static files
  - `app.js` — Express app config (middleware, routes, static)
  - `index.js` — HTTP server start + Socket.io attach
- `app.js` exports the configured Express app; `index.js` starts the server — kept separate for testability
- CommonJS (`require`) throughout — no ES modules, no transpilation needed
- `npm run dev` = nodemon, `npm start` = node (Railway uses `npm start`)

### DB Migration Scope
- `migrate.js` creates ALL tables in Phase 1: `users`, `friendships`, `chats`, `messages`, `notifications`, `fcm_tokens`
- Idempotent: `CREATE TABLE IF NOT EXISTS` everywhere — safe to re-run, never wipes data
- No seed data — clean database, tables only

### Frontend Scaffold Depth
- Minimal scope for Phase 1: `ionic start` + environment file setup + one health check call to verify connectivity and CORS
- Environment files: `environment.ts` (`apiUrl: 'http://localhost:3000'`) and `environment.prod.ts` (`apiUrl: 'https://your-app.railway.app'`) — Angular `--prod` build picks the right one automatically
- Capacitor initialized now (`ionic capacitor add android`) — critical for verifying `capacitor://localhost` CORS handling early, not at APK time
- Page routing and guards deferred to future phases

### Claude's Discretion
- Exact ESLint/Prettier config rules (standard Angular + Node rules are fine)
- Health check endpoint response shape (as long as it returns 200)
- Exact DB column types and constraints (within reasonable Postgres conventions)
- Which port the backend binds to locally (3000 is conventional)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — blank repo, building from scratch

### Established Patterns
- None yet — patterns established here propagate through Phases 2–6

### Integration Points
- Railway: backend/ subfolder → auto-deploy on push to main; DATABASE_URL env var wired in Railway service settings
- Capacitor: `capacitor://localhost` origin must be in CORS allowlist from day one
- Angular: `environment.ts` / `environment.prod.ts` pattern set here is consumed in every future HTTP service

</code_context>

<specifics>
## Specific Ideas

- Backend must bind to `0.0.0.0:PORT` (not 127.0.0.1) for Railway compatibility — silent failure risk if wrong
- CORS must explicitly include `capacitor://localhost` — APK will fail silently without it
- All env vars documented in `.env.example`; `.env` never committed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-backend-foundation*
*Context gathered: 2026-04-08*
