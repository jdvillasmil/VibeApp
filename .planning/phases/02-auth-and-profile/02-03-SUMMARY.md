---
phase: 02-auth-and-profile
plan: "03"
subsystem: auth, ui
tags: [angular, ionic, capacitor, jwt, auth-guard, http-interceptor, signals]

# Dependency graph
requires:
  - phase: 02-01
    provides: POST /auth/register, POST /auth/login JWT endpoints
  - phase: 02-02
    provides: GET /users/me, PATCH /users/me, PATCH /users/me/avatar profile endpoints

provides:
  - AuthService with login/register/logout/getToken/isAuthenticated signal via @capacitor/preferences
  - Functional HTTP interceptor using from()+switchMap() pattern — auto-attaches Bearer token
  - CanActivateFn route guard returning UrlTree for unauthenticated redirect to /login
  - Login page (reactive form, AlertController on error)
  - Register page (reactive form, optional file input for avatar)
  - Profile page (avatar display, bio/name edit, avatar upload, logout)
  - AvatarComponent with deterministic initials+color fallback when no avatarUrl
  - app.routes.ts with login/register/profile routes; profile guarded by authGuard
  - main.ts using provideHttpClient(withInterceptors([authInterceptor]))

affects:
  - phase-03-discovery (uses profile as entry point after auth)
  - phase-04-matching (auth guard pattern reused for match routes)
  - phase-05-chat (auth token needed for WebSocket handshake)

# Tech tracking
tech-stack:
  added: ["@capacitor/preferences"]
  patterns:
    - "Functional HTTP interceptor: from(Promise).pipe(switchMap()) to handle async token"
    - "Route guard returns UrlTree not false — router.createUrlTree(['/login'])"
    - "Angular signals: isAuthenticated signal in AuthService, selectedFile signal in RegisterPage, user signal in ProfilePage"
    - "Standalone component pattern: all pages/components use standalone: true with explicit imports"
    - "loadComponent() lazy loading in app.routes.ts for all page routes"

key-files:
  created:
    - frontend/src/app/core/services/auth.service.ts
    - frontend/src/app/core/interceptors/auth.interceptor.ts
    - frontend/src/app/core/guards/auth.guard.ts
    - frontend/src/app/shared/components/avatar/avatar.component.ts
    - frontend/src/app/pages/login/login.page.ts
    - frontend/src/app/pages/login/login.page.html
    - frontend/src/app/pages/register/register.page.ts
    - frontend/src/app/pages/register/register.page.html
    - frontend/src/app/pages/profile/profile.page.ts
    - frontend/src/app/pages/profile/profile.page.html
  modified:
    - frontend/src/app/app.routes.ts
    - frontend/src/main.ts
    - frontend/package.json

key-decisions:
  - "@capacitor/preferences used for JWT storage — not localStorage, survives app restarts on device"
  - "from()+switchMap() in interceptor — only pattern that handles Promise-returning getToken() correctly in HttpInterceptorFn"
  - "router.createUrlTree(['/login']) returned from guard — UrlTree enables correct browser history vs return false"
  - "AvatarComponent: hash = (hash * 31 + charCode) % COLORS.length — simple deterministic color, no external dep"
  - "cap sync skipped (no www/ build dir yet) — acceptable at dev stage, package is installed"

patterns-established:
  - "AuthService pattern: all HTTP methods return firstValueFrom() — async/await-friendly in components"
  - "Page error handling: AlertController.create() for user-facing errors, no console-only silencing"
  - "Avatar fallback: onError() sets avatarUrl = null triggering ngIf branch switch"

requirements-completed: [AUTH-04, AUTH-06, AUTH-07, PROF-01, PROF-02, PROF-03, PROF-04]

# Metrics
duration: 25min
completed: 2026-04-09
---

# Phase 02 Plan 03: Angular Auth + Profile UI Summary

**Angular 20 standalone auth flow with @capacitor/preferences JWT storage, from()+switchMap() HTTP interceptor, UrlTree route guard, login/register/profile pages, and deterministic initials avatar component**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-09T00:00:00Z
- **Completed:** 2026-04-09T00:25:00Z
- **Tasks:** 2 of 3 automated (1 is human-verify checkpoint)
- **Files modified:** 13

## Accomplishments

- Installed @capacitor/preferences and wired it into AuthService for secure cross-platform JWT storage
- Built full auth flow: login page, register page (with optional avatar upload), profile page (avatar display/edit, bio/name edit, logout)
- Implemented functional HTTP interceptor (from()+switchMap() pattern) and CanActivateFn guard (UrlTree pattern) — wired into main.ts and app.routes.ts

## Task Commits

Commits skipped per user preference (user commits manually).

1. **Task 1: Install @capacitor/preferences, create auth service + interceptor + guard + avatar component** — feat
2. **Task 2: Create login, register, profile pages; update routes and main.ts** — feat

## Files Created/Modified

- `frontend/src/app/core/services/auth.service.ts` — login, register, logout, getToken, setToken, getProfile, updateProfile; isAuthenticated signal
- `frontend/src/app/core/interceptors/auth.interceptor.ts` — HttpInterceptorFn using from()+switchMap() for async token attachment
- `frontend/src/app/core/guards/auth.guard.ts` — CanActivateFn returning UrlTree redirect to /login when unauthenticated
- `frontend/src/app/shared/components/avatar/avatar.component.ts` — Standalone AvatarComponent with initials+deterministic-color fallback
- `frontend/src/app/pages/login/login.page.ts` + `.html` — Reactive form login with AlertController error handling
- `frontend/src/app/pages/register/register.page.ts` + `.html` — Reactive form register with optional file avatar input
- `frontend/src/app/pages/profile/profile.page.ts` + `.html` — Profile display/edit with avatar change, bio/name form, logout
- `frontend/src/app/app.routes.ts` — Replaced: login, register, profile routes; profile uses canActivate: [authGuard]
- `frontend/src/main.ts` — Updated: provideHttpClient(withInterceptors([authInterceptor]))
- `frontend/package.json` — @capacitor/preferences added

## Decisions Made

- @capacitor/preferences chosen over localStorage — persists across app restarts on native device, uses IndexedDB in browser (capacitor namespace, not raw localStorage)
- from()+switchMap() in interceptor — getToken() is async (Promise); synchronous access would fail; this is the only correct pattern for HttpInterceptorFn
- UrlTree returned from guard — enables proper browser history navigation; returning false would not redirect, just block
- cap sync not run at this stage — www/ directory does not exist yet (no production build); package is fully installed, sync runs when building for device

## Deviations from Plan

None — plan executed exactly as written. TypeScript compilation passes with zero errors.

## Issues Encountered

- `npx cap sync` reported missing www/ directory — expected at development stage (no build yet). Package installed correctly; sync will succeed after `npm run build`.

## User Setup Required

None — no external service configuration required. All environment variables were set in Phase 1.

## Next Phase Readiness

- Frontend auth flow is complete and TypeScript-clean
- Awaiting human verification of browser flow (checkpoint task 3 in this plan)
- Once verified: Phase 3 (Discovery/Matching UI) can begin — auth guard pattern is established and reusable

---
*Phase: 02-auth-and-profile*
*Completed: 2026-04-09*
