---
phase: 2
slug: auth-and-profile
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No automated test framework (manual + curl smoke tests) |
| **Config file** | None — manual verification per task |
| **Quick run command** | `curl -s -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"t@test.com","password":"password123"}'` |
| **Full suite command** | Start backend, run register → login → GET /users/me → PATCH /users/me sequence manually |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Start backend locally, run the relevant curl command from the task map below
- **After every plan wave:** Full sequence: register → login → GET /users/me → PATCH /users/me → avatar upload
- **Before `/gsd:verify-work`:** Full suite must be green (all smoke tests pass, manual checks confirmed)
- **Max feedback latency:** ~5 minutes per wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | AUTH-01 | wave0 | `npm install bcryptjs jsonwebtoken` in backend | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | AUTH-01 | wave0 | `backend/src/routes/auth.js` stub created | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 0 | AUTH-05 | wave0 | `backend/src/middleware/auth.middleware.js` stub created | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | AUTH-01 | smoke | `curl -X POST http://localhost:3000/auth/register -F "name=Test" -F "email=t@test.com" -F "password=pass123"` | ❌ W0 | ⬜ pending |
| 2-01-05 | 01 | 1 | AUTH-02 | manual | Inspect DB: `SELECT password_hash FROM users` — must start with `$2b$` | N/A | ⬜ pending |
| 2-01-06 | 01 | 1 | AUTH-03 | smoke | `curl -X POST http://localhost:3000/auth/login -d '{"email":"t@test.com","password":"pass123"}'` — verify `data.token` present | ❌ W0 | ⬜ pending |
| 2-01-07 | 01 | 1 | AUTH-05 | smoke | `curl http://localhost:3000/users/me` without token → expect 401; with token → expect 200 | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | PROF-01 | smoke | `curl http://localhost:3000/users/me -H "Authorization: Bearer TOKEN"` — verify all profile fields, no password_hash | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | PROF-02 | smoke | `curl -X PATCH http://localhost:3000/users/me -d '{"bio":"test"}' -H "Authorization: Bearer TOKEN"` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 1 | PROF-03 | smoke | `curl -X PATCH http://localhost:3000/users/me/avatar -F "avatar=@photo.jpg" -H "Authorization: Bearer TOKEN"` — verify Cloudinary URL in response | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | AUTH-04 | manual | Open app without stored token, navigate to `/profile` — verify redirect to `/login` | N/A | ⬜ pending |
| 2-03-02 | 03 | 2 | AUTH-06 | manual | Network inspector in browser/emulator — verify `Authorization: Bearer ...` header on API calls | N/A | ⬜ pending |
| 2-03-03 | 03 | 2 | AUTH-07 | manual | Log in with user having no avatar; verify initials circle appears | N/A | ⬜ pending |
| 2-03-04 | 03 | 2 | PROF-04 | manual | Navigate to profile without uploaded avatar — verify initials + deterministic background color | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install bcryptjs jsonwebtoken` in `backend/` — packages must be present before any auth code runs
- [ ] `backend/src/routes/auth.js` — must exist before any auth test can run
- [ ] `backend/src/middleware/auth.middleware.js` — required for all protected endpoint tests
- [ ] `npm install @capacitor/preferences && npx cap sync` in `frontend/` — required before interceptor runs on device

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Password stored as bcrypt hash | AUTH-02 | DB inspection required; no API exposes raw hash | `SELECT password_hash FROM users WHERE email='t@test.com'` — must start with `$2b$` |
| JWT stored in @capacitor/preferences | AUTH-04 | Capacitor Preferences are native (not localStorage/sessionStorage) — no automated way to inspect | Android emulator DevTools: verify no token in localStorage; Preferences visible in native storage |
| HTTP interceptor attaches JWT | AUTH-06 | Network-layer inspection required in app context | Network inspector — verify `Authorization: Bearer ...` header on authenticated API calls |
| Unauthenticated redirect to login | AUTH-07 | Angular route guard behavior verified in running app | Open app without token, navigate to protected route — must redirect to `/login` |
| Avatar fallback initials + color | PROF-04 | Visual rendering requires emulator/browser | Log in with user having no avatar; verify initials circle appears with deterministic background color |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 minutes per wave
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
