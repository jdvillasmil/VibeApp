# Phase 5: Push Notifications - Research

**Researched:** 2026-04-10
**Domain:** FCM v1 push notifications (firebase-admin), @capacitor/push-notifications, PostgreSQL migrations (DB indexes, notifications table), Angular/Ionic notification panel
**Confidence:** HIGH

---

## Summary

Phase 5 delivers background push notifications to Android physical devices via Firebase Cloud Messaging (FCM) v1 API. The backend uses `firebase-admin` (already mandated — FCM Legacy API was shut down June 2024) to send notifications from Node.js when social events occur (friend request, mutual match, new message while backgrounded). The frontend uses `@capacitor/push-notifications` (v8, already compatible with Capacitor 8 in the project) to register, receive a device token, and deliver that token to the backend on login.

Two mandatory infrastructure fixes ship with this phase: (1) Socket.io disconnect on logout is missing — the `AuthService.logout()` method never calls `SocketService.disconnect()`, violating CHAT-04 and causing orphaned connections; (2) the `friendships` and `messages` tables have no DB indexes, which will cause full table scans as data grows.

The `notifications` table and `fcm_tokens` table are **already created** in `migrate.js` — no new migration schema is needed. The Android `build.gradle` already includes the `google-services` plugin conditional logic. The only missing pieces are: the `google-services.json` file (must be obtained from Firebase Console and placed in `android/app/`), the `firebase-admin` npm package on the backend, and the `@capacitor/push-notifications` npm package on the frontend.

**Primary recommendation:** Use `firebase-admin` initialized from three individual environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) — never commit the service account JSON file. Register the Firebase Android app against `io.ionic.starter` (the actual `applicationId` in `build.gradle`), NOT `com.vibe.app` (which is only in `capacitor.config.ts` and has not been synced to Gradle).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTF-01 | App saves device FCM token to backend on login (`POST /users/me/fcm-token`) | `fcm_tokens` table already exists; backend route + frontend token-post-on-login covered |
| NOTF-02 | Push notification sent via FCM v1 API (`firebase-admin`) on new friend request | `likeUser()` in discovery.service.js is the trigger point; add notification dispatch there |
| NOTF-03 | Push notification sent when friend request accepted (mutual match) | Same `likeUser()` when `matched: true` — second user's FCM token looked up and notified |
| NOTF-04 | Push notification sent on new message while app is backgrounded | Backend `send_message` socket handler in socket/index.js is the trigger; FCM send fires there |
| NOTF-05 | Notifications persisted in `notifications` DB table | Table already created; `notifications.service.js` will insert rows on each event |
| NOTF-06 | In-app notification panel shows history list with unread count badge on bell icon | New NotificationsPage + bell icon in TabsPage header; unread count via `GET /users/me/notifications` |
| NOTF-07 | Notifications marked as read when panel is opened | `PATCH /users/me/notifications/read` sets `read_at = NOW()` for all unread rows |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firebase-admin` | ^13.x (latest) | Send FCM v1 push from Node.js backend | Only official Google-supported server SDK after Legacy API shutdown June 2024 |
| `@capacitor/push-notifications` | ^8.x | Register device, get FCM token, handle notification events on Android | Official Capacitor plugin; v8 is the correct major for this project's Capacitor 8 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ionic/angular` IonBadge | already installed | Show unread count on bell icon | Pair with Angular `signal` for unread count reactive updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `firebase-admin` | Raw FCM v1 HTTP calls with `node-fetch` + OAuth2 | More code, same result; firebase-admin handles OAuth2 token refresh automatically |
| `@capacitor/push-notifications` | `@capacitor-community/fcm` | Community plugin adds FCM-specific methods; not needed here since Android returns FCM token natively from the official plugin |

**Installation:**
```bash
# Backend
cd backend && npm install firebase-admin

# Frontend
cd frontend && npm install @capacitor/push-notifications && npx cap sync android
```

---

## Architecture Patterns

### Recommended Project Structure

New files to add:

```
backend/src/
├── services/
│   └── notifications.service.js    # saveNotification(), sendFcmPush(), getFcmToken()
├── routes/
│   └── notifications.js            # GET /users/me/notifications, PATCH /users/me/notifications/read
│                                   # POST /users/me/fcm-token (add to users.js route)
└── config/
    └── firebase.js                 # firebase-admin init (singleton)

frontend/src/app/
├── core/services/
│   └── push-notifications.service.ts  # register(), postTokenToBackend(), addListeners()
└── pages/
    └── notifications/
        ├── notifications.page.ts
        └── notifications.page.html
```

