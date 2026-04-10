# Phase 2: Auth & Profile - Research

**Researched:** 2026-04-09
**Domain:** JWT authentication, bcryptjs password hashing, Cloudinary avatar upload, Angular functional interceptors, @capacitor/preferences, route guards
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can register with name, email, password, and optional profile photo (Multer upload) | Cloudinary Multer middleware already wired in `backend/src/middleware/upload.js`; `uploadAvatar.single('avatar')` is the call pattern |
| AUTH-02 | Passwords are hashed with bcrypt (salt rounds: 10) before storage | Use `bcryptjs` (not `bcrypt`) — pure JS, zero native deps, avoids node-gyp failures on Render; API is identical |
| AUTH-03 | User can log in with email/password and receive a JWT | `jsonwebtoken` — `jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' })`; strip password_hash from response |
| AUTH-04 | JWT is stored in `@capacitor/preferences` (never localStorage) | `Preferences.set({ key: 'token', value: token })`; `Preferences.get({ key: 'token' })` returns `{ value: string \| null }` |
| AUTH-05 | JWT verify middleware protects all non-public endpoints | `jwt.verify(token, JWT_SECRET)` in Express middleware; attach `req.user = decoded` for downstream handlers |
| AUTH-06 | Angular HTTP interceptor attaches JWT to all API requests (async Preferences pattern) | Functional interceptor with `from(Preferences.get(...)).pipe(switchMap(...))` — Promises must be converted to Observables |
| AUTH-07 | Angular route guard redirects unauthenticated users to login | `CanActivateFn` with `inject(Router).createUrlTree(['/login'])` — return UrlTree, not `false` |
| PROF-01 | User can view their own profile (name, bio, avatar, interests, vibe status) | `GET /users/me` — reads from `users` table; all columns already migrated in Phase 1 |
| PROF-02 | User can update their profile (name, bio, interests) | `PATCH /users/me` — partial update, interests stored as `TEXT[]` in PostgreSQL |
| PROF-03 | User can upload a new avatar photo (replaces existing) | `PATCH /users/me/avatar` — `uploadAvatar.single('avatar')`, store `req.file.path` (Cloudinary URL) in `users.avatar_url` |
| PROF-04 | User without an uploaded avatar sees a generated fallback (initials + deterministic color from name) | Client-side Angular component — hash name to index into color array, extract initials; no backend changes needed |
</phase_requirements>

---

## Summary

Phase 2 builds the authentication layer and profile management system on top of the already-migrated `users` table and Cloudinary upload middleware established in Phase 1. The backend work divides into three areas: registration/login endpoints (`/auth/*`), JWT verify middleware, and profile CRUD endpoints (`/users/me`). The frontend work divides into: two Ionic pages (login, register), an auth service wrapping `@capacitor/preferences`, a functional HTTP interceptor, a functional route guard, and a profile page with avatar fallback.

The most significant constraint is the `bcrypt` vs `bcryptjs` decision: **use `bcryptjs`**. Render's build environment does support node-gyp in principle, but `bcrypt` has a documented history of native compilation failures across cloud platforms. `bcryptjs` is a pure JavaScript drop-in with identical API, 6.5M weekly downloads (nearly 2x `bcrypt`'s adoption), and zero native build risk. The STATE.md already flagged this concern.

The Cloudinary upload middleware is fully wired (`backend/src/middleware/upload.js`). `uploadAvatar` and `uploadChatImage` are already exported. The only new work is connecting those exports to the auth and profile routes — no Cloudinary configuration code needs to be written. Avatar URLs from Cloudinary come back in `req.file.path`.

The Angular interceptor pattern requires special attention: `@capacitor/preferences` is Promise-based, but Angular's HTTP pipeline is Observable-based. The pattern is `from(Preferences.get({ key: 'token' })).pipe(switchMap(({ value }) => next(req.clone({ setHeaders: { Authorization: 'Bearer ' + value } }))))`. Missing the `from()` conversion is the most common pitfall in this stack combination.

**Primary recommendation:** Build backend auth routes first (register → login → JWT middleware → profile), then frontend services and pages, with the interceptor and guard wired last since they depend on the auth service being stable.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bcryptjs | ^2.4.3 | Password hashing (pure JS) | Identical API to `bcrypt`; zero native deps — safe on Render; 6.5M weekly downloads |
| jsonwebtoken | ^9.0.2 | JWT sign and verify | Official Auth0-maintained package; standard for Express JWT |
| @capacitor/preferences | ^8.x | Secure key/value store for JWT on device | Capacitor-native; avoids localStorage which is unreliable in Capacitor WebView |

