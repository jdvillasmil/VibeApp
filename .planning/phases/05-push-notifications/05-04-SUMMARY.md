---
phase: 05-push-notifications
plan: 04
subsystem: api
tags: [fcm, push-notifications, socket.io, discovery, postgres, nodejs]

# Dependency graph
requires:
  - phase: 05-push-notifications plan 02
    provides: notifications.service.js with sendFcmPush, saveNotification, getFcmToken

provides:
  - FCM push + notification row on one-sided like (NOTF-02)
  - FCM push + notification row on mutual match for both users (NOTF-03)
  - FCM push + notification row on new socket message when recipient is offline (NOTF-04, NOTF-05)

affects: [discovery, chat, socket, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget notification pattern: .catch(() => {}) on all push calls"
    - "Recipient presence detection via io.sockets.adapter.rooms comparing user_ and chat_ rooms"
    - "Non-blocking notification wrapping in inner try/catch to prevent push failure affecting main flow"

key-files:
  created: []
  modified:
    - backend/src/services/discovery.service.js
    - backend/src/socket/index.js

key-decisions:
  - "All notification calls use .catch(() => {}) — push/save failures are silent and never propagate to callers"
  - "Recipient presence check uses personal user_ room cross-referenced with chat_ room members to detect offline recipients"
  - "Image push uses body: 'Imagen' since no text preview is available for image messages"
  - "chatId variable extracted before match notification block to avoid re-reading chat.rows[0].id"

patterns-established:
  - "Fire-and-forget push: call .catch(() => {}) on both saveNotification and sendFcmPush — never await in hot path"
  - "Push block isolation: wrap notification logic in its own inner try/catch inside the handler's outer try/catch"

requirements-completed: [NOTF-02, NOTF-03, NOTF-04, NOTF-05]

# Metrics
duration: 15min
completed: 2026-04-10
---

# Phase 05 Plan 04: FCM Event Wiring Summary

**FCM push notifications wired into like/match events (discovery.service.js) and new message events (socket/index.js) with fire-and-forget safety guards throughout**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-10T00:00:00Z
- **Completed:** 2026-04-10T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- One-sided like now fires FCM push + saves notification row for addressee (NOTF-02)
- Mutual match now fires FCM push + saves notification row for both matched users (NOTF-03)
- New socket messages fire FCM push + save notification row to recipient when they are not in the chat room (NOTF-04, NOTF-05)
- All push calls are non-blocking — no push failure can break like/match/message delivery

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire FCM triggers into discovery.service.js (like + match)** - feat commit
2. **Task 2: Wire FCM trigger into socket/index.js (new message)** - feat commit

## Files Created/Modified

- `backend/src/services/discovery.service.js` - Added notifService require; added NOTF-02 (one-sided like) and NOTF-03 (mutual match) notification dispatch blocks with .catch guards
- `backend/src/socket/index.js` - Added notifService + pool requires; added recipient presence check and FCM push blocks in both send_message and send_image handlers

## Decisions Made

- All notification calls use `.catch(() => {})` — push/save failures are silent and never propagate
- Recipient presence detection: cross-reference `user_${recipientId}` personal room socket IDs against `chat_${chatId}` room members
- Image push body is hardcoded `'Imagen'` since no text preview exists for image messages
- `chatId` extracted from `chat.rows[0].id` before the match notification block to keep code clear

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four notification event types (NOTF-02 through NOTF-05) are now wired
- Push notifications will fire in production once Firebase service account is configured and FCM tokens are registered from the frontend (Plan 03)
- No remaining backend notification work — Phase 5 push notification infrastructure is complete

---
*Phase: 05-push-notifications*
*Completed: 2026-04-10*
