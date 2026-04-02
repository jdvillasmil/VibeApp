# Technology Stack

**Project:** VIBE — Mobile Friend-Discovery App
**Researched:** 2026-04-01
**Confidence note:** Network/shell tools were unavailable during this research session. All version recommendations are derived from training data (cutoff: August 2025). Versions flagged [VERIFY] MUST be confirmed against `npm view <package> version` before locking package.json. All architectural patterns are HIGH confidence (stable, well-documented).

---

## Recommended Stack

### Frontend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@ionic/angular` | `^8.0.0` [VERIFY] | UI component library + routing shell | Ionic 8 is the stable major for 2024-2025; native mobile components, dark mode via CSS variables, tab/stack navigation out of box |
| `@angular/core` (et al.) | `^18.0.0` [VERIFY] | Application framework | Angular 18 introduces stable signals API; professor requirement; standalone components reduce NgModule boilerplate |
| `@capacitor/core` | `^6.0.0` [VERIFY] | Native bridge (JS → Android) | Capacitor 6 is compatible with Angular 18 + Ionic 8 as of mid-2024; replaces Cordova as the standard |
| `@capacitor/android` | `^6.0.0` [VERIFY] | Android native project | Bundles the WebView-based APK; must match `@capacitor/core` major exactly |
| `@capacitor/push-notifications` | `^6.0.0` [VERIFY] | FCM push on device | Official Capacitor plugin; requires matching major version |
| `@capacitor/preferences` | `^6.0.0` [VERIFY] | Secure async key-value store | Replaces the deprecated `@capacitor/storage`; uses Android SharedPreferences under the hood; required instead of localStorage in APK context |
| `socket.io-client` | `^4.7.x` [VERIFY] | WebSocket client | Must match server major (`socket.io@4.x`); supports `auth` option in `io()` options for JWT handshake |
| `@angular/router` | bundled with Angular 18 | SPA navigation | Ionic's routing wraps Angular Router; use `IonRouterOutlet` not `<router-outlet>` |

### Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `express` | `^4.19.x` [VERIFY] | HTTP server framework | v4 is battle-tested; v5 was in RC as of Aug 2025 — use v4 for stability on academic timeline |
| `socket.io` | `^4.7.x` [VERIFY] | WebSocket server | Version 4.x is stable; must match client major; supports `io.use()` middleware for JWT auth on handshake |
| `jsonwebtoken` | `^9.0.x` [VERIFY] | JWT sign/verify | v9 dropped callback-style; use `jwt.sign()` sync for tokens, `jwt.verify()` sync in middleware |
| `bcrypt` | `^5.1.x` [VERIFY] | Password hashing | Node.js native bindings; use salt rounds=10 per PROJECT.md; `bcryptjs` is the pure-JS fallback if native build fails on Railway |
| `multer` | `^1.4.x` [VERIFY] | Multipart/form-data (file uploads) | Standard Express middleware; `diskStorage` to `/uploads`; note: Railway ephemeral disk caveat (see Pitfalls) |
| `pg` | `^8.11.x` [VERIFY] | PostgreSQL client (node-postgres) | The standard bare-SQL driver; no ORM per project constraints; supports `DATABASE_URL` connection string directly |
| `dotenv` | `^16.x` [VERIFY] | Environment variable loading | Load `.env` in development; Railway injects vars in production — call `dotenv.config()` before any `process.env` access |
| `cors` | `^2.8.x` [VERIFY] | CORS middleware | Required: Angular dev server (localhost:4200) and APK (capacitor://) both need CORS headers from Express |
| `helmet` | `^7.x` [VERIFY] | HTTP security headers | Minimal overhead, disables fingerprinting; `helmet()` as first middleware |
| `express-rate-limit` | `^7.x` [VERIFY] | Rate limiting | Protect `/auth/*` endpoints; 10 req/min on login/register prevents brute-force |
| `morgan` | `^1.10.x` [VERIFY] | HTTP request logger | Development visibility; use `combined` format in production |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 15 or 16 (Railway default) [VERIFY] | Primary data store | Railway provisions PostgreSQL; version is Railway-controlled — check Railway dashboard |
| Raw SQL migrations | n/a | Schema management | `node src/config/migrate.js` runs `CREATE TABLE IF NOT EXISTS` statements; no ORM per constraint |

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Railway | current | Backend hosting + PostgreSQL | Single-platform deploy; GitHub auto-deploy on push to main; free tier sufficient for academic project |
| Firebase Cloud Messaging (FCM) | v1 API [VERIFY] | Push notification delivery | FCM Legacy HTTP API was deprecated in 2024; FCM v1 uses OAuth2 service account — use `firebase-admin` SDK on backend |
| `firebase-admin` | `^12.x` [VERIFY] | FCM v1 push from Node.js backend | Required to send push via FCM v1; initialize with service account JSON from Firebase console |
| Android Studio | current stable (Hedgehog or later) | Build + sign APK | Required to run `npx cap open android` and generate signed release APK |

---

## Critical Configurations

### 1. Capacitor + Angular 18: capacitor.config.ts

```typescript
// capacitor.config.ts (project root)
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibe.app',           // Must match Android package name
  appName: 'VIBE',
  webDir: 'www',                   // Ionic build output — NOT dist/
  server: {
    // Development only: uncomment to proxy to local backend
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
    androidScheme: 'https',        // CRITICAL: APK uses capacitor:// scheme by default
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

**Why `androidScheme: 'https'`:** Capacitor 6 defaults WebView to use `https://` scheme (`https://localhost`) rather than `http://`. This matters for cookies and mixed-content rules. Do NOT set `cleartext: true` in production.

**Why `webDir: 'www'`:** Ionic/Angular CLI builds to `www/`, not `dist/`. Using the wrong dir causes the APK to open a blank screen.

### 2. environment.prod.ts — Bake Backend URL at Build Time

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://YOUR-RAILWAY-APP.railway.app',   // No trailing slash
  socketUrl: 'https://YOUR-RAILWAY-APP.railway.app',
};
```

**Why baked in:** The APK has no runtime config file access. The production Railway URL must be set at Angular build time. Never use `localhost` in the production environment file.

### 3. CORS Configuration for APK + Dev Server

```javascript
// Backend: src/config/cors.js
const corsOptions = {
  origin: [
    'http://localhost:4200',          // Angular dev server
    'http://localhost:8100',          // Ionic serve
    'capacitor://localhost',          // APK scheme (Capacitor 6 default)
    'https://localhost',              // Capacitor https scheme variant
    'ionic://localhost',              // Legacy Capacitor 4 scheme — include for safety
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

**Why `capacitor://localhost`:** When the APK makes HTTP requests to the Express backend, the `Origin` header is `capacitor://localhost`. Omitting it causes CORS 403 on every API call from the physical device — the most common production bug in Ionic+Railway setups.

### 4. Socket.io JWT Handshake Authentication

**Server (middleware pattern):**

```javascript
// src/socket/auth.middleware.js
const jwt = require('jsonwebtoken');

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: no token'));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;   // attach for use in handlers
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
}

// In server.js:
// io.use(socketAuthMiddleware);
```

**Client (Angular service):**

```typescript
// src/app/core/services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';

export class SocketService {
  private socket: Socket | null = null;

  async connect(): Promise<void> {
    const { value: token } = await Preferences.get({ key: 'jwt_token' });
    this.socket = io(environment.socketUrl, {
      auth: { token },              // Sent in handshake.auth on server
      transports: ['websocket'],    // CRITICAL: skip long-polling in APK
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
}
```

**Why `transports: ['websocket']`:** In APK context, forcing WebSocket transport avoids the polling→upgrade sequence. HTTP long-polling from an APK to Railway can stall due to Railway's proxy timeout (30s default). Direct WebSocket avoids this.

### 5. @capacitor/preferences vs localStorage

| | `@capacitor/preferences` | `localStorage` |
|---|---|---|
| Works in APK | YES | NO (sandboxed, cleared on update) |
| Works in browser | YES (falls back to localStorage) | YES |
| Async API | YES (Promise-based) | NO (sync) |
| Persistence on app update | YES | NO — data lost |
| Security | Android SharedPreferences | Web storage (insecure in APK) |

**The rule:** Use `@capacitor/preferences` for ALL persistent data in this project. `localStorage` is explicitly out of scope (PROJECT.md).

```typescript
// CORRECT — store JWT
await Preferences.set({ key: 'jwt_token', value: token });

// CORRECT — retrieve JWT
const { value } = await Preferences.get({ key: 'jwt_token' });

// CORRECT — clear on logout
await Preferences.remove({ key: 'jwt_token' });

// WRONG — never do this in an Ionic APK project
localStorage.setItem('jwt_token', token);
```

### 6. Railway: Environment Variables + DATABASE_URL

**Required Railway environment variables:**

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname   # Auto-set by Railway Postgres plugin
PORT=3000                                               # Railway sets this automatically; Express must read it
JWT_SECRET=<strong-random-string-min-32-chars>
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT=<JSON string or path>
```

**Express server binding:**

```javascript
// CORRECT — Railway assigns PORT dynamically
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {        // '0.0.0.0' required on Railway
  console.log(`Server running on port ${PORT}`);
});
```

**Why `0.0.0.0`:** Railway's routing layer requires the process to bind on all interfaces, not `127.0.0.1`. Binding to localhost silently fails on Railway.

**pg pool with DATABASE_URL:**

```javascript
// src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }    // Railway self-signed cert
    : false,
});