### Pattern 1: Firebase Admin Initialization (Singleton)

**What:** Initialize firebase-admin once at app startup using environment variables. Never initialize twice.
**When to use:** Always — multiple `initializeApp()` calls throw an error.

```javascript
// backend/src/config/firebase.js
// Source: https://firebase.google.com/docs/admin/setup
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // CRITICAL: env vars store \n as two chars — restore actual newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = admin;
```

### Pattern 2: Sending a Push Notification

**What:** Look up the recipient's FCM token from `fcm_tokens`, then call `admin.messaging().send()`.
**When to use:** After any social event (like, match, message).

```javascript
// backend/src/services/notifications.service.js
// Source: https://firebase.google.com/docs/cloud-messaging/send/admin-sdk
const admin = require('../config/firebase');
const pool = require('../config/db');

async function getFcmToken(userId) {
  const result = await pool.query(
    'SELECT token FROM fcm_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.token || null;
}

async function saveNotification(userId, type, payload) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)',
    [userId, type, JSON.stringify(payload)]
  );
}

async function sendFcmPush(userId, { title, body, data }) {
  const token = await getFcmToken(userId);
  if (!token) return; // user has no registered device — skip silently

  const message = {
    notification: { title, body },
    data: data || {},
    token,
    android: { priority: 'high' },
  };

  try {
    await admin.messaging().send(message);
  } catch (err) {
    // Token expired or invalid — clean up stale token
    if (err.code === 'messaging/registration-token-not-registered') {
      await pool.query('DELETE FROM fcm_tokens WHERE user_id = $1', [userId]);
    }
    // Non-critical — log but don't throw (don't break the calling flow)
    console.warn('[fcm] send failed:', err.code);
  }
}

module.exports = { getFcmToken, saveNotification, sendFcmPush };
```

### Pattern 3: FCM Token Registration on Frontend (Angular Service)

**What:** On login, request push notification permission, register, capture token, POST to backend.
**When to use:** After successful login — token is tied to authenticated user.

```typescript
// frontend/src/app/core/services/push-notifications.service.ts
// Source: https://capacitorjs.com/docs/apis/push-notifications
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private http = inject(HttpClient);

  async initialize(): Promise<void> {
    // Only runs on native Android/iOS — no-op in browser
    if (!Capacitor.isNativePlatform()) return;

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    // Token received — POST to backend
    await PushNotifications.addListener('registration', async (token) => {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/users/me/fcm-token`, {
            token: token.value,
          })
        );
      } catch {
        console.warn('[push] failed to register token');
      }
    });

    // Handle foreground notifications (show via Ionic toast or alert)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // App is in foreground — FCM does NOT show a system notification automatically
      // Show in-app banner here if desired
      console.log('[push] foreground notification:', notification);
    });

    // Handle tap on a background/killed-app notification
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[push] notification tapped:', action);
      // Navigate to relevant screen based on action.notification.data.type
    });
  }

  async cleanup(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await PushNotifications.removeAllListeners();
  }
}
```

### Pattern 4: Trigger Push from Existing Service Layer

**What:** Call `sendFcmPush` + `saveNotification` inside existing discovery.service.js (like/match) and socket/index.js (message).
**Example integration point in socket/index.js:**

```javascript
// Inside send_message handler — after saveMessage:
const notifService = require('../services/notifications.service');

