---
phase: 01-backend-foundation
plan: 03
subsystem: infra
tags: [render, cors, capacitor, android, eslint, deployment, integration]

# Dependency graph
requires:
  - 01-01 (Express backend with health route, CORS, and pg migration)
  - 01-02 (Ionic 8 Angular 20 frontend with environment switching and Capacitor Android)
provides:
  - Backend live on Render with public URL returning 200 for GET /health
  - All 6 DB tables migrated to Render PostgreSQL
  - CORS accepts both capacitor://localhost (iOS) and http://localhost (Android) from production URL
  - Angular environment.prod.ts updated with actual Render URL
  - End-to-end integration verified: Android emulator health check shows "ok"
  - ESLint zero errors on both backend and frontend confirmed post-deployment
  - .env confirmed absent from entire git history
affects: [02-auth, 03-social, 04-realtime, 05-notifications, 06-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RENDER_EXTERNAL_URL env var used in CORS allowlist (replaces hardcoded Render URL)
    - process.env.RENDER_EXTERNAL_URL with .filter(Boolean) guards against undefined when unset locally

key-files:
  created: []
  modified:
    - backend/src/app.js (CORS: replaced RAILWAY_STATIC_URL with RENDER_EXTERNAL_URL)
    - frontend/src/environments/environment.prod.ts (updated apiUrl with actual Render URL)

key-decisions:
  - "RENDER_EXTERNAL_URL used in CORS origin list — Render auto-injects this env var; no manual update needed on redeploy"
  - "RAILWAY_STATIC_URL reference replaced with RENDER_EXTERNAL_URL — plan was written for Railway but project uses Render"

patterns-established:
  - "Production CORS: dynamic allowlist using process.env.RENDER_EXTERNAL_URL + .filter(Boolean) so local dev ignores unset var"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05]

# Metrics
duration: 45min
completed: 2026-04-09
---

# Phase 1 Plan 03: Integration Checkpoint Summary

**Render deployment live with 6-table PostgreSQL migration, CORS verified for both Capacitor origins, Android emulator health check passes end-to-end**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-09T14:30:00Z
- **Completed:** 2026-04-09T15:15:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Backend deployed to Render and serving live traffic — GET /health returns `{ data: { status: 'ok' }, error: null, message: 'Service is healthy' }` with HTTP 200
- All 6 database tables (users, friendships, chats, messages, notifications, fcm_tokens) created in Render PostgreSQL via migrate.js
- CORS confirmed for both Capacitor origins: `capacitor://localhost` (iOS) and `http://localhost` (Android) both receive `Access-Control-Allow-Origin` header
- Android emulator end-to-end: tapping "Check Backend" in the app shows status "ok" with no CORS errors in Chrome DevTools
- Backend ESLint and frontend `ng lint` both pass with zero errors after deployment changes
- `.env` confirmed absent from all of git history (no output from `git log --all --full-history -- backend/.env`)

## Task Commits

1. **Task 1: Deploy backend to Render and run production migration** - `db410c0` (wip — pushed, Render deployed, migration ran, environment.prod.ts updated)

**Human checkpoint approved** — all 5 integration checks passed.

## Files Created/Modified

- `backend/src/app.js` — CORS allowlist updated: `RAILWAY_STATIC_URL` replaced with `RENDER_EXTERNAL_URL` (Render auto-injects this var)
- `frontend/src/environments/environment.prod.ts` — `apiUrl` updated from placeholder to actual Render service URL

## Decisions Made

- **RENDER_EXTERNAL_URL instead of hardcoded URL** — Render auto-injects `RENDER_EXTERNAL_URL` into the service environment. Using it in the CORS allowlist means the URL never needs manual updating when the service is redeployed or renamed. The `.filter(Boolean)` guard prevents undefined from entering the allowlist in local dev.
- **Plan said Railway, project uses Render** — All Railway references in the plan were treated as Render. The CORS env var change (`RAILWAY_STATIC_URL` → `RENDER_EXTERNAL_URL`) was the only code difference.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RAILWAY_STATIC_URL replaced with RENDER_EXTERNAL_URL in CORS config**
- **Found during:** Task 1 (deploy and CORS verification)
- **Issue:** Plan was authored for Railway. App is deployed to Render. `RAILWAY_STATIC_URL` is never injected on Render — the correct Render-auto-injected var is `RENDER_EXTERNAL_URL`.
- **Fix:** Updated `backend/src/app.js` CORS allowlist to use `process.env.RENDER_EXTERNAL_URL`
- **Files modified:** `backend/src/app.js`
- **Verification:** CORS headers returned for Render URL confirmed via curl in Check 2
- **Committed in:** b4500e8

---

**Total deviations:** 1 auto-fixed (1 wrong env var reference)
**Impact on plan:** Required for CORS to work with Render deployment. No scope creep.

## Issues Encountered

None beyond the RAILWAY_STATIC_URL → RENDER_EXTERNAL_URL fix above. Deployment and migration ran cleanly.

## User Setup Required

None — all Render environment variables (DATABASE_URL, JWT_SECRET, NODE_ENV, PORT, RENDER_EXTERNAL_URL) are either auto-injected by Render or were configured in the Render dashboard during Task 1.

## Next Phase Readiness

- Phase 1 complete — all 5 success criteria met and human-verified
- Backend live at Render public URL, accepting requests from Capacitor Android WebView
- All 6 DB tables exist in production PostgreSQL — Phase 2 auth endpoints can write to users, sessions
- CORS baseline established — Phase 2 auth routes will work without CORS changes
- ESLint/Prettier enforced — Phase 2 code changes will pass lint from the start
- Phase 2 (Auth) can begin immediately — JWT + bcrypt endpoints mount at /auth

---
*Phase: 01-backend-foundation*
*Completed: 2026-04-09*
