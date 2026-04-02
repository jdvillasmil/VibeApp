# Domain Pitfalls

**Domain:** Ionic 8 + Angular 18 + Capacitor + Node.js + Socket.io + PostgreSQL on Railway — Android APK
**Researched:** 2026-04-01
**Confidence note:** External search tools were unavailable during this session. All findings are drawn from training knowledge of this specific stack. Confidence is HIGH for widely-documented behaviors (Capacitor HTTP blocking, Socket.io zone issues, Railway PORT), MEDIUM for patterns with some version variability, and flagged LOW where behavior may have shifted in recent releases.

---

## Critical Pitfalls

Mistakes that cause rewrites, broken APK builds, or non-functional real-time features.

---

### Pitfall 1: APK Blocks All HTTP Traffic (Cleartext Not Allowed)

**What goes wrong:** Android 9+ (API 28+) blocks all cleartext (HTTP) traffic by default. The APK silently fails every API call and Socket.io connection when the backend URL is `http://`. No error is surfaced to the user — requests just never resolve.

**Why it happens:** During development on `localhost:3000` everything works because `localhost` is exempt from cleartext restrictions. When the APK is built pointing at a Railway URL, teams forget that the Railway URL is `https://` but may accidentally use `http://` in `environment.prod.ts`, or configure CORS on Node.js to respond only to `http://` origins.

**Consequences:** Every single API call and Socket.io handshake fails silently. The app appears to load but shows no data and never connects.

**Prevention:**
- `environment.prod.ts` must use `https://your-app.up.railway.app` — never `http://`.
- Socket.io client must connect with `wss://` (which is automatic when you pass an `https://` base URL — Socket.io infers the protocol).
- Do NOT add `android:usesCleartextTraffic="true"` to AndroidManifest as a workaround — fix the URL instead. That flag is a dev shortcut that will also break in some Android security policy environments.
- For local dev only, `environment.ts` can remain `http://localhost:3000`.

**Detection:** Open `adb logcat` filtered for `CLEARTEXT` — Android will log the blocked connection explicitly.

**Phase relevance:** Phase 1 (Auth setup), Phase 3 (APK build). Set the correct URL from day one so it never silently breaks.

**Confidence:** HIGH — documented Android behavior since API 28.

---

### Pitfall 2: CORS Rejecting the Capacitor App Origin

**What goes wrong:** The Node.js CORS config expects `http://localhost:8100` (Ionic dev server) or a specific domain. The APK does not originate from `localhost` — Capacitor's WebView sends requests with origin `capacitor://localhost` or `null`. If `cors()` is configured with a strict `origin` whitelist that doesn't include these, every preflight request fails with 403.

**Why it happens:** Developers copy-paste CORS configs designed for browser dev. They work in the browser, pass Postman, but fail on device.

**Consequences:** All API calls fail with CORS error. The APK is non-functional. The confusion is amplified because Postman (no origin header) passes fine.

**Prevention:**
```javascript
// In Express CORS config — allow all Capacitor origins
const allowedOrigins = [
  'http://localhost:8100',       // ionic serve
  'capacitor://localhost',       // Capacitor Android (most devices)
  'ionic://localhost',           // older Capacitor iOS
  null,                          // some WebViews send null origin
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
```
- In production on Railway, add your Railway public URL to `allowedOrigins` as well.

**Detection:** Check the `Origin` request header in `adb logcat` or a proxy like Charles. If you see `null` or `capacitor://localhost`, you know the CORS list is incomplete.

**Phase relevance:** Phase 1 (backend setup). Must be correct before any feature works from APK.

**Confidence:** HIGH — well-documented Capacitor behavior.

---

### Pitfall 3: Socket.io JWT Token Expiry Breaks Active Sessions

**What goes wrong:** A user logs in, gets a JWT (e.g., 1-hour expiry), leaves the app in background for 90 minutes, returns, and finds the chat dead. The Socket.io connection was either dropped by Railway's 30-second idle timeout or the token used in `handshake.auth.token` is now expired. The server rejects reconnection attempts. The client reconnects successfully at the TCP level but is then kicked in the `connection` handler with a 401, leaving the user with a connected socket that emits events that are silently rejected.

