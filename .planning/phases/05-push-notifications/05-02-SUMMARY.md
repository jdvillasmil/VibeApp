---
phase: 05-push-notifications
plan: 02
subsystem: api
tags: [firebase, fcm, push-notifications, firebase-admin, postgres]

# Dependency graph
requires:
  - phase: 05-01
    provides: DB migration adding fcm_tokens and notifications tables

provides:
  - firebase-admin singleton (backend/src/config/firebase.js)
  - notifications.service.js with getFcmToken, saveNotification, sendFcmPush
  - POST /users/me/fcm-token — saves/updates device FCM token via UPSERT
  - GET /notifications — returns user notification history (newest first, limit 50)
  - PATCH /notifications/read — marks all unread notifications as read

affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: [firebase-admin]
  patterns:
    - firebase-admin singleton with !admin.apps.length guard
    - sendFcmPush never throws — push failures are silent warnings
    - FCM token UPSERT via ON CONFLICT (user_id) DO UPDATE
    - router.use(verifyToken) at router level protects all notification routes

key-files:
  created:
    - backend/src/config/firebase.js
    - backend/src/services/notifications.service.js
    - backend/src/routes/notifications.js
  modified:
    - backend/src/routes/users.js
    - backend/src/services/users.service.js
    - backend/src/app.js

key-decisions:
  - "FIREBASE_PRIVATE_KEY env var uses literal \\n — .replace(/\\\\n/g, '\\n') required to restore actual RSA newlines"
  - "sendFcmPush silently skips when no FCM token exists, never throws — push failures must not break calling flows"
  - "Stale FCM token (messaging/registration-token-not-registered) triggers auto-delete from fcm_tokens table"

patterns-established:
  - "Push send pattern: getFcmToken → null check → send → catch stale token → delete"
  - "FCM token UPSERT: INSERT ... ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token"

requirements-completed: [NOTF-01, NOTF-05]

# Metrics
duration: 2min
completed: 2026-04-11
---

# Phase 5 Plan 02: Push Notifications Backend Summary

**firebase-admin singleton, FCM push service with silent-failure guarantee, token UPSERT endpoint, and notification history/mark-read routes**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-11T03:43:32Z
- **Completed:** 2026-04-11T03:45:36Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- Created firebase-admin singleton in backend/src/config/firebase.js with `!admin.apps.length` guard and private key newline fix
- Implemented notifications.service.js with getFcmToken, saveNotification, and sendFcmPush — sendFcmPush never throws, handles stale tokens gracefully
- Added POST /users/me/fcm-token via UPSERT to users.js (protected by router-level verifyToken)
- Created notifications.js route with GET / (history) and PATCH /read (mark all unread)
- Wired /notifications into app.js after /chats

## Task Commits

Per memory file: user commits manually — no automated commits.

1. **Task 1: Create firebase-admin config singleton and notifications service** - files created, verified
2. **Task 2: Add FCM token route + notification routes, wire into app** - files modified, verified

## Files Created/Modified
- `backend/src/config/firebase.js` - firebase-admin singleton with env var credentials and private key newline fix
- `backend/src/services/notifications.service.js` - getFcmToken, saveNotification, sendFcmPush with silent-failure pattern
- `backend/src/routes/notifications.js` - GET /notifications and PATCH /notifications/read, router-level verifyToken
- `backend/src/routes/users.js` - Added POST /me/fcm-token route and usersService import
- `backend/src/services/users.service.js` - Added saveFcmToken with UPSERT, added to module.exports
- `backend/src/app.js` - Mounted /notifications route after /chats

## Decisions Made
- FIREBASE_PRIVATE_KEY stored with literal `\n` sequences in env — `.replace(/\\n/g, '\n')` applied at initialization time to restore RSA key format
- sendFcmPush catches all FCM errors without re-throwing; stale token errors trigger token deletion; all others emit console.warn only
- usersService imported directly in users.js router for saveFcmToken (controller layer not needed for this thin endpoint)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** Firebase service account credentials must be added to environment before push notifications work:

- `FIREBASE_PROJECT_ID` — Firebase Console → Project Settings → General → Project ID
- `FIREBASE_CLIENT_EMAIL` — Service accounts → Generate new private key → client_email
- `FIREBASE_PRIVATE_KEY` — Service accounts → Generate new private key → private_key (paste entire value including BEGIN/END lines)

Add all three to Render Dashboard → vibeapp-backend → Environment.

## Next Phase Readiness
- Backend FCM infrastructure complete — Plan 04 can now wire triggers (match, message, friend request notifications)
- Plan 05 can build the frontend notification panel consuming GET /notifications and PATCH /notifications/read
- sendFcmPush is importable by any service: `const { sendFcmPush, saveNotification } = require('../services/notifications.service')`
- No blockers for Plans 03/04

---
*Phase: 05-push-notifications*
*Completed: 2026-04-11*