// Only push if recipient is NOT currently connected in the chat room
const recipientId = /* look up from chat participants */;
await notifService.saveNotification(recipientId, 'new_message', {
  chatId, senderName: socket.user.name
});
await notifService.sendFcmPush(recipientId, {
  title: socket.user.name || 'New message',
  body: String(body).trim().slice(0, 80),
  data: { type: 'new_message', chatId: String(chatId) },
});
```

### Pattern 5: `POST /users/me/fcm-token` (UPSERT)

```javascript
// In users.service.js
async function saveFcmToken(userId, token) {
  await pool.query(
    `INSERT INTO fcm_tokens (user_id, token)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token`,
    [userId, token]
  );
}
```

### Anti-Patterns to Avoid

- **Committing `google-services.json` to git:** Contains Firebase project credentials. Add to `.gitignore`. Place the file manually before each Android build.
- **Committing the service account JSON:** Store as three environment variables instead — see Pattern 1.
- **Calling `admin.initializeApp()` multiple times:** Throws "Firebase App named '[DEFAULT]' already exists." Use the guard `!admin.apps.length`.
- **Throwing when `sendFcmPush` fails:** FCM sends are non-critical — a push failure must never break the REST or socket response.
- **Registering push notifications before user is authenticated:** Token is meaningless without a user to associate it with. Always call `initialize()` after `setToken()` on login.
- **Calling `initialize()` on browser (Ionic serve):** `Capacitor.isNativePlatform()` guard prevents errors.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FCM HTTP v1 OAuth2 token management | Custom token refresh logic | `firebase-admin` | Handles access token expiry, retries, and credential rotation automatically |
| Android FCM background message handling | Custom `FirebaseMessagingService` Java class | `@capacitor/push-notifications` | Plugin includes FCM service; system shows notification automatically when app is backgrounded |
| Token invalidation detection | Parse error messages manually | Check `err.code === 'messaging/registration-token-not-registered'` | firebase-admin error codes are documented and stable |

---

## Infrastructure Fixes (Required This Phase)

### Fix 1: Socket.io Disconnect on Logout (CHAT-04 violation)

**What goes wrong:** `AuthService.logout()` clears the token and navigates to login, but never calls `SocketService.disconnect()`. The socket connection stays alive.

**Where:** `frontend/src/app/core/services/auth.service.ts`

**Fix:**
```typescript
// auth.service.ts — inject SocketService, call disconnect before navigate
async logout(): Promise<void> {
  await Preferences.remove({ key: TOKEN_KEY });
  this.isAuthenticated.set(false);
  this.socketService.disconnect();  // ADD THIS
  this.router.navigate(['/login']);
}
```

Note: `SocketService` must be injected into `AuthService` (or logout must be coordinated via a shared state signal). Use lazy injection pattern to avoid circular dependency (`inject(SocketService)` at call time, or inject in constructor).

### Fix 2: Missing DB Indexes on friendships and messages

**What goes wrong:** Without indexes, queries that filter by `user_id`, `chat_id`, `requester_id`, or `addressee_id` do full table scans. This is fine at 10 rows; catastrophic at 10,000.

**Where:** `backend/src/config/migrate.js` — add to the migration script with `IF NOT EXISTS`.

```sql
-- Source: https://www.postgresql.org/docs/current/sql-createindex.html
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
```

These run idempotently (`IF NOT EXISTS`) so re-running migrate.js is safe.

---

## Common Pitfalls

### Pitfall 1: Wrong `applicationId` for Firebase Project Registration

**What goes wrong:** `capacitor.config.ts` says `appId: 'com.vibe.app'` but `android/app/build.gradle` says `applicationId "io.ionic.starter"`. The Firebase Console Android app must be registered with `io.ionic.starter` — the value that ends up in the APK. If registered with `com.vibe.app`, `google-services.json` will not match and push notifications will silently fail.

**How to avoid:** When creating the Android app in Firebase Console, use `io.ionic.starter`. Reconcile `capacitor.config.ts` appId to match `io.ionic.starter` (or update build.gradle — either is fine, just must match).

**Warning signs:** FCM token registration succeeds but notifications are never received; no error in logs.

### Pitfall 2: Private Key Newlines Escaped

**What goes wrong:** The `FIREBASE_PRIVATE_KEY` environment variable stores `\n` as a literal two-character sequence `\n`. firebase-admin fails to parse the RSA key with a cryptic error.

**How to avoid:** Always apply `.replace(/\\n/g, '\n')` when reading `process.env.FIREBASE_PRIVATE_KEY` (see Pattern 1 code).

**Warning signs:** `Error: error:09091064:PEM routines:PEM_read_bio:no start line` on startup.

### Pitfall 3: FCM Push Not Delivered on Android Emulator

**What goes wrong:** Android emulators without Google Play Services cannot receive FCM messages. Push will silently fail.

**How to avoid:** Only test push notifications on a physical Android device. This is explicitly noted in STATE.md blockers.

### Pitfall 4: Foreground Notifications Are Silent by Default

**What goes wrong:** When the app is in the foreground (open and active), Android's FCM SDK does NOT show a system notification. `pushNotificationReceived` fires but no visible banner appears.

**How to avoid:** Use `pushNotificationReceived` listener to show an Ionic alert or toast for foreground notifications. The requirements only specify background delivery (NOTF-04: "while app is in background"), so foreground handling can be minimal.

### Pitfall 5: `firebase-admin` Double-Initialization

**What goes wrong:** If `require('../config/firebase')` is called multiple times (e.g., from multiple services) without the `!admin.apps.length` guard, Node.js throws: "Firebase App named '[DEFAULT]' already exists."

**How to avoid:** Always use the singleton pattern shown in Pattern 1.

### Pitfall 6: `saveNotification` / `sendFcmPush` Blocking the Calling Response

**What goes wrong:** If FCM send is awaited synchronously in the REST handler, a slow FCM API call delays the user's response.

**How to avoid:** Fire-and-forget for push inside service functions that are triggered from the socket handler (already async). For REST handlers (like/match), chain the push call as a non-blocking side effect after the primary response is sent, or accept the minor latency since it's a background operation.

---

## Code Examples

### Save FCM Token Route

```javascript
// backend/src/routes/users.js — add:
router.post('/me/fcm-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ data: null, error: 'MISSING_TOKEN', message: 'token required' });
    await usersService.saveFcmToken(req.user.id, token);
    return res.json({ data: null, error: null, message: 'FCM token saved' });
  } catch (err) {
    console.warn('[fcm-token] save failed:', err);
    return res.status(500).json({ data: null, error: 'INTERNAL_ERROR', message: 'Failed to save token' });
  }
});
```

### Notification List Route

```javascript
// backend/src/routes/notifications.js (new file)
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const pool = require('../config/db');