### Supporting (already installed — no new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| multer | ^2.1.1 | Multipart form parsing for avatar upload | Already installed; `uploadAvatar.single('avatar')` is the call |
| cloudinary | ^1.41.3 | Cloudinary SDK v2 accessed via `require('cloudinary').v2` | Already installed and configured in `upload.js` |
| multer-storage-cloudinary | ^4.0.0 | CloudinaryStorage engine for multer | Already installed; `req.file.path` returns the Cloudinary URL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | bcrypt | `bcrypt` is faster (native C++) but requires node-gyp build tools; Render may fail to compile it. `bcryptjs` is the safe default for cloud deployments. |
| Functional interceptors | Class-based HttpInterceptor | Class-based interceptors are deprecated in Angular 17+ and have less predictable ordering. Functional is the current standard. |
| CanActivateFn (functional guard) | CanActivate interface | CanActivate interface is deprecated since Angular 15.2. Use `CanActivateFn` and `inject()`. |

**Backend installation (new packages only):**
```bash
cd backend
npm install bcryptjs jsonwebtoken
```

**Frontend installation (new packages only):**
```bash
cd frontend
npm install @capacitor/preferences
npx cap sync
```

---

## Architecture Patterns

### Recommended Project Structure (additions to Phase 1)
```
backend/src/
├── routes/
│   ├── health.js          # existing
│   ├── auth.js            # NEW: POST /auth/register, POST /auth/login
│   └── users.js           # NEW: GET /users/me, PATCH /users/me, PATCH /users/me/avatar
├── controllers/
│   ├── auth.controller.js # NEW
│   └── users.controller.js # NEW
├── services/
│   ├── auth.service.js    # NEW: register, login business logic
│   └── users.service.js   # NEW: getMe, updateMe, updateAvatar
├── middleware/
│   ├── upload.js          # existing — uploadAvatar, uploadChatImage
│   └── auth.middleware.js # NEW: verifyToken — attaches req.user
└── app.js                 # MODIFIED: mount /auth and /users routes

frontend/src/app/
├── core/
│   ├── services/
│   │   └── auth.service.ts          # NEW: login, register, logout, getToken, isLoggedIn
│   ├── interceptors/
│   │   └── auth.interceptor.ts      # NEW: functional interceptor
│   └── guards/
│       └── auth.guard.ts            # NEW: functional CanActivateFn
├── pages/
│   ├── login/
│   │   ├── login.page.ts            # NEW: standalone component
│   │   └── login.page.html          # NEW
│   ├── register/
│   │   ├── register.page.ts         # NEW: standalone component
│   │   └── register.page.html       # NEW
│   └── profile/
│       ├── profile.page.ts          # NEW: standalone component
│       └── profile.page.html        # NEW
├── shared/
│   └── components/
│       └── avatar/
│           └── avatar.component.ts  # NEW: initials fallback standalone component
└── app.routes.ts                    # MODIFIED: add login, register, profile routes with guard
```

### Pattern 1: bcryptjs Hash and Compare
**What:** Hash password on register; compare on login. API is identical to `bcrypt` (just change the import).
**When to use:** Every registration and login operation.
```javascript
// backend/src/services/auth.service.js
const bcrypt = require('bcryptjs');

async function register({ name, email, password, avatarUrl }) {
  const hash = await bcrypt.hash(password, 10); // AUTH-02: salt rounds = 10
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, avatar_url, created_at`,
    [name, email, hash, avatarUrl || null]
  );
  return result.rows[0];
}

async function login({ email, password }) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid credentials');
  return user; // caller strips password_hash before returning
}
```

### Pattern 2: JWT Sign and Verify
**What:** Sign a JWT with user id and email on login; verify on every protected request.
**When to use:** Login endpoint (sign) + auth middleware (verify).
```javascript
// backend/src/services/auth.service.js
const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: 'UNAUTHORIZED', message: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ data: null, error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };
```

### Pattern 3: Cloudinary Avatar Upload (existing middleware)
**What:** Use the already-configured `uploadAvatar` middleware from Phase 1 to handle avatar uploads on register and profile update. `req.file.path` contains the Cloudinary URL.
**When to use:** `POST /auth/register` (optional avatar) and `PATCH /users/me/avatar`.
```javascript
// backend/src/routes/auth.js
const { uploadAvatar } = require('../middleware/upload');
const authController = require('../controllers/auth.controller');