module.exports = pool;
```

**Why `ssl: { rejectUnauthorized: false }`:** Railway PostgreSQL connections require SSL in production, but the cert is self-signed. `rejectUnauthorized: false` accepts it without a CA bundle. In development (localhost Postgres), SSL is disabled.

### 7. FCM Push via firebase-admin (FCM v1)

The FCM Legacy HTTP API (`https://fcm.googleapis.com/fcm/send`) was deprecated in June 2024 and shut down in June 2025. Use FCM v1 via `firebase-admin`:

```javascript
// src/services/push.service.js
const admin = require('firebase-admin');

// Initialize once at app start
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  ),
});

async function sendPush(fcmToken, title, body, data = {}) {
  await admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data,                          // key-value strings only
    android: {
      priority: 'high',
    },
  });
}
```

**Confidence:** MEDIUM — FCM deprecation timeline is HIGH confidence; `firebase-admin` v12 API shape is MEDIUM (verify against Firebase docs).

### 8. Angular 18: Standalone Components + Signals Pattern

```typescript
// CORRECT — standalone component (no NgModule)
@Component({
  selector: 'app-discovery',
  standalone: true,
  imports: [IonCard, IonButton, CommonModule],
  templateUrl: './discovery.component.html',
})
export class DiscoveryComponent {
  // Signal preferred over BehaviorSubject
  currentVibe = signal<string>('Chill');
  cards = signal<UserCard[]>([]);

  // Computed from signals
  cardCount = computed(() => this.cards().length);
}
```

**Why standalone + signals:** Angular 18 made standalone the default. Signals reduce RxJS boilerplate for local state; RxJS remains appropriate for HTTP streams and Socket.io event observables.

### 9. Multer — Disk Storage Configuration

```javascript
// src/config/multer.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));  // Absolute path
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },   // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(file.mimetype));
  },
});

module.exports = upload;
```

**Serve uploads as static:**