**Why it happens:** Socket.io automatic reconnection re-executes the handshake but reuses the token from when the socket was first instantiated. If the token has since expired, the reconnect will always fail until the token is refreshed.

**Consequences:** Chat appears open (socket status shows "connected") but messages are never delivered. Read receipts stop updating. Typing indicators freeze.

**Prevention:**
- Set JWT expiry to at least 24 hours for an academic project (reduces friction without security risk in this context).
- In the Angular socket service, intercept `connect_error` with reason `token_expired` and re-fetch a fresh token via the refresh endpoint before reconnecting:
```typescript
this.socket.on('connect_error', (err) => {
  if (err.message === 'token_expired') {
    this.authService.refreshToken().then(token => {
      this.socket.auth = { token };
      this.socket.connect();
    });
  }
});
```
- On the server, emit a specific error message (`socket.emit('error', { type: 'token_expired' })`) before disconnecting so the client knows why.

**Detection:** Server logs will show repeated connection/disconnection cycles for a user with no messages sent.

**Phase relevance:** Phase 2 (Socket.io setup), Phase 4 (chat).

**Confidence:** HIGH — standard JWT + Socket.io auth pattern.

---

### Pitfall 4: Socket.io Events Not Triggering Angular Change Detection

**What goes wrong:** Messages arrive, are pushed to a local array, but the UI does not update. Or typing indicators appear 5-10 seconds late. The data is there but the template does not re-render.

**Why it happens:** Socket.io callbacks execute outside Angular's NgZone. Angular's change detection (whether zone-based or signal-based) does not know the event fired. The component only re-renders on the next unrelated user interaction that happens to trigger detection.

**Consequences:** Chat messages appear with a lag or only after the user taps something. Typing indicators are delayed. Read receipts flicker. The app feels broken even though the data is correct.

**Prevention:**

Option A — Use NgZone (reliable for zone-based components):
```typescript
constructor(private ngZone: NgZone) {}

this.socket.on('new_message', (msg) => {
  this.ngZone.run(() => {
    this.messages.push(msg); // now triggers change detection
  });
});
```

Option B — Use Angular signals (PROJECT.md prefers signals, this is the better approach):
```typescript
messages = signal<Message[]>([]);

this.socket.on('new_message', (msg) => {
  this.ngZone.run(() => {
    this.messages.update(msgs => [...msgs, msg]);
  });
});
```
Even with signals, `ngZone.run()` is still required for the signal write to synchronously trigger the render cycle.

Option C — Configure the socket wrapper with `zone.js` patching disabled and use `ChangeDetectorRef.markForCheck()` manually. This is more complex and not recommended for two developers under deadline.

**Detection:** Add `console.log` inside the socket handler. If it fires but the UI doesn't update, it's a zone issue.

**Phase relevance:** Phase 4 (chat), Phase 3 (real-time vibe updates).

**Confidence:** HIGH — well-documented Angular + Socket.io integration issue.

---

### Pitfall 5: Railway Disk Storage Lost on Every Deploy

**What goes wrong:** Multer uploads images to `/uploads` on the Railway filesystem. This works perfectly until the next `git push` triggers a redeploy. Railway's filesystem is ephemeral — it is rebuilt from the Docker image on every deploy. All uploaded avatars and chat images are permanently deleted.

**Why it happens:** Railway (and most containerized PaaS) treat the filesystem as temporary. Teams test uploads, see them work, then deploy a hotfix, and every image goes missing.

**Consequences:** All user avatars become broken image links. All chat photo attachments disappear. Users experience data loss on every deploy. This is a portfolio-killer in a professor demo.

**Prevention:**
- Railway has a "Volume" feature (persistent disk) that survives redeploys. Mount it at `/uploads` in your Railway service config.
  - In Railway dashboard: Service → Settings → Volumes → Add volume, mount path `/uploads`.
  - Verify the mount by SSH-ing into the container after deploy and checking that prior files still exist.
- If Volumes are not available on the free tier at the time of delivery: add a clear note in the README that uploaded files are ephemeral and re-upload after demo. Do not let this silently fail during the professor demo — warn in advance.
- Long-term fix (out of scope per PROJECT.md) would be Cloudinary or S3, but that violates the Multer-to-disk constraint.

**Detection:** Upload an image, deploy any change, check if the image URL still resolves.