router.post('/register', uploadAvatar.single('avatar'), authController.register);
// req.file?.path => 'https://res.cloudinary.com/...' or undefined if no file uploaded
```

### Pattern 4: Angular Auth Service with @capacitor/preferences
**What:** Centralized service for token storage, retrieval, and auth state. All Preferences calls are async (return Promises).
**When to use:** Called by interceptor, guard, login/register pages, and logout flow.
```typescript
// frontend/src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signal-based auth state (QUAL-04)
  isAuthenticated = signal<boolean>(false);

  async getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  }

  async setToken(token: string): Promise<void> {
    await Preferences.set({ key: TOKEN_KEY, value: token });
    this.isAuthenticated.set(true);
  }

  async logout(): Promise<void> {
    await Preferences.remove({ key: TOKEN_KEY });
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  login(email: string, password: string) {
    return firstValueFrom(
      this.http.post<{ data: { token: string } }>(`${environment.apiUrl}/auth/login`, { email, password })
    );
  }

  register(payload: FormData) {
    return firstValueFrom(
      this.http.post<{ data: { token: string } }>(`${environment.apiUrl}/auth/register`, payload)
    );
  }
}
```

### Pattern 5: Functional HTTP Interceptor with Async Token (AUTH-06)
**What:** Attach JWT to every outgoing request. `@capacitor/preferences` is Promise-based; must use `from()` to convert to Observable before `switchMap`.
**When to use:** Wired into `provideHttpClient(withInterceptors([authInterceptor]))` in `main.ts`.

**CRITICAL PATTERN:** The `from()` conversion is mandatory. Omitting it causes requests to fire before the token is retrieved.

```typescript
// frontend/src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return from(authService.getToken()).pipe(
    switchMap((token) => {
      if (!token) return next(req);
      const authedReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next(authedReq);
    })
  );
};
```

```typescript
// frontend/src/main.ts — MODIFIED
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])), // REPLACES plain provideHttpClient()
  ],
});
```

### Pattern 6: Functional Route Guard (AUTH-07)
**What:** Redirect unauthenticated users to `/login`. Return `UrlTree`, not `false`.
**When to use:** Applied to every protected route (profile, discovery, chat, etc.).
```typescript
// frontend/src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { from, map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return from(authService.getToken()).pipe(
    map((token) => token ? true : router.createUrlTree(['/login']))
  );
};
```

```typescript
// frontend/src/app/app.routes.ts — MODIFIED
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
```

### Pattern 7: Avatar Fallback — Initials + Deterministic Color (PROF-04)
**What:** A standalone Angular component that shows the avatar image or, if `avatarUrl` is null/empty, renders initials in a colored circle. Color is deterministic from the name using a hash.
**When to use:** Used wherever avatar is displayed (profile, discovery cards, chat).
```typescript
// frontend/src/app/shared/components/avatar/avatar.component.ts
import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

const COLORS = ['#E57373','#81C784','#64B5F6','#FFD54F','#BA68C8','#4DB6AC','#FF8A65'];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % COLORS.length;
  }
  return hash;
}

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar-wrapper" [style.background]="bgColor()" *ngIf="!avatarUrl; else img">
      <span class="initials">{{ initials() }}</span>
    </div>
    <ng-template #img>
      <img [src]="avatarUrl" alt="avatar" class="avatar-img" (error)="onError()" />
    </ng-template>
  `,
})
export class AvatarComponent {
  @Input() avatarUrl: string | null = null;
  @Input() name: string = '';

  initials = computed(() =>
    this.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  );

  bgColor = computed(() => COLORS[hashName(this.name)]);

  onError() {
    this.avatarUrl = null; // triggers fallback on broken image URL
  }
}
```

### Pattern 8: Ionic Reactive Form (Login/Register)
**What:** Use Angular ReactiveFormsModule with Ionic form components. Import `ReactiveFormsModule` in the standalone component's `imports` array.
**When to use:** Login and register pages.
```typescript
// Standalone component — import ReactiveFormsModule directly in imports array
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IonContent, IonInput, IonButton, IonItem, IonLabel } from '@ionic/angular/standalone';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonInput, IonButton, IonItem, IonLabel],
  ...
})
export class LoginPage {
  private fb = inject(FormBuilder);
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
}
```

