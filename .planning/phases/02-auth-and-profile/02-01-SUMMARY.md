---
phase: 02-auth-and-profile
plan: 01
subsystem: backend-auth
tags: [auth, jwt, bcrypt, middleware, express]
dependency_graph:
  requires: [01-01-database-schema, 01-03-cloudinary-upload]
  provides: [verifyToken-middleware, POST-auth-register, POST-auth-login]
  affects: [all-protected-routes, 02-02-user-profile]
tech_stack:
  added: [bcryptjs, jsonwebtoken]
  patterns: [JWT-bearer-auth, bcrypt-password-hashing, envelope-response]
key_files:
  created:
    - backend/src/middleware/auth.middleware.js
    - backend/src/services/auth.service.js
    - backend/src/controllers/auth.controller.js
    - backend/src/routes/auth.js
  modified:
    - backend/src/app.js
    - backend/package.json
decisions:
  - "bcryptjs used instead of bcrypt — no native build required, Render-safe, same API"
  - "JWT expiry set to 7d — balances security and UX for mobile app"
  - "signToken returns only { id, email } in payload — minimal JWT surface area"
  - "password_hash deleted from user object before response — never leaks hash in login response"
metrics:
  duration: ~10min
  completed: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
---

# Phase 2 Plan 1: Backend Auth Layer Summary

**One-liner:** JWT auth with bcryptjs password hashing — register, login, and verifyToken middleware wired into Express.

## What Was Built

- Installed `bcryptjs` and `jsonwebtoken` in the backend
- Created `auth.middleware.js` — `verifyToken` reads the `Authorization: Bearer <token>` header, calls `jwt.verify`, attaches `req.user = { id, email }`, returns 401 on failure
- Created `auth.service.js` — `register` hashes password at 10 salt rounds and inserts user; `login` queries by email, runs `bcrypt.compare`, throws `'Invalid credentials'` on mismatch; `signToken` signs a 7-day JWT
- Created `auth.controller.js` — `register` handler returns 201 envelope with user (no password_hash) + token; `login` deletes password_hash before response, returns 200 envelope
- Created `auth.routes.js` — `POST /register` uses `uploadAvatar.single('avatar')` (optional), `POST /login` is JSON-only
- Mounted `/auth` router in `app.js` after the existing `/health` route

## Verification

- `verifyToken` imported successfully: `typeof verifyToken === 'function'` → OK
- Auth route mounted in app: `app._router.stack` includes auth regexp → OK
- `bcryptjs` and `jsonwebtoken` present in `backend/package.json` dependencies

## Decisions Made

1. **bcryptjs over bcrypt** — Pure JS implementation avoids native compilation errors on Render. Resolves the Phase 2 blocker documented in STATE.md.
2. **JWT payload: { id, email } only** — Minimal surface area; avoids stale role data in tokens.
3. **7-day token expiry** — Reasonable for a mobile dating app without explicit refresh tokens yet.
4. **password_hash deleted on login** — `delete user.password_hash` before passing to response ensures hash never appears in any API output.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `backend/src/middleware/auth.middleware.js` exists
- [x] `backend/src/services/auth.service.js` exists
- [x] `backend/src/controllers/auth.controller.js` exists
- [x] `backend/src/routes/auth.js` exists
- [x] `backend/src/app.js` modified — `/auth` mounted
- [x] `backend/package.json` — bcryptjs and jsonwebtoken in dependencies
- [x] verifyToken verified: returns function
- [x] auth route mount verified: regexp found in app._router.stack
