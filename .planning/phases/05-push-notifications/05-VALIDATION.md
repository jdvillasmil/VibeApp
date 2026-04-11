---
phase: 5
slug: push-notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Karma + Jasmine (Angular) |
| **Config file** | `frontend/karma.conf.js` |
| **Quick run command** | `cd frontend && ng test --watch=false --browsers=ChromeHeadless` |
| **Full suite command** | `cd frontend && ng test --watch=false --browsers=ChromeHeadless` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && ng test --watch=false --browsers=ChromeHeadless`
- **After every plan wave:** Run `cd frontend && ng test --watch=false --browsers=ChromeHeadless`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | infrastructure fix | manual | — | ✅ | ⬜ pending |
| 5-01-02 | 01 | 0 | infrastructure fix | manual | — | ✅ | ⬜ pending |
| 5-02-01 | 02 | 1 | NOTF-01 | manual | — | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | NOTF-02,03,04 | manual | — | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | NOTF-05 | manual | — | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | NOTF-06 | manual | — | ❌ W0 | ⬜ pending |
| 5-04-02 | 04 | 3 | NOTF-07 | manual | — | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/services/push-notification.service.spec.ts` — stubs for PushNotificationService (non-native no-op, permission request)
- [ ] Existing Karma/Jasmine infrastructure covers Angular unit tests — no new tooling needed

*Push notification delivery (NOTF-01 through NOTF-07) is inherently manual: requires physical Android device, live Firebase project, and FCM token registration. No unit test can substitute.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FCM token saved to backend on login | NOTF-01 | Requires Capacitor native platform + physical device FCM token | Login on physical Android device, check `SELECT * FROM fcm_tokens WHERE user_id = ?` |
| Push received on friend request | NOTF-02 | End-to-end: requires two physical devices + live FCM project | Send friend request from device A while device B is backgrounded, verify notification appears |
| Push received on mutual match | NOTF-03 | Same as NOTF-02 | Both users swipe right on each other, verify both receive push notification |
| Push received on background message | NOTF-04 | Requires app backgrounded on physical device | Send message while recipient has app in background, verify notification appears |
| Notifications persisted to DB | NOTF-05 | Requires live events to generate records | Trigger friend request + match + message, check `SELECT * FROM notifications` |
| Notification panel shows history + badge | NOTF-06 | UI verification on device | Open notification panel, verify list renders with unread count on bell icon |
| Unread notifications marked as read on panel open | NOTF-07 | DB state verification | Open panel, check `SELECT read_at FROM notifications WHERE user_id = ?` — all should be non-null |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