router.use(verifyToken);

// GET /notifications — return all notifications for current user
router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT id, type, payload, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  return res.json({ data: result.rows, error: null, message: 'OK' });
});

// PATCH /notifications/read — mark all unread as read
router.patch('/read', async (req, res) => {
  await pool.query(
    `UPDATE notifications SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL`,
    [req.user.id]
  );
  return res.json({ data: null, error: null, message: 'Marked as read' });
});

module.exports = router;
```

### Notification Panel Component (Angular)

```typescript
// frontend/src/app/pages/notifications/notifications.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-notifications',
  standalone: true,
  // ... imports
})
export class NotificationsPage implements OnInit {
  private http = inject(HttpClient);
  notifications = signal<any[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadAndMarkRead();
  }

  private async loadAndMarkRead(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ data: any[] }>(`${environment.apiUrl}/notifications`)
    );
    this.notifications.set(res.data);
    // Mark all as read after loading
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/notifications/read`, {})
    );
  }
}
```

### Unread Count for Bell Badge (in TabsPage or shared service)

```typescript
// In a NotificationsService or directly in TabsPage
unreadCount = signal<number>(0);

async refreshUnreadCount(): Promise<void> {
  const res = await firstValueFrom(
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/notifications`)
  );
  const count = res.data.filter((n) => !n.read_at).length;
  this.unreadCount.set(count);
}
```

---

## Android Configuration Steps

These are one-time manual setup steps, not code tasks:

1. **Firebase Console:** Create project (or use existing) → Add Android app → Package name: `io.ionic.starter` → Download `google-services.json`
2. **Place file:** `frontend/android/app/google-services.json` (already gitignored by default; add explicit gitignore entry)
3. **Render env vars:** Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` from the service account JSON (Project Settings → Service accounts → Generate new private key)
4. **npx cap sync:** After installing `@capacitor/push-notifications`, run `npx cap sync android` — this registers the plugin's FCM service in `AndroidManifest.xml` automatically
5. **AndroidManifest.xml:** Add POST_NOTIFICATIONS permission for Android 13+:
   ```xml
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
   ```
   This is required for Android 13+ (API 33+); `requestPermissions()` in the Capacitor plugin will prompt for it.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FCM Legacy HTTP API (server key) | FCM v1 API via `firebase-admin` | June 2024 (Legacy shut down) | Must use `firebase-admin` — the `FCM_SERVER_KEY` env var in APK-04 is outdated; use service account credentials instead |
| `cordova-plugin-firebase` | `@capacitor/push-notifications` | Capacitor 3+ era | Official Capacitor plugin; no Cordova bridge needed |
| Storing service account JSON as a file in repo | Individual env vars for `projectId`, `clientEmail`, `privateKey` | Security best practice | Never commit credentials to git |