### Anti-Patterns to Avoid
- **Using `bcrypt` (native) instead of `bcryptjs`:** Likely to fail during `npm install` on Render due to missing C++ build tools. Use `bcryptjs`.
- **Storing JWT in localStorage:** Capacitor APK context — `localStorage` is not reliably available. Always use `@capacitor/preferences`.
- **Omitting `from()` in the HTTP interceptor:** Without converting the Preferences Promise to an Observable, the interceptor will proceed synchronously before the token is retrieved, sending unauthenticated requests.
- **Returning `false` from CanActivateFn:** Returns false but does not navigate. Always return `router.createUrlTree(['/login'])` (a UrlTree) for proper redirect.
- **Using deprecated `CanActivate` interface:** Use the `CanActivateFn` type instead. Class-based guards are deprecated since Angular 15.2.
- **Returning `password_hash` in API responses:** Never include the hash in any API response. Explicitly `SELECT` non-sensitive columns, or `delete user.password_hash` before responding.
- **Sending JSON for file uploads:** When a form includes a file (avatar), the request must be `FormData`, not JSON. Set no `Content-Type` header — Angular/browser sets the `multipart/form-data` boundary automatically.
- **Hardcoding JWT expiry:** Use `process.env.JWT_SECRET` only. Expiry of `'7d'` is reasonable for an academic project without refresh tokens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom crypto or MD5 | `bcryptjs` | bcrypt is specifically designed for passwords; includes salting, work factor; MD5/SHA are fast — exactly wrong for passwords |
| JWT creation and validation | Manual base64 encode/decode + HMAC | `jsonwebtoken` | JWT structure, algorithm negotiation, expiry handling, and signature verification are all handled correctly; hand-rolled has known timing attack vectors |
| Async token in Observable pipeline | Manual Promise chaining | `from()` + `switchMap()` from RxJS | Already in project; `from()` converts any Promise/iterable to Observable correctly |
| File upload to cloud | Direct Cloudinary SDK call in route | `multer-storage-cloudinary` (already wired) | The `uploadAvatar` middleware in `upload.js` is already complete; calling it as middleware is 1 line |
| Deterministic avatar color | External avatar service | Custom hash function in Angular | Simple pure function; external service adds network dependency and latency |

**Key insight:** The Cloudinary + multer pipeline is already fully configured in `upload.js`. Calling `uploadAvatar.single('avatar')` as Express route middleware is the only connection needed — no new SDK configuration required.

---

## Common Pitfalls

### Pitfall 1: bcrypt Native Build Failure on Render
**What goes wrong:** `npm install` succeeds locally but Render build log shows `node-pre-gyp install --fallback-to-build` failure, causing deploy to fail.
**Why it happens:** `bcrypt` requires a C++ compiler and Python (node-gyp) to compile native bindings. Render's build environment may lack these or have version conflicts.
**How to avoid:** Use `bcryptjs` from the start. It is a pure JS implementation with identical API: `require('bcryptjs')` replaces `require('bcrypt')` everywhere.
**Warning signs:** Build log shows "node-gyp rebuild" errors during `npm install` step on Render.

### Pitfall 2: Interceptor Fires Before Token is Retrieved
**What goes wrong:** API calls are made without `Authorization` header even when user is logged in. Usually manifests as intermittent 401s on first app load.
**Why it happens:** `@capacitor/preferences` is async. If you read the token synchronously (e.g., from a class property set in the constructor), the interceptor runs before the `await` completes.
**How to avoid:** Always use `from(Preferences.get(...)).pipe(switchMap(...))` in the interceptor. The `from()` wraps the Promise and `switchMap` ensures the HTTP request is only sent after the token resolves.
**Warning signs:** First API call after login returns 401; subsequent calls succeed after a reload.

### Pitfall 3: Avatar Upload Breaks on JSON Content-Type
**What goes wrong:** Backend receives avatar upload but `req.file` is undefined; form fields are also missing.
**Why it happens:** The Angular `HttpClient` defaults to `application/json`. When sending `FormData`, the `Content-Type` must be `multipart/form-data` with a boundary parameter that only the browser can set correctly.
**How to avoid:** Create a `FormData` object in Angular, append fields with `.append()`, and pass it directly to `this.http.post()` — do NOT set `Content-Type` manually. Angular will let the browser set the correct boundary.
**Warning signs:** `req.file` is `undefined` in the Express handler; body parser logs errors about invalid JSON.