**Phase relevance:** Phase 2 (profile photo upload), Phase 4 (chat image upload).

**Confidence:** HIGH — Railway ephemeral filesystem is documented behavior. Volume support is confirmed in Railway docs as of 2024.

---

### Pitfall 6: Railway Not Binding to `process.env.PORT`

**What goes wrong:** The Node.js server hardcodes `const PORT = 3000`. Railway assigns a dynamic port via the `PORT` environment variable. The server starts on 3000 internally but Railway's load balancer forwards traffic to a different port. The service starts but all requests return 502 Bad Gateway.

**Why it happens:** Local dev uses a fixed port. Teams copy the local setup to Railway without reading the deployment docs.

**Consequences:** The backend is completely unreachable. All API calls and Socket.io connections fail with 502.

**Prevention:**
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```
This one line is the fix. It must be in place before first Railway deploy.

**Detection:** Railway's deploy logs will show the server started on 3000. Railway's own health check pings the assigned port and fails. The service shows as "crashed" or "unhealthy" in the dashboard.

**Phase relevance:** Phase 1 (first backend deploy).

**Confidence:** HIGH — Railway explicitly documents this requirement.

---

### Pitfall 7: `@capacitor/preferences` Is Async — Blocking Token Access Breaks Auth Flow

**What goes wrong:** A developer reads the JWT token for an HTTP request using `await Preferences.get({ key: 'token' })`. When this is called inside an Angular HTTP interceptor or route guard that is not properly async-aware, the token is `undefined` or `null` at the time the request is sent. The request goes out without `Authorization: Bearer ...`, the server returns 401, and the app redirects to login even when the user is authenticated.

**Why it happens:** `localStorage.getItem()` is synchronous — a common habit. `@capacitor/preferences` is always async (it writes to native storage on device). Teams muscle-memory `Preferences.get()` without awaiting it, or await it inside a synchronous function.

**Consequences:** Auth interceptor sends unauthenticated requests. Route guards redirect authenticated users to login on app restart. Intermittent 401 errors that only happen on physical device (not browser dev, because in browser Preferences falls back to localStorage which has different timing).

**Prevention:**
- The Angular HTTP interceptor must be `async` or return an Observable that resolves after the token is fetched:
```typescript
// auth.interceptor.ts — using from() to convert Promise to Observable
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  return from(Preferences.get({ key: 'jwt_token' })).pipe(
    switchMap(({ value: token }) => {
      if (token) {
        req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }
      return next.handle(req);
    })
  );
}
```
- Never cache the token in a plain variable at startup without awaiting. Use a signal or BehaviorSubject populated after the async read completes.
- On app init (in `app.component.ts` `ngOnInit`), read the token once and populate an `authService.currentUser` signal. Everything downstream reads the signal, not Preferences directly.

**Detection:** The bug only manifests on physical device or after cold app restart. Works in browser because `capacitor://` falls through to a synchronous localStorage simulation in web mode.

**Phase relevance:** Phase 1 (auth), first use in every subsequent phase.

**Confidence:** HIGH — well-documented Capacitor Preferences async behavior.

---

### Pitfall 8: Environment File Not Switched for APK Build

**What goes wrong:** `ionic capacitor build android` is run without `--prod` flag, so Angular uses `environment.ts` (localhost) instead of `environment.prod.ts` (Railway URL). The APK is installed on the physical device, all requests go to `localhost:3000` which does not exist on the device, and everything fails with "connection refused."

**Why it happens:** The build command habit from dev is `ionic serve`. The APK build requires `--prod` flag or explicit `--configuration=production` to trigger Angular's file replacement configuration.

**Consequences:** A demo-day APK that cannot connect to anything. This is catastrophic and invisible — the app looks fine, just "no data."

**Prevention:**
- Always build APK with:
```bash
ionic capacitor build android --prod
# or equivalently:
ionic capacitor build android --configuration=production
```
- Add a visible build-time marker in the UI during development: display `environment.production` value somewhere in dev mode so you can confirm which environment loaded.
- Set the correct `fileReplacements` in `angular.json` and verify it includes `environment.prod.ts`.
- Document the exact build command in the project README and never deviate from it.

**Detection:** In the built APK, open Chrome DevTools remote debugging (`chrome://inspect`), check the first API call URL in the Network tab. If it says `localhost`, the environment was not switched.