```javascript
// In server.js
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

**CRITICAL CAVEAT — Railway Ephemeral Disk:** Railway's free tier does not persist the filesystem between deployments. Every deploy wipes `/uploads`. For a university demo this is acceptable if you demo on a stable deployment. If persistence is required, either pin a Railway volume (paid) or migrate to Cloudinary (out of scope per PROJECT.md). This is explicitly noted in PITFALLS.md.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | Ionic 8 + Angular 18 | React Native / Expo | Professor requirement; non-negotiable |
| Auth | Manual JWT + bcrypt | Firebase Auth | Professor requirement; non-negotiable |
| Token storage | @capacitor/preferences | localStorage | localStorage not reliable/secure in APK; lost on app update |
| DB driver | `pg` (node-postgres) | Prisma / TypeORM | No ORM per project constraint; raw SQL demonstrates DB fundamentals |
| File storage | Multer to disk | Cloudinary / S3 | Simplicity for academic scope; noted caveat on Railway ephemeral disk |
| WebSocket auth | JWT in `handshake.auth` | Cookie-based | APK context has no reliable cookie jar; auth header in handshake is the standard Capacitor pattern |
| Realtime transport | Socket.io | SSE / WebRTC | Socket.io rooms+events model maps directly to chat+typing+reactions; SSE is unidirectional |
| Push | Capacitor + FCM | Local notifications | Background push requires FCM; local-only notifications miss the cross-device use case |
| Express version | v4 | v5 (RC) | v5 was still in RC as of Aug 2025; use v4 for academic stability |
| bcrypt binding | `bcrypt` | `bcryptjs` | Use `bcrypt` (native); fall back to `bcryptjs` only if Railway build fails (no native compiler) |

---

## Installation

### Frontend (Ionic + Angular + Capacitor)

```bash
# Install Ionic CLI globally (if not present)
npm install -g @ionic/cli

# Create project (or install into existing)
npm install @ionic/angular @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/push-notifications @capacitor/preferences
npm install socket.io-client

# Add Android platform
npx cap add android

# After every `ionic build`:
npx cap sync android

# Open in Android Studio to build APK:
npx cap open android
```

### Backend (Node.js)

```bash
npm install express socket.io jsonwebtoken bcrypt multer pg dotenv cors helmet express-rate-limit morgan firebase-admin

npm install -D nodemon eslint prettier
```

### .env.example (commit this, never .env)

```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/vibe_dev
JWT_SECRET=replace_with_min_32_char_random_string
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

---

## API Response Envelope

All Express endpoints must return this shape (PROJECT.md constraint):

```json
{
  "data": null,
  "error": null,
  "message": "Human-readable string"
}
```

Helper:

```javascript
// src/utils/response.js
const ok = (res, data, message = 'OK', status = 200) =>
  res.status(status).json({ data, error: null, message });

const fail = (res, error, message = 'Error', status = 400) =>
  res.status(status).json({ data: null, error, message });

module.exports = { ok, fail };
```

---

## Sources

**Confidence assessment by area:**

| Area | Confidence | Basis |
|------|------------|-------|
| Ionic 8 + Capacitor 6 compatibility | MEDIUM | Training data (Aug 2025 cutoff); no live npm verify available |
| Angular 18 standalone + signals | HIGH | Well-documented Angular 18 stable release patterns |
| Socket.io JWT handshake pattern | HIGH | Stable Socket.io 4.x API, unchanged since v4.0 |
| @capacitor/preferences vs localStorage | HIGH | Official Capacitor docs pattern, consistent across versions |
| Railway PORT + 0.0.0.0 binding | HIGH | Standard Railway deployment requirement, documented |
| Railway pg SSL config | HIGH | Standard pg + Railway pattern, widely documented |
| FCM v1 deprecation (Legacy shutdown June 2025) | HIGH | Google announced June 2024 deprecation; shutdown June 2025 |
| firebase-admin v12 send() API shape | MEDIUM | Training data; verify against Firebase Admin Node.js docs |
| Multer railway ephemeral disk caveat | HIGH | Railway architecture fact; no persistent disk on free tier |
| Exact package versions | LOW | Training data only; all versions marked [VERIFY] must be confirmed with `npm view <pkg> version` before project init |

**Recommended verification steps before project init:**

```bash
npm view @ionic/angular version
npm view @capacitor/core version
npm view @angular/core version
npm view socket.io version
npm view jsonwebtoken version
npm view bcrypt version
npm view firebase-admin version
npm view pg version
```

**Official documentation references (verify live):**
- Capacitor: https://capacitorjs.com/docs
- Ionic Angular: https://ionicframework.com/docs/angular/overview
- Angular 18 signals: https://angular.dev/guide/signals
- Socket.io auth middleware: https://socket.io/docs/v4/middlewares/
- Railway deployment: https://docs.railway.app
- Firebase Admin Node.js: https://firebase.google.com/docs/admin/setup
- FCM v1 migration: https://firebase.google.com/docs/cloud-messaging/migrate-v1
- node-postgres (pg): https://node-postgres.com/