### Pitfall 4: Circular Dependency Between AuthService and HTTP Interceptor
**What goes wrong:** Angular throws a circular dependency error at runtime: interceptor injects AuthService, AuthService injects HttpClient for login/register calls, and the interceptor runs on those same calls.
**Why it happens:** The interceptor injects AuthService; AuthService uses HttpClient; HttpClient uses the interceptor.
**How to avoid:** In the interceptor, check if the request URL is `/auth/login` or `/auth/register` and skip token attachment for those routes. Alternatively, use a separate minimal token-retrieval service (no HttpClient dependency) in the interceptor.
**Warning signs:** Angular console shows "Cannot instantiate cyclic dependency!" at bootstrap.

### Pitfall 5: Guard Returns False Instead of UrlTree
**What goes wrong:** Unauthenticated user hits a protected route and the app goes blank or stays frozen rather than navigating to login.
**Why it happens:** Returning `false` from `CanActivateFn` cancels navigation but does not redirect. The Angular router stops the route but performs no further navigation.
**How to avoid:** Return `router.createUrlTree(['/login'])` to trigger an actual redirect. The UrlTree is the canonical Angular pattern for guard-initiated redirects.
**Warning signs:** Protected route shows nothing (blank page) for unauthenticated users; URL does not change to `/login`.

### Pitfall 6: Returning password_hash in API Responses
**What goes wrong:** The client receives the password hash in the user object, which is a security leak.
**Why it happens:** `SELECT *` from users returns all columns including `password_hash`.
**How to avoid:** Always `SELECT id, name, email, bio, avatar_url, interests, vibe, vibe_updated_at, created_at FROM users` — never `SELECT *`. Or `delete user.password_hash` on the result object before returning.
**Warning signs:** Network inspector shows `password_hash` field in any auth or profile API response.

### Pitfall 7: interests Column Type Mismatch
**What goes wrong:** Sending `interests` as a JSON array string causes a PostgreSQL type error for `TEXT[]` columns.
**Why it happens:** The `interests` column is `TEXT[]` (PostgreSQL array), not JSON. `express.json()` parses request bodies into JavaScript arrays, which `pg` correctly parameterizes as SQL arrays when passed directly. The error occurs when the value is stringified (e.g., `JSON.stringify(['Gaming', 'Music'])`).
**How to avoid:** Pass the JavaScript array directly to `pg` — do not JSON.stringify it. Example: `pool.query('UPDATE users SET interests = $1', [['Gaming', 'Music']])`.
**Warning signs:** PostgreSQL error `invalid input syntax for type text[]` in backend logs.

---

## Code Examples

### Backend: Register Endpoint (AUTH-01, AUTH-02, AUTH-03)
```javascript
// backend/src/controllers/auth.controller.js
const authService = require('../services/auth.service');

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ data: null, error: 'VALIDATION', message: 'name, email, password required' });
    }
    const avatarUrl = req.file?.path || null; // Cloudinary URL or null
    const user = await authService.register({ name, email, password, avatarUrl });
    const token = authService.signToken(user);
    return res.status(201).json({ data: { user, token }, error: null, message: 'Registered' });
  } catch (err) {
    if (err.code === '23505') { // pg unique violation
      return res.status(409).json({ data: null, error: 'CONFLICT', message: 'Email already registered' });
    }
    return res.status(500).json({ data: null, error: 'SERVER_ERROR', message: err.message });
  }
}
```

### Backend: Auth Middleware (AUTH-05)
```javascript
// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: 'UNAUTHORIZED', message: 'Missing token' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ data: null, error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };
```

### Backend: Protected Routes Mounting in app.js
```javascript
// backend/src/app.js — additions
const { verifyToken } = require('./middleware/auth.middleware');

app.use('/auth', require('./routes/auth'));
app.use('/users', verifyToken, require('./routes/users')); // all /users/* are protected
```