**Phase relevance:** Phase 5 (APK production build). Must be verified before any physical device demo.

**Confidence:** HIGH — standard Angular + Ionic build pipeline behavior.

---

### Pitfall 9: PostgreSQL Connection Pool Exhaustion on Railway

**What goes wrong:** The Node.js backend creates a new `pg.Client` per request (instead of using a connection pool). Under moderate load (multiple simultaneous users), Railway's PostgreSQL free tier (which has a hard limit on concurrent connections, typically 20-25) hits the ceiling. New connections are refused. Requests hang or fail with `too many clients`.

**Why it happens:** Tutorial code often uses `new Client()` for simplicity. Teams copy this pattern without considering pool lifecycle.

**Consequences:** API calls start failing intermittently under any concurrent usage. Symptoms appear random, making debugging hard.

**Prevention:**
```javascript
// db.js — use Pool, not Client, for all query operations
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Railway PostgreSQL
  max: 10,           // keep well below Railway's connection limit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```
- Import and reuse this single pool instance everywhere — never create a new `Pool` or `Client` inside a route handler.
- Always call `client.release()` if using `pool.connect()` manually, inside a `finally` block.

**Detection:** Railway PostgreSQL metrics dashboard shows connection count climbing toward the limit. Logs show `remaining connection slots are reserved for non-replication superuser connections`.

**Phase relevance:** Phase 1 (DB setup). Must be correct from the first migration, not retrofitted.

**Confidence:** HIGH — standard Node.js pg pool management; Railway connection limits are documented.

---

### Pitfall 10: `DATABASE_URL` SSL Mode Missing — Railway PostgreSQL Rejects Connection

**What goes wrong:** Railway PostgreSQL requires SSL for all connections. The `pg` client defaults to `ssl: false`. Without explicit SSL config, the connection is refused with `SSL SYSCALL error: EOF detected` or `no pg_hba.conf entry for host`.

**Why it happens:** Local PostgreSQL usually runs without SSL. Teams use the same config locally and on Railway.

**Consequences:** The backend cannot connect to the database at all. All DB-dependent endpoints return 500.

**Prevention:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Railway uses self-signed cert; this disables cert verification
});
```
`rejectUnauthorized: false` is acceptable for an academic project. For production hardening, pin the Railway CA cert instead.

**Detection:** Railway service logs on startup will show the SSL error immediately, before any request is served.

**Phase relevance:** Phase 1 (first Railway deploy with DB).

**Confidence:** HIGH — Railway PostgreSQL SSL requirement is explicitly documented.

---

## Moderate Pitfalls

---

### Pitfall 11: Socket.io Rooms Not Cleaned Up After Disconnect

**What goes wrong:** When a user disconnects (app backgrounded, network drop), the server does not remove them from chat rooms. On reconnect, they are joined to the same room again without cleanup. Over time, a user may be in the same room multiple times, causing them to receive duplicate messages (the event fires once per room membership).

**Why it happens:** Teams focus on `socket.join(roomId)` but forget the symmetric `socket.leave(roomId)` on disconnect.

**Prevention:**
```javascript
socket.on('disconnect', () => {
  // Socket.io automatically leaves all rooms on disconnect,
  // but if you track room membership manually in your DB or Redis,
  // clean it up here:
  markUserOffline(socket.userId);
});

