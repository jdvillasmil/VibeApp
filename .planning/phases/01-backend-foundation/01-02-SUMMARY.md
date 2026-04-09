---
phase: 01-backend-foundation
plan: 02
subsystem: frontend
tags: [ionic, angular, capacitor, standalone, signals, eslint, environments]

requires:
  - 01-01 (backend health endpoint)
provides:
  - Ionic 8 standalone Angular frontend in frontend/
  - Environment switching dev/prod via angular.json fileReplacements
  - HomePage standalone component with signal() state and health check
  - Capacitor Android native project (frontend/android/)
  - Angular ESLint baseline zero errors
affects: [02-auth, 03-social, 04-realtime, 05-notifications, 06-polish]

tech-stack:
  added:
    - ionic/angular@8
    - angular/core@20 (upgraded from plan Angular 18)
    - capacitor/core@8.3.0
    - capacitor/cli@8.3.0
    - capacitor/android@8
    - angular-eslint@20
  patterns:
    - bootstrapApplication() standalone bootstrap
    - loadComponent() lazy routes
    - ionic/angular/standalone for all Ionic UI
    - signal() state, inject() DI
    - fileReplacements in angular.json

key-files:
  created:
    - frontend/package.json
    - frontend/capacitor.config.ts
    - frontend/angular.json
    - frontend/src/main.ts
    - frontend/src/app/app.routes.ts
    - frontend/src/app/app.component.ts
    - frontend/src/app/home/home.page.ts
    - frontend/src/app/home/home.page.html
    - frontend/src/environments/environment.ts
    - frontend/src/environments/environment.prod.ts
    - frontend/android/

key-decisions:
  - Angular 20 used not 18 - ionic start upgraded, zone.js conflict prevented downgrade, patterns identical
  - Migrated NgModule scaffold to standalone - plan requires standalone: true throughout
  - provideHttpClient() added in bootstrapApplication providers for inject(HttpClient)

requirements-completed: [FOUND-08, QUAL-01, QUAL-03, QUAL-04, QUAL-05]

duration: 10min
completed: 2026-04-09
---

# Phase 1 Plan 02: Frontend Scaffold Summary

**Ionic 8 + Angular 20 + Capacitor 8 standalone app with signal-based health check page, dev/prod environment switching, and zero-error ESLint baseline**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-09T13:52:48Z
- **Completed:** 2026-04-09T14:02:30Z
- **Tasks:** 3
- **Files:** 12 created

## Accomplishments

- Ionic 8 + Angular 20 project scaffolded in frontend/ with Capacitor integration
- Migrated NgModule bootstrap to bootstrapApplication() - all components use standalone: true
- Environment files: dev http://localhost:3000, prod https://your-app.railway.app
- angular.json fileReplacements verified - ionic build --prod swaps environment automatically
- home.page.ts uses signal() for state, inject(HttpClient) for HTTP, @ionic/angular/standalone imports
- Capacitor Android native project initialized in frontend/android/
- All @capacitor/* packages aligned on version 8 (core@8.3.0, cli@8.3.0, android@^8.3.0)
- Angular ESLint baseline: zero errors
- Production build verified - Railway URL confirmed in built bundle chunk

## Task Commits

1. Task 1: Scaffold Ionic project, Capacitor Android - 77b97b7 (feat)
2. Task 2: Configure environments, migrate standalone, health check - e1721c4 (feat)
3. Task 3: Verify lint, build, patterns - verification only, no file changes

## Decisions Made

- Angular 20 instead of 18: ionic start generated Angular 20, downgrading caused zone.js peer conflict, patterns identical
- Immediate standalone migration: scaffold NgModule converted to bootstrapApplication() + loadComponent()
- provideHttpClient() added: required for inject(HttpClient) in standalone components
- @capacitor/android installed separately at v8: ionic start does not add Android platform

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Angular 20 scaffold instead of Angular 18**
- Found during: Task 1 (ionic start scaffolding)
- Issue: ionic start generated Angular 20, downgrading to v18 caused zone.js peer conflict (0.14 vs 0.15)
- Fix: Accepted Angular 20 - all plan patterns met (standalone, signals, Capacitor 8.x)
- Committed in: 77b97b7

**2. [Rule 1 - Bug] NgModule scaffold requires migration to standalone**
- Found during: Task 2 (home.page.ts had standalone: false)
- Issue: ionic start generated NgModule components, plan requires standalone: true throughout
- Fix: Created app.routes.ts with loadComponent(), updated main.ts to bootstrapApplication(), converted AppComponent and HomePage to standalone
- Verification: ionic build success, ng lint zero errors, lazy chunk shows home-home-page
- Committed in: e1721c4

Total deviations: 2 auto-fixed. All success criteria met.

## Self-Check: PASSED

- frontend/src/environments/environment.ts with apiUrl localhost:3000 - exists
- frontend/src/environments/environment.prod.ts with railway.app - exists
- frontend/android/ Capacitor Android native project - exists
- Commits 77b97b7 and e1721c4 in git log
- ng lint: zero errors
- ionic build dev and prod: success
- Production bundle: Railway URL confirmed in 958.e54271db chunk

## Next Phase Readiness

- Frontend scaffold ready for Phase 2 auth implementation
- Patterns established: standalone components, signal() state, inject() DI, @ionic/angular/standalone
- HttpClient available via provideHttpClient() - auth service can use it immediately
- Environment switching working - Phase 2 auth routes use environment.apiUrl automatically
- Capacitor Android ready for CORS testing
- Blocker: Replace Railway URL placeholder in environment.prod.ts when Railway app is deployed

---
Phase: 01-backend-foundation
Completed: 2026-04-09