### Backend: Profile Update with interests Array (PROF-02)
```javascript
// backend/src/services/users.service.js
async function updateMe(userId, { name, bio, interests }) {
  const result = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio), interests = COALESCE($3, interests)
     WHERE id = $4
     RETURNING id, name, email, bio, avatar_url, interests, vibe, vibe_updated_at`,
    [name || null, bio || null, interests || null, userId]
  );
  return result.rows[0];
}
```

### Frontend: Functional Interceptor with from() + switchMap (AUTH-06)
```typescript
// frontend/src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip token attachment for auth endpoints to avoid circular dependency
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    return next(req);
  }

  return from(authService.getToken()).pipe(
    switchMap((token) => {
      if (!token) return next(req);
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    })
  );
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based `CanActivate` interface | `CanActivateFn` functional guard | Angular 15.2 (deprecated) | Class-based guards still work but generate deprecation warnings; all new guards must use `CanActivateFn` |
| Class-based `HttpInterceptor` | `HttpInterceptorFn` + `withInterceptors()` | Angular 17 | Functional interceptors have predictable ordering; wired via `provideHttpClient(withInterceptors([...]))` |
| `@capacitor/storage` (old API) | `@capacitor/preferences` | Capacitor 4 | Package rename; old `Storage` plugin is deprecated and removed in Capacitor 6+ |
| localStorage for token | `@capacitor/preferences` | Capacitor 2+ | localStorage unreliable in native WebView; `Preferences` uses native OS secure storage |
| `bcrypt` (native) | `bcryptjs` (pure JS) | Ongoing | For cloud/serverless deployments without build tool guarantees, `bcryptjs` is the pragmatic choice |

**Deprecated/outdated:**
- `@capacitor/storage`: Replaced by `@capacitor/preferences`. Never import the old package name.
- `CanActivate` interface: Still compiles but deprecated since Angular 15.2. Use `CanActivateFn`.
- `HttpInterceptor` class: Functional interceptors are now standard; class-based continue to work but are discouraged for new code.

---

## Open Questions

1. **bcrypt on Render — actual build environment**
   - What we know: STATE.md flags this as a known concern; `bcryptjs` is the documented safe fallback.
   - What's unclear: Render's current Node.js build image may or may not include node-gyp tools. Not tested.
   - Recommendation: Use `bcryptjs` from the start. The API is identical; there is zero cost to choosing it.

2. **JWT expiry and no refresh token**
   - What we know: REQUIREMENTS.md lists no refresh token requirement; Phase 2 scope is JWT + `@capacitor/preferences` only.
   - What's unclear: For an academic app, a 7-day expiry is reasonable. Expired tokens will silently fail API calls.
   - Recommendation: Use 7-day expiry. On 401, redirect to login (guard already handles this). Refresh tokens are out of scope per requirements.

3. **Register with avatar — multipart vs two-step**
   - What we know: AUTH-01 says "optional profile photo" on registration. Multer middleware supports optional file (`req.file` will be `undefined` if not uploaded).
   - What's unclear: Mobile UX — camera picker on register may be cumbersome. The plan can handle this as a skip-able step.
   - Recommendation: Make avatar optional on register (multer handles this naturally); user can always update via PROF-03 later.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No automated test framework detected (greenfield project); manual + curl smoke tests |
| Config file | None — manual verification per task |
| Quick run command | `curl -s -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"t@test.com","password":"password123"}'` |
| Full suite command | Start backend, run register → login → GET /users/me → PATCH /users/me sequence manually |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Register with name, email, password, optional photo | smoke | `curl -X POST /auth/register -F "name=Test" -F "email=t@test.com" -F "password=pass123"` | ❌ Wave 0 |
| AUTH-02 | Password hashed with bcrypt (10 rounds) | manual | Inspect DB: `SELECT password_hash FROM users` — must start with `$2b$` | N/A |
| AUTH-03 | Login returns JWT | smoke | `curl -X POST /auth/login -d '{"email":"t@test.com","password":"pass123"}'` — verify `data.token` present | ❌ Wave 0 |
| AUTH-04 | JWT stored in @capacitor/preferences | manual | Open DevTools in Android emulator, verify no token in localStorage | N/A |
| AUTH-05 | JWT middleware protects endpoints | smoke | `curl /users/me` without token → expect 401; with token → expect 200 | ❌ Wave 0 |
| AUTH-06 | HTTP interceptor attaches JWT | manual | Network inspector in browser/emulator — verify `Authorization: Bearer ...` header on API calls | N/A |
| AUTH-07 | Unauthenticated user redirected to login | manual | Open app without stored token, navigate to `/profile` — verify redirect to `/login` | N/A |
| PROF-01 | GET /users/me returns profile | smoke | `curl /users/me -H "Authorization: Bearer TOKEN"` — verify all profile fields, no password_hash | ❌ Wave 0 |
| PROF-02 | PATCH /users/me updates profile | smoke | `curl -X PATCH /users/me -d '{"bio":"test"}' -H "Authorization: Bearer TOKEN"` | ❌ Wave 0 |
| PROF-03 | Avatar upload replaces existing | smoke | `curl -X PATCH /users/me/avatar -F "avatar=@photo.jpg" -H "Authorization: Bearer TOKEN"` — verify Cloudinary URL in response | ❌ Wave 0 |
| PROF-04 | Fallback shows initials + color when no avatar | manual | Log in with user having no avatar; verify initials circle appears | N/A |