// On reconnect, always join rooms fresh rather than assuming previous state:
socket.on('join_chat', ({ chatId }) => {
  socket.join(`chat:${chatId}`);
});
```
Note: Socket.io does automatically leave all rooms on disconnect at the protocol level. The risk is application-level state (e.g., a `user_online` table in PostgreSQL) going stale.

**Phase relevance:** Phase 4 (chat), Phase 3 (presence/vibe status).

**Confidence:** MEDIUM — Socket.io auto-cleans rooms; the risk is app-level state management.

---

### Pitfall 12: `ionic capacitor sync` Forgotten After Angular Build Changes

**What goes wrong:** A developer updates `src/` code, runs `ionic build`, but forgets `npx cap sync`. The Android project still contains the old `www/` bundle. The APK reflects code from days ago. Debugging is extremely confusing because the source code looks correct but behavior is wrong.

**Why it happens:** Web developers are not used to a two-step build pipeline. `ionic build` outputs to `www/`. `cap sync` copies `www/` into the Android project. Both steps are required.

**Prevention:**
- Establish a single build alias from day one:
```bash
# package.json
"scripts": {
  "build:android": "ionic build --prod && npx cap sync android"
}
```
- Never run `ionic capacitor build android` and expect it to auto-sync — verify `npx cap sync` ran.
- Consider adding a git hook or CI check that validates the `www/` folder timestamp matches the last Angular build.

**Phase relevance:** Every phase that touches frontend code.

**Confidence:** HIGH — Capacitor build pipeline is well-documented.

---

### Pitfall 13: FCM Push Notifications Require `google-services.json` in the Android Project

**What goes wrong:** Push notifications work in the browser dev server (Capacitor handles a web fallback) but silently fail in the APK. No errors are surfaced. Notifications never arrive.

**Why it happens:** FCM requires `google-services.json` downloaded from the Firebase Console and placed at `android/app/google-services.json`. Teams set up the Firebase project but forget this file, or forget to add the Firebase dependencies to `android/app/build.gradle`.

**Consequences:** Silent failure — no push notifications on physical device. Professor demo fails for this feature.

**Prevention:**
- Download `google-services.json` immediately after creating the Firebase project.
- Place at `android/app/google-services.json`.
- Add to `.gitignore` only if it contains sensitive data (it typically doesn't — it's safe to commit for Android).
- Verify `build.gradle (project)` has `classpath 'com.google.gms:google-services:...'` and `build.gradle (app)` has `apply plugin: 'com.google.gms.google-services'`.
- Test FCM on physical device early (Phase 5), not as a last-minute feature.

**Phase relevance:** Phase 5 (notifications).

**Confidence:** HIGH — FCM + Capacitor setup requirement is documented.

---

### Pitfall 14: JWT Stored Without Expiry Check on App Resume

**What goes wrong:** The app is killed and relaunched. The auth token is read from `@capacitor/preferences` and the user appears logged in. But the token expired 3 days ago. Every request returns 401. The user sees a logged-in UI with no data and no redirect to login, because the expiry is never checked client-side.

**Why it happens:** Token validation is only done server-side. The client trusts whatever is in storage.

**Prevention:**
- On app init, after reading the token, decode the JWT payload (without verifying the signature — just parse the base64) and check the `exp` field:
```typescript
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}
```
- If expired: clear preferences, reset auth state, navigate to login.

**Phase relevance:** Phase 1 (auth), impacts every phase.

**Confidence:** HIGH — standard JWT client-side validation pattern.

---

### Pitfall 15: Raw SQL Injection via String Interpolation

**What goes wrong:** Without an ORM (per PROJECT.md constraints), a developer writes:
```javascript
// DANGEROUS
const result = await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```
An attacker (or the professor during code review) can inject arbitrary SQL.

**Prevention:** Always use parameterized queries:
```javascript
// SAFE
const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
```
All `pg` library queries must use `$1, $2, ...` placeholders. Never concatenate user input into SQL strings. This is non-negotiable and will be noticed during academic code review.

**Phase relevance:** Phase 1 (auth queries). Must be established as the only pattern from day one.

**Confidence:** HIGH — fundamental SQL injection prevention.

---

## Minor Pitfalls

---

### Pitfall 16: `ion-content` Scroll Masked by Keyboard on Android

**What goes wrong:** The chat input bar is fixed at the bottom of `ion-content`. When the Android soft keyboard opens, it overlays the input instead of pushing content up. The user cannot see what they are typing.

**Prevention:**
- In `capacitor.config.ts`, set `keyboard: { resize: 'body' }` or use `KeyboardResize.Body`.
- On the chat page, use `ion-footer` for the input bar rather than positioning it manually inside `ion-content`.
- Test keyboard behavior on physical device early — emulators behave differently.

**Phase relevance:** Phase 4 (chat UI).

**Confidence:** MEDIUM — Capacitor keyboard resize behavior varies by Android version and Ionic component usage.

---

### Pitfall 17: `HttpClient` Calls Made Before Angular App Fully Initialized

**What goes wrong:** An auth guard or service makes an `HttpClient` request in the constructor before the app's `APP_INITIALIZER` has finished reading the stored token. The request fires as unauthenticated even though a valid token exists.

**Prevention:**
- Use `APP_INITIALIZER` to load the stored token into auth state before any routing begins.
- Guards should depend on the auth state signal, not call `Preferences.get()` directly.

**Phase relevance:** Phase 1 (auth), route guards.

**Confidence:** MEDIUM — Angular initialization order depends on app structure.

---

### Pitfall 18: Swipe Gesture Conflicts with `ion-router-outlet` Swipe-Back

**What goes wrong:** Ionic's default back-navigation swipe gesture (swipe right on the page edge) fires simultaneously with the custom card swipe gesture, causing navigation events when the user means to swipe a discovery card.

**Prevention:**
- Disable Ionic swipe-back navigation on the discovery/swipe page:
```typescript
// In the page component
@Component({ ... })
export class DiscoveryPage {
  constructor(private navCtrl: NavController) {
    this.navCtrl.setDirection('root', false); // disables swipe back for this nav
  }
}
```
Or configure `swipeGesture: false` on the route.

**Phase relevance:** Phase 3 (swipe discovery).

**Confidence:** MEDIUM — Ionic gesture conflict is common but solution varies by Ionic version.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Backend setup (Railway first deploy) | PORT not from `process.env.PORT` → 502 on all requests | Use `process.env.PORT \|\| 3000` from first commit |
| Phase 1: PostgreSQL connection | SSL not configured → connection refused | Add `ssl: { rejectUnauthorized: false }` to Pool config |
| Phase 1: Auth JWT storage | `@capacitor/preferences` async not awaited → 401 on device | Use `from(Preferences.get())` in HTTP interceptor |
| Phase 1: CORS config | `capacitor://localhost` origin blocked → APK gets 403 | Add Capacitor origins to allowedOrigins list |
| Phase 2: Profile photo upload | Multer to disk, redeploy wipes files → broken avatars | Configure Railway Volume for `/uploads` before first upload |
| Phase 2: Socket.io auth | Token expiry not handled on reconnect → silent message loss | Emit `token_expired` error, intercept in Angular socket service |
| Phase 3: Swipe UI | Swipe gestures conflict with Ionic back navigation | Disable `swipeGesture` on discovery route |
| Phase 4: Chat real-time | Socket events outside NgZone → delayed UI updates | Wrap all socket callbacks in `ngZone.run()` |
| Phase 4: Chat images | Multer upload, redeploy wipes chat images | Same Railway Volume fix as Phase 2 |
| Phase 5: APK production build | `--prod` flag omitted → APK points to localhost | Document and enforce `ionic build --prod && npx cap sync` |
| Phase 5: Push notifications | Missing `google-services.json` → silent FCM failure | Download from Firebase Console, place in `android/app/` early |
| Phase 5: Environment switch | `environment.ts` used instead of `environment.prod.ts` | Verify Railway URL appears in Network tab via Chrome remote debugging |
| All phases: SQL queries | String interpolation → SQL injection (academic code review risk) | Parameterized queries (`$1, $2`) exclusively from day one |

---

## Sources

**Note:** External web search and WebFetch tools were unavailable during this research session. All findings are drawn from training knowledge of the documented behaviors of:

- Capacitor 6.x official docs (Android network security, Preferences API, build pipeline)
- Socket.io v4 official docs (auth, reconnection, room management)
- Railway platform docs (PORT binding, DATABASE_URL, ephemeral filesystem, Volumes)
- Node.js `pg` library docs (Pool vs Client, SSL configuration)
- Angular 18 docs (zone.js, APP_INITIALIZER, HTTP interceptors)
- Ionic 8 docs (keyboard resize, swipe gestures, environment configuration)

Confidence ratings are assigned conservatively. The CRITICAL pitfalls (1-10) are HIGH confidence based on well-established, repeatedly-documented behaviors across multiple years of community reports. The MODERATE pitfalls (11-15) are MEDIUM-HIGH. The MINOR pitfalls (16-18) are MEDIUM due to version variability.

For further verification before implementation, consult:
- https://capacitorjs.com/docs/android/troubleshooting
- https://socket.io/docs/v4/client-options/#auth
- https://docs.railway.app/guides/fixing-common-errors
- https://node-postgres.com/features/pooling