**Note on `FCM_SERVER_KEY` in APK-04:** The REQUIREMENTS.md mentions `FCM_SERVER_KEY` as a Railway env var. This was the Legacy API key. With FCM v1 (`firebase-admin`), you use a service account JSON (or its three constituent env vars) instead. The planning for Phase 6 should update APK-04 to reflect `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Karma + Jasmine (Angular) |
| Config file | `frontend/karma.conf.js` |
| Quick run command | `cd frontend && ng test --watch=false --browsers=ChromeHeadless` |
| Full suite command | `cd frontend && ng test --watch=false --browsers=ChromeHeadless` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| NOTF-01 | FCM token POST to backend | manual-only | — | Requires physical device for FCM token; no unit test possible |
| NOTF-02 | Push sent on friend request | manual-only | — | End-to-end: requires two physical devices + live FCM |
| NOTF-03 | Push sent on mutual match | manual-only | — | Same as NOTF-02 |
| NOTF-04 | Push sent on background message | manual-only | — | Requires app backgrounded on physical device |
| NOTF-05 | Notifications persisted to DB | manual-only | — | Verify via `SELECT * FROM notifications` after triggering events |
| NOTF-06 | Notification panel shows history + badge | manual-only | — | UI verification on device |
| NOTF-07 | Mark read on panel open | manual-only | — | Verify `read_at` set in DB after opening panel |

**All NOTF requirements are manual-only:** Push notification delivery is an end-to-end integration across Firebase, Android OS, and the physical device. Unit tests for the Angular service can verify that `PushNotifications.requestPermissions` is called and that `initialize()` no-ops on non-native platform.

### Wave 0 Gaps

- None for test infrastructure — Karma/Jasmine already configured. Push notification requirements are inherently manual-only integration tests.

---

## Open Questions

1. **`applicationId` mismatch**
   - What we know: `capacitor.config.ts` has `appId: 'com.vibe.app'`; `build.gradle` has `applicationId "io.ionic.starter"`. Firebase project must be registered with the Gradle value.
   - What's unclear: Was this ever synced? Running `npx cap sync` normally writes the appId from `capacitor.config.ts` to `build.gradle`. If it was never synced after changing the config, they may have diverged.
   - Recommendation: Verify `build.gradle` applicationId before registering the Firebase project. If the intent is to use `com.vibe.app`, update `build.gradle` first, then register Firebase with `com.vibe.app`. The planner should make this a Wave 0 verification step.

2. **`google-services.json` availability**
   - What we know: File does not exist in the repo (correctly — it should not be committed). STATE.md notes this as a blocker for Phase 5.
   - What's unclear: Whether the Firebase project has been created yet.
   - Recommendation: Plan a Wave 0 step to document manual Firebase project creation and file placement before any push code can be tested.

---

## Sources

### Primary (HIGH confidence)
- [Capacitor Push Notifications v8 API](https://capacitorjs.com/docs/apis/push-notifications) — registration, permission, listeners, Android setup
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup) — initialization patterns, credential options
- [Firebase Admin SDK Send Message](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk) — `send()`, message structure, platform overrides
- [Ben Ilegbodu: Firebase Admin env vars](https://www.benmvp.com/blog/initializing-firebase-admin-node-sdk-env-vars/) — private key newline handling pattern (verified matches official credential.cert() API)

### Secondary (MEDIUM confidence)
- [Capacitor Push Notifications Firebase Guide](https://capacitorjs.com/docs/guides/push-notifications-firebase) — Android setup steps, google-services.json placement
- [DEV.to: Firebase Push Notifications in Capacitor Angular](https://dev.to/vaclav_svara_50ba53bc0010/firebase-push-notifications-in-capacitor-angular-apps-the-complete-implementation-guide-1c67) — Angular service architecture, RxJS patterns, lifecycle management

### Tertiary (LOW confidence)
- WebSearch results for FCM Node.js 2025/2026 patterns — confirmed firebase-admin is the standard; specific examples not individually verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official Capacitor v8 docs and Firebase Admin docs confirm library choices and API
- Architecture: HIGH — patterns derived from official docs and verified against existing codebase patterns (standalone, signals, firstValueFrom, inject())
- Pitfalls: HIGH — private key escaping and applicationId mismatch verified from official sources and codebase inspection
- DB indexes: HIGH — standard PostgreSQL `CREATE INDEX IF NOT EXISTS` syntax, idempotent

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (firebase-admin API is stable; Capacitor 8 is current major)