### Sampling Rate
- **Per task commit:** Start backend locally, run the relevant curl command from the test map
- **Per wave merge:** Full sequence: register → login → GET /users/me → PATCH /users/me → avatar upload
- **Phase gate:** App on Android emulator: register new user, log in, view profile, edit profile, see avatar fallback — before marking phase complete

### Wave 0 Gaps
- [ ] `backend/src/routes/auth.js` — must exist before any auth test can run
- [ ] `backend/src/middleware/auth.middleware.js` — required for all protected endpoint tests
- [ ] `npm install bcryptjs jsonwebtoken` in backend — packages must be present before any auth code runs
- [ ] `npm install @capacitor/preferences && npx cap sync` in frontend — required before interceptor runs on device

---

## Sources

### Primary (HIGH confidence)
- [Angular official — HTTP Interceptors guide](https://angular.dev/guide/http/interceptors) — functional interceptor pattern, `from()` + `switchMap()` for async token
- [Angular official — Route guards](https://angular.dev/guide/routing/route-guards) — `CanActivateFn`, `UrlTree` redirect pattern
- [Angular official — HTTP setup](https://angular.dev/guide/http/setup) — `provideHttpClient(withInterceptors([...]))` pattern
- [Capacitor Preferences official docs](https://capacitorjs.com/docs/apis/preferences) — `Preferences.get/set` API, install command, string-only limitation
- `backend/src/middleware/upload.js` — Cloudinary/multer already wired; `uploadAvatar.single('avatar')` is the call pattern; `req.file.path` is the Cloudinary URL

### Secondary (MEDIUM confidence)
- [bcrypt vs bcryptjs comparison — pkgpulse](https://www.pkgpulse.com/compare/bcrypt-vs-bcryptjs) — download stats (bcryptjs 6.5M/wk vs bcrypt 3.5M/wk), deployment tradeoffs
- [Angular 20 interceptors — DEV Community](https://dev.to/cristiansifuentes/angular-20-httpclient-interceptors-functional-predictable-and-powerful-kdf) — Angular 20 functional interceptor confirmed working
- [Ionic Forum — Http Interceptor with Capacitor Storage](https://forum.ionicframework.com/t/http-interceptor-with-capacitor-storage-get/151362) — community-verified `from()` + `switchMap()` pattern for Capacitor storage in interceptors
- [multer-storage-cloudinary GitHub](https://github.com/affanshahid/multer-storage-cloudinary) — `req.file.path` returns Cloudinary URL; `params` API

### Tertiary (LOW confidence)
- bcrypt Render.com native build compatibility — no official Render statement found; recommendation to use `bcryptjs` is based on documented node-gyp failure patterns across cloud platforms, not Render-specific testing

---

## Metadata

**Confidence breakdown:**
- Standard stack (bcryptjs, jsonwebtoken, @capacitor/preferences): HIGH — all verified via official docs and npm
- Architecture (interceptor pattern, guard pattern): HIGH — verified against Angular official docs
- Cloudinary upload: HIGH — existing `upload.js` already implements the pattern; no new configuration needed
- bcryptjs on Render: MEDIUM — strongly recommended but not Render-specifically verified; note from STATE.md confirms it as a known concern
- Pitfalls: HIGH for items 1, 2, 3, 4, 5, 6; MEDIUM for item 7 (interests array)

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (stable ecosystem; Capacitor/Angular release cycles are ~6 months)
