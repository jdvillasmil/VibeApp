---
phase: 05-push-notifications
plan: 03
subsystem: ui
tags: [capacitor, push-notifications, fcm, android, angular]

# Dependency graph
requires:
  - phase: 05-02
    provides: "Backend POST /users/me/fcm-token endpoint for FCM token storage"
  - phase: 02-auth-and-profile
    provides: "HTTP interceptor that auto-attaches JWT to all requests"
provides:
  - "PushNotificationsService with initialize() and cleanup() methods"
  - "LoginPage wired to call initialize() after setToken() on successful login"
  - "AndroidManifest.xml POST_NOTIFICATIONS permission for Android 13+"
  - "@capacitor/push-notifications installed and synced to Android project"
affects: [05-04, 05-05]

# Tech tracking
tech-stack:
  added: ["@capacitor/push-notifications@8.0.3"]
  patterns: ["Capacitor.isNativePlatform() guard for browser no-op pattern", "firstValueFrom() for one-shot HTTP POST from async listener"]

key-files:
  created:
    - frontend/src/app/core/services/push-notifications.service.ts
  modified:
    - frontend/src/app/pages/login/login.page.ts
    - frontend/android/app/src/main/AndroidManifest.xml
    - frontend/package.json

key-decisions:
  - "Capacitor.isNativePlatform() guard makes initialize() a no-op in browser — prevents errors during web dev/testing"
  - "cap sync android run after ng build to register FCM service in Android Gradle project"
  - "initialize() called after setToken() in LoginPage — ensures JWT is present when FCM token POST fires via HTTP interceptor"

patterns-established:
  - "PushNotificationsService.initialize() pattern: guard → requestPermissions → register → addListeners"
  - "firstValueFrom() to await one-shot HTTP observable inside async Capacitor event listener"

requirements-completed: [NOTF-01]

# Metrics
duration: 5min
completed: 2026-04-10
---

# Phase 05 Plan 03: Push Notifications Frontend Summary

**FCM token registration service via @capacitor/push-notifications with browser no-op guard, wired into LoginPage after JWT set**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-11T03:44:00Z
- **Completed:** 2026-04-11T03:46:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `PushNotificationsService` that no-ops in browser, requests permission + registers + POSTs FCM token to backend on native Android
- Wired `initialize()` into `LoginPage.onSubmit()` immediately after `setToken()` so JWT is present for the authenticated token POST
- Added `POST_NOTIFICATIONS` uses-permission to AndroidManifest.xml for Android 13+ (API 33+)
- Installed `@capacitor/push-notifications@8.0.3` and ran `npx cap sync android` to register FCM service in Gradle

## Task Commits

(Per user preference, commits are made manually — no automated commits.)

1. **Task 1: Create PushNotificationsService** - feat: install @capacitor/push-notifications, create service, cap sync android
2. **Task 2: Wire initialize() into LoginPage and add AndroidManifest permission** - feat: add pushNotifications.initialize() in LoginPage, POST_NOTIFICATIONS in manifest

## Files Created/Modified
- `frontend/src/app/core/services/push-notifications.service.ts` - PushNotificationsService: initialize() (guard + requestPermissions + register + listeners), cleanup() (removeAllListeners)
- `frontend/src/app/pages/login/login.page.ts` - Injected PushNotificationsService, added initialize() call after setToken()
- `frontend/android/app/src/main/AndroidManifest.xml` - Added POST_NOTIFICATIONS uses-permission
- `frontend/package.json` - Added @capacitor/push-notifications dependency

## Decisions Made
- `Capacitor.isNativePlatform()` guard used so the service is completely safe to inject/call in browser — no Capacitor native errors during web development
- `firstValueFrom()` used inside the `registration` event listener to convert the HTTP POST Observable to a Promise — required because Capacitor listeners are async callbacks
- `cap sync android` ran after build since `google-services.json` was already present at `frontend/android/app/google-services.json`

## Deviations from Plan

None - plan executed exactly as written.

The only minor note: `npx cap sync android` failed on first attempt (before build) because `www/index.html` did not yet exist. Fixed automatically by running `ng build` first, then `cap sync`. This is normal Capacitor workflow order, not a plan deviation.

## Issues Encountered
- `cap sync android` requires `www/index.html` (Angular build output) to exist before syncing. Resolved by running `ng build` first, then `cap sync`. Both succeeded.

## User Setup Required

**google-services.json was already present** at `frontend/android/app/google-services.json` (placed during Plan 02 user setup), so `npx cap sync android` ran successfully without any additional manual steps.

## Next Phase Readiness
- Frontend FCM token registration is complete. On first login on a physical Android device, the app will request notification permission and POST the token to the backend.
- Plan 05-04 (send notification on match event) can now proceed — the token pipeline is fully in place.
- Physical Android device with Google Play Services is required for end-to-end testing (emulator without Play Services will not receive FCM tokens).

---
*Phase: 05-push-notifications*
*Completed: 2026-04-10*
