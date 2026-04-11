---
phase: 05-push-notifications
plan: 01
subsystem: infra
tags: [angular, socket.io, postgresql, indexes, migrations]

# Dependency graph
requires:
  - phase: 04-chat
    provides: SocketService with disconnect() method, chat/message/notification/fcm_tokens DB tables
provides:
  - AuthService.logout() disconnects socket before navigating (no orphaned connections)
  - Six idempotent DB indexes on friendships, messages, notifications, and fcm_tokens tables
affects: [05-push-notifications, all future phases using socket or DB queries]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inject SocketService into AuthService as a constructor field using inject() — no lazy injection needed (safe singleton DI)"
    - "CREATE INDEX IF NOT EXISTS pattern for idempotent DB index creation in migrate.js"

key-files:
  created: []
  modified:
    - frontend/src/app/core/services/auth.service.ts
    - backend/src/config/migrate.js

key-decisions:
  - "SocketService injected as constructor field in AuthService — Angular resolves both as singletons, no circular DI error at runtime because SocketService only reads AuthService.getToken() (no write/logout dependency)"
  - "Six indexes added using IF NOT EXISTS so re-running migrate.js against production is always safe"

patterns-established:
  - "Logout cleanup order: remove token -> clear auth signal -> disconnect socket -> navigate"
  - "All new FK-heavy tables get indexes in the same migrate.js run they are created"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-04-10
---

# Phase 5 Plan 01: Pre-Phase Infrastructure Fixes Summary

**Socket disconnect on logout via SocketService injection into AuthService, plus six idempotent PostgreSQL indexes on FK columns across friendships, messages, notifications, and fcm_tokens tables**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-11T03:40:00Z
- **Completed:** 2026-04-11T03:48:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- AuthService.logout() now calls socketService.disconnect() before navigating to /login, eliminating orphaned Socket.io connections on the server after every logout
- Six CREATE INDEX IF NOT EXISTS statements added to migrate.js covering all high-traffic FK columns (requester_id, addressee_id on friendships; chat_id, sender_id on messages; user_id on notifications; user_id on fcm_tokens)
- Angular build passes with zero TypeScript errors; migration runs cleanly against live Render DB

## Task Commits

Per project memory instructions, commits are handled manually by the user.

1. **Task 1: Fix socket disconnect on logout in AuthService** - (fix: inject SocketService, call disconnect() in logout())
2. **Task 2: Add DB indexes to migrate.js** - (chore: six idempotent CREATE INDEX IF NOT EXISTS statements)

## Files Created/Modified

- `frontend/src/app/core/services/auth.service.ts` - Added SocketService import, inject field, and disconnect() call in logout() before router.navigate
- `backend/src/config/migrate.js` - Added six CREATE INDEX IF NOT EXISTS statements after last CREATE TABLE block and before console.log

## Decisions Made

- SocketService injected as a class field (not lazily) — plan confirmed this is safe because SocketService only reads AuthService.getToken() and does not call logout(), breaking the potential circular dependency concern
- Index statements placed immediately before the "Migration complete" log line to keep all table setup together

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — Angular DI resolved the mutual service injection (AuthService <-> SocketService) correctly, no circular dependency error. Build succeeded on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Orphaned socket connections on logout are now eliminated — Phase 5 feature work (FCM push, notification delivery) starts on a clean foundation
- DB indexes protect query performance as user/notification/message data grows — no follow-up needed
- Blocker: FCM v1 service account JSON must still be obtained from Firebase Console before Phase 5 FCM work begins (pre-existing concern, not introduced by this plan)

---
*Phase: 05-push-notifications*
*Completed: 2026-04-10*
