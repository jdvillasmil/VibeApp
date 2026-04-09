---
phase: 1
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No test framework — greenfield project. Wave 0 installs smoke helpers. |
| **Config file** | Wave 0 creates: `backend/src/__tests__/` + basic smoke test |
| **Quick run command** | `node src/config/migrate.js && curl -s http://localhost:3000/health` |
| **Full suite command** | `cd backend && npx eslint src/ && node src/config/migrate.js && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node src/config/migrate.js` (backend tasks) or `ng lint` (frontend tasks)
- **After every plan wave:** Run full smoke suite: backend up + `GET /health` 200 + lint clean
- **Before `/gsd:verify-work`:** Android emulator calls Railway health check without CORS errors
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | FOUND-01 | smoke | `PORT=3001 node src/index.js & sleep 2 && curl -s http://localhost:3001/health && kill %1` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | FOUND-02, FOUND-03 | smoke | `node src/config/migrate.js` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | FOUND-07 | manual | Review `.env.example` exists and lists all required keys | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | FOUND-06 | smoke | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | FOUND-04 | manual | `curl -H "Origin: capacitor://localhost" http://localhost:3000/health` check CORS headers | N/A | ⬜ pending |
| 1-01-06 | 01 | 1 | FOUND-05 | smoke | `curl -s http://localhost:3000/uploads/.gitkeep` returns 200 | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | QUAL-01, QUAL-03 | automated | `cd backend && npx eslint src/ && cd ../frontend && ng lint` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | FOUND-08 | manual | `ionic build --prod` completes; inspect built JS for Railway URL | N/A | ⬜ pending |
| 1-02-03 | 02 | 2 | QUAL-02 | manual | Review GET /health response shape: `{ data, error, message }` | N/A | ⬜ pending |
| 1-02-04 | 02 | 2 | QUAL-04 | manual | Code review — signals used for local state, no NgModule | N/A | ⬜ pending |
| 1-02-05 | 02 | 2 | QUAL-05 | manual | Inspect production build output for console.error | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/uploads/.gitkeep` — required for static file serving on fresh checkout
- [ ] `backend/.env.example` — required before any developer can run the backend
- [ ] `backend/src/config/db.js` — pg Pool singleton (all subsequent tasks depend on this)
- [ ] `backend/src/config/migrate.js` — all tables must exist before any backend feature work
- [ ] `backend/eslint.config.mjs` — linting must pass before Phase 2 begins
- [ ] `frontend/` — `ng add @angular-eslint/schematics@18` (QUAL-01 requires from day one)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CORS allows capacitor://localhost | FOUND-04 | HTTP headers need visual inspection; no automation without a running emulator | `curl -H "Origin: capacitor://localhost" http://localhost:3000/health` — verify `Access-Control-Allow-Origin` header present |
| .env.example completeness | FOUND-07 | File content review; no automation for "completeness" | Verify file lists all vars: DATABASE_URL, PORT, NODE_ENV, RAILWAY_PUBLIC_DOMAIN, CORS_ORIGIN |
| Angular environments configured | FOUND-08 | Requires manual build inspection | `ionic build --prod`; inspect `main.js` for Railway URL substring |
| API envelope format | QUAL-02 | Shape validation; no schema enforcement in Phase 1 | Call `GET /health`, verify JSON: `{ data: {...}, error: null, message: "..." }` |
| Signals for local state | QUAL-04 | No automated rule available in ESLint | Code review: no `BehaviorSubject` in component files, uses `signal()` / `computed()` |
| No console.error in prod | QUAL-05 | Build output inspection | Search prod bundle for console.error strings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
