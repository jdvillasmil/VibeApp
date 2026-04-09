# Phase 1: Backend Foundation - Research

**Researched:** 2026-04-08
**Domain:** Node.js/Express backend scaffold, PostgreSQL migration, Ionic/Angular frontend scaffold, Railway deployment, CORS for Capacitor, ESLint/Prettier
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Repo Organization**
- Monorepo: `backend/` and `frontend/` as subfolders in a single git repo
- Railway service root directory set to `backend/` in Railway settings — Railway only sees the backend subfolder
- One root-level `.gitignore` covering both subfolders (node_modules, .env, dist, www, android/ build artifacts)
- Branch strategy: `main` + feature branches; Railway auto-deploys on push to `main`
- Ownership split: roughly one developer owns backend, one owns frontend (not a hard rule)

**Backend Folder Structure**
- Layered MVC inside `backend/src/`:
  - `routes/` — Express routers
  - `controllers/` — req/res handling
  - `services/` — business logic
  - `middleware/` — auth, error handler, Multer upload
  - `config/` — db.js (pg Pool), migrate.js
  - `uploads/` — served as static files
  - `app.js` — Express app config (middleware, routes, static)
  - `index.js` — HTTP server start + Socket.io attach
- `app.js` exports the configured Express app; `index.js` starts the server — kept separate for testability
- CommonJS (`require`) throughout — no ES modules, no transpilation needed
- `npm run dev` = nodemon, `npm start` = node (Railway uses `npm start`)

**DB Migration Scope**
- `migrate.js` creates ALL tables in Phase 1: `users`, `friendships`, `chats`, `messages`, `notifications`, `fcm_tokens`
- Idempotent: `CREATE TABLE IF NOT EXISTS` everywhere — safe to re-run, never wipes data
- No seed data — clean database, tables only

**Frontend Scaffold Depth**
- Minimal scope for Phase 1: `ionic start` + environment file setup + one health check call to verify connectivity and CORS
- Environment files: `environment.ts` (`apiUrl: 'http://localhost:3000'`) and `environment.prod.ts` (`apiUrl: 'https://your-app.railway.app'`) — Angular `--prod` build picks the right one automatically
- Capacitor initialized now (`ionic capacitor add android`) — critical for verifying `capacitor://localhost` CORS handling early, not at APK time
- Page routing and guards deferred to future phases

### Claude's Discretion
- Exact ESLint/Prettier config rules (standard Angular + Node rules are fine)
- Health check endpoint response shape (as long as it returns 200)
- Exact DB column types and constraints (within reasonable Postgres conventions)
- Which port the backend binds to locally (3000 is conventional)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Backend Express app starts and binds to `0.0.0.0:process.env.PORT` (Railway compatible) | Railway docs confirm `0.0.0.0` + `process.env.PORT` is mandatory; hardcoding 3000 → 502 |
| FOUND-02 | PostgreSQL connection established via `DATABASE_URL` environment variable | pg Pool accepts `connectionString` option directly; SSL `rejectUnauthorized: false` required for Railway |
| FOUND-03 | All DB tables created via migration script (`node src/config/migrate.js`) | Raw `CREATE TABLE IF NOT EXISTS` pattern; no ORM per professor requirement |
| FOUND-04 | CORS configured to allow `capacitor://localhost`, `http://localhost:8100`, and Railway frontend origin | Android uses `http://localhost`, iOS uses `capacitor://localhost`; both needed plus `null` for WebView edge cases |
| FOUND-05 | `/uploads` directory served as static files | `express.static(path.join(__dirname, 'uploads'))` mounted at `/uploads` |
| FOUND-06 | `GET /health` returns 200 with service status | Simple JSON response; Railway and local both must respond |
| FOUND-07 | `.env.example` documents all required environment variables; `.env` is gitignored | `PORT`, `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `FCM_SERVER_KEY` to be listed |
| FOUND-08 | Angular environments configured (`environment.ts` → localhost, `environment.prod.ts` → Railway URL) | Angular `fileReplacements` in `angular.json` handles this automatically on `--prod` builds |
| QUAL-01 | ESLint + Prettier configured and passing from day one | `@angular-eslint/schematics@18` for frontend; `eslint@9` flat config + `eslint-plugin-prettier` for backend |
| QUAL-02 | All API responses use `{ data, error, message }` envelope format | Custom convention — no library; must be documented and followed from first endpoint |
| QUAL-03 | Angular uses standalone components (no NgModule where avoidable) | `ionic start` with standalone flag; all Ionic imports from `@ionic/angular/standalone` |
| QUAL-04 | Angular signals used in preference to RxJS for local state | Angular 17+ signals API is stable; use `signal()`, `computed()`, `effect()` for component state |
| QUAL-05 | No `console.error` in production builds | Angular build optimizer tree-shakes with `environment.production` guards; no automated enforcement without custom ESLint rule |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire technical infrastructure that unblocks all future phases. The work divides cleanly into four parallel tracks: (1) Express backend scaffold with PostgreSQL migration, (2) Railway deployment wiring, (3) Ionic/Angular frontend scaffold with Capacitor Android initialization, and (4) code quality tooling (ESLint/Prettier). None of these tracks depend on each other's completion — they can be worked in parallel by two developers.

The most dangerous pitfalls are silent ones: binding Express to `127.0.0.1` instead of `0.0.0.0` causes Railway 502s with no useful error message; omitting `http://localhost` from the CORS allowlist silently breaks Android Capacitor apps; missing `ssl: { rejectUnauthorized: false }` in the pg Pool config causes Railway PostgreSQL connection failures. All three are verified from official sources and must be verified in the planning tasks.

Angular 18 standalone components are the correct default — `ionic start` generates them and all Ionic imports come from `@ionic/angular/standalone`. The `{ data, error, message }` API envelope (QUAL-02) is a custom convention with no library support; it must be established in the first endpoint and documented for both developers to follow consistently.

**Primary recommendation:** Build backend and frontend scaffolds in parallel, then do a single integration test: Angular app running on emulator calls `GET /health` on Railway without CORS errors. If that passes, Phase 1 is done.

---

## Standard Stack

### Core Backend
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | 4.22.1 | HTTP server framework | Stable, CommonJS-native, smallest API surface for this project; Express 5 has routing syntax breaking changes not worth adopting for academic project |
| pg | 8.20.0 | PostgreSQL client (Pool) | Official node-postgres driver; Pool manages connections automatically |
| cors | 2.8.6 | CORS middleware | Industry standard; handles preflight OPTIONS automatically |
| dotenv | 17.4.1 | Load `.env` locally | Standard local-dev env loading; Railway injects vars in production |
| nodemon | 3.1.14 | Auto-restart on file change (dev) | `npm run dev` pattern |
| multer | 2.1.1 | Multipart file upload middleware | Used in Phase 2 for avatar; `uploads/` directory served as static — initialize the folder now |

### Core Frontend
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ionic/angular | 8.8.3 | Ionic UI components for Angular | Non-negotiable stack; standalone components via `@ionic/angular/standalone` |
| @ionic/cli | 7.2.1 | `ionic start`, `ionic serve`, `ionic capacitor` commands | Required for Ionic project scaffolding |
| @capacitor/core | 8.3.0 | Capacitor bridge runtime | Non-negotiable; must match major version with all @capacitor/* plugins |
| @capacitor/android | 8.3.0 | Android native project integration | Needed to verify `capacitor://localhost` CORS from day one |

### Code Quality
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint | 10.2.0 | Linting (flat config, ESLint 9+) | Backend: flat config (`eslint.config.mjs`); Frontend: installed by Angular schematic |
| @angular-eslint/schematics | 18.x | Angular ESLint setup | Run `ng add @angular-eslint/schematics@18` for Angular 18 projects |
| prettier | 3.8.1 | Code formatting | Single `.prettierrc` at repo root covering both workspaces |
| eslint-plugin-prettier | latest | Run Prettier as ESLint rule | Allows `npx eslint --fix` to format and lint in one command |
| eslint-config-prettier | latest | Disable ESLint rules that conflict with Prettier | Always include as last item in ESLint config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Express 4.22.1 | Express 5.2.1 | Express 5 has routing syntax changes (`:param?` → `{/:param}`) and removes some methods used in tutorials; Express 4 is safer for a new team |
| Raw pg Pool | Knex.js | Knex adds query builder convenience but professor requires raw SQL; out of scope |
| dotenv | No alternative | Railway injects vars in prod; dotenv only needed locally |

**Backend installation:**
```bash
cd backend
npm init -y
npm install express@4 cors dotenv pg multer
npm install --save-dev nodemon eslint eslint-plugin-prettier eslint-config-prettier prettier
```

**Frontend installation:**
```bash
npm install -g @ionic/cli
ionic start frontend blank --type=angular --capacitor
cd frontend
npm install @ionic/angular@8
ionic capacitor add android
ng add @angular-eslint/schematics@18
```

---

## Architecture Patterns

### Recommended Project Structure
```
Vibeapp/                          # repo root
├── backend/
│   ├── src/
│   │   ├── routes/               # Express Routers (one file per resource)
│   │   ├── controllers/          # req/res handlers — thin, delegate to services
│   │   ├── services/             # Business logic — no req/res objects
│   │   ├── middleware/           # cors setup, error handler, multer
│   │   ├── config/
│   │   │   ├── db.js             # pg Pool singleton
│   │   │   └── migrate.js        # CREATE TABLE IF NOT EXISTS script
│   │   ├── uploads/              # Multer destination — gitignored contents, not folder
│   │   ├── app.js                # Express app export
│   │   └── index.js              # HTTP server start (requires app.js)
│   ├── .env                      # gitignored
│   ├── .env.example              # committed
│   ├── package.json
│   └── eslint.config.mjs
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── app.component.ts  # standalone root component
│   │   └── environments/
│   │       ├── environment.ts    # apiUrl: http://localhost:3000
│   │       └── environment.prod.ts # apiUrl: https://your-app.railway.app
│   ├── capacitor.config.ts
│   ├── android/                  # checked in — native project
│   └── package.json
├── .gitignore                    # root-level, covers both subfolders
└── .prettierrc                   # repo-wide formatting rules
```

### Pattern 1: Express App/Server Split
**What:** `app.js` creates and exports the configured Express app; `index.js` imports it and starts the HTTP server.
**When to use:** Always — keeps app testable without binding a port.
```javascript
// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      'capacitor://localhost',   // iOS Capacitor WebView
      'http://localhost',        // Android Capacitor WebView
      'http://localhost:8100',   // ionic serve dev
      'http://localhost:4200',   // ng serve dev
      process.env.RAILWAY_STATIC_URL // Railway frontend if applicable
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not allowed'));
    }
  },
  credentials: true
}));
app.options('*', cors());  // preflight for all routes

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes
app.use('/health', require('./routes/health'));

module.exports = app;
```

```javascript
// backend/src/index.js
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Pattern 2: pg Pool Singleton (db.js)
**What:** A single Pool instance exported and reused across all modules.
**When to use:** Always — never create new Pool instances per request.
```javascript
// backend/src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

module.exports = pool;
```

### Pattern 3: Idempotent Migration Script
**What:** A standalone Node.js script that creates all tables using `CREATE TABLE IF NOT EXISTS`. Safe to run multiple times.
**When to use:** Invoked manually with `node src/config/migrate.js` or in Railway start sequence.
```javascript
// backend/src/config/migrate.js
require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      bio TEXT,
      avatar_url VARCHAR(500),
      interests TEXT[],
      vibe VARCHAR(50),
      vibe_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(requester_id, addressee_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      body TEXT,
      image_url VARCHAR(500),
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      payload JSONB,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);
  console.log('Migration complete — all tables created');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

### Pattern 4: API Response Envelope (QUAL-02)
**What:** Every API response uses `{ data, error, message }` shape.
**When to use:** Every controller response — success and error.
```javascript
// Success
res.status(200).json({ data: { id: 1 }, error: null, message: 'OK' });

// Error
res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: 'Email is required' });
```

### Pattern 5: Angular Standalone Environment Setup
**What:** `environment.ts` and `environment.prod.ts` with `apiUrl` consumed by a future HttpService.
**When to use:** Set once in Phase 1, referenced in all future phases.
```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};

// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-app.railway.app'  // replace with actual Railway URL
};
```

`angular.json` `fileReplacements` (auto-generated by `ionic start`):
```json
{
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.prod.ts"
    }
  ]
}
```

### Anti-Patterns to Avoid
- **Binding to 127.0.0.1:** Railway's router cannot reach the process. Always use `'0.0.0.0'` in `app.listen()`.
- **Hardcoding PORT 3000:** Railway injects `process.env.PORT` dynamically. Always use `process.env.PORT || 3000`.
- **Creating pg Pool per request:** Creates connection storms. The singleton in `db.js` is shared across all modules.
- **Calling `pool.end()` in app.js:** Only call in the migration script after it finishes. The long-running server should never end the pool.
- **SSL unconditionally false in pg:** Works locally but breaks Railway production. Use environment-conditional SSL config.
- **`ng new` instead of `ionic start`:** `ng new` does not wire Capacitor or Ionic components. Use `ionic start`.
- **NgModule-based Ionic imports:** In Ionic 8, import all UI components from `@ionic/angular/standalone`, not `@ionic/angular`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS headers | Manual `res.setHeader()` | `cors` npm package | Handles OPTIONS preflight automatically; handles credentials, vary headers |
| Static file serving | Custom file reading route | `express.static()` | Handles etags, range requests, content-type, caching headers |
| `.env` file loading | Manual `fs.readFileSync('.env')` parsing | `dotenv` package | Handles quoting, comments, multiline values |
| Port binding | Hardcoded `3000` | `process.env.PORT \|\| 3000` | Railway sets PORT dynamically; hardcoded value → 502 |
| pg connection pooling | Manual connection management | `pg.Pool` | Handles connection limits, idle timeouts, queue |

**Key insight:** Every "custom solution" in this list has been the cause of Railway deployment failures documented in the Railway help forums. Use the standard tool.

---

## Common Pitfalls

### Pitfall 1: Railway 502 from Wrong Bind Address
**What goes wrong:** App starts successfully locally but Railway returns 502 immediately after deploy.
**Why it happens:** Express listens on `127.0.0.1` (default) which is inaccessible to Railway's router. Railway expects `0.0.0.0`.
**How to avoid:** Always use `app.listen(PORT, '0.0.0.0', callback)`. The host parameter is the second argument.
**Warning signs:** Railway deploy log shows "App is listening" but health check URL returns 502.

### Pitfall 2: Android Capacitor CORS Rejection
**What goes wrong:** iOS emulator works, but Android APK or emulator gets CORS error on every API call.
**Why it happens:** iOS Capacitor WebView sends origin `capacitor://localhost`; Android WebView sends origin `http://localhost` (not `capacitor://localhost`). If only `capacitor://localhost` is in the allowlist, Android calls fail silently.
**How to avoid:** Include BOTH `capacitor://localhost` (iOS) and `http://localhost` (Android) in the CORS `origin` array. Also include `null` for edge cases where Capacitor sends no origin.
**Warning signs:** Network tab in Chrome inspect shows "No 'Access-Control-Allow-Origin' header" only on Android.

### Pitfall 3: Railway PostgreSQL SSL Error
**What goes wrong:** `pg` pool throws `self-signed certificate in certificate chain` when connecting to Railway PostgreSQL.
**Why it happens:** Railway uses self-signed TLS certificates. By default `pg` verifies certificates strictly.
**How to avoid:** Set `ssl: { rejectUnauthorized: false }` in the Pool config when `NODE_ENV === 'production'`. Do NOT add `?ssl=true` to the connection string AND pass ssl object — they conflict.
**Warning signs:** Railway deploy logs show `Error: self-signed certificate in certificate chain` on first DB query.

### Pitfall 4: `@capacitor/*` Version Mismatch
**What goes wrong:** Some Capacitor features silently stop working or throw cryptic errors.
**Why it happens:** `@capacitor/core`, `@capacitor/android`, and all `@capacitor/*` plugins must share the same major version (currently 8.x). Mismatches cause runtime failures with no clear error.
**How to avoid:** When running `ionic capacitor add android`, verify all `@capacitor/*` packages in `package.json` share the same major version. Pin them if needed.
**Warning signs:** `ionic capacitor sync` prints warnings about version mismatches.

### Pitfall 5: `ng add @angular-eslint/schematics` Version Mismatch
**What goes wrong:** `ng add @angular-eslint/schematics` installs v21 (latest) which is incompatible with Angular 18.
**Why it happens:** `ng add` resolves to the global latest unless a version is specified. Angular-eslint major version must match Angular major version (Angular 18 → `@angular-eslint/schematics@18`).
**How to avoid:** Always specify the version: `ng add @angular-eslint/schematics@18`.
**Warning signs:** Peer dependency warnings after `ng add`; `ng lint` throws type errors.

### Pitfall 6: Missing `uploads/` Directory in Git
**What goes wrong:** `express.static('uploads')` or Multer fail on fresh checkout because the directory doesn't exist.
**Why it happens:** Git does not track empty directories. The `uploads/` folder is gitignored for its contents but the folder itself must exist.
**How to avoid:** Commit a `.gitkeep` file inside `backend/src/uploads/.gitkeep`. Add `backend/src/uploads/*` (not the folder) to `.gitignore`.

### Pitfall 7: Pool Instantiated Before dotenv Loads
**What goes wrong:** `DATABASE_URL` is `undefined` when `db.js` creates the Pool, so Railway connection string is missing.
**Why it happens:** `require('./config/db')` is called before `require('dotenv').config()` in module loading order.
**How to avoid:** Call `require('dotenv').config()` at the very top of `app.js` (first line, before any other requires). In Railway production, `dotenv` is a no-op (vars already set), so this is safe.

---

## Code Examples

Verified patterns from official sources and Railway documentation:

### Health Check Route
```javascript
// backend/src/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    data: { status: 'ok', timestamp: new Date().toISOString() },
    error: null,
    message: 'Service is healthy'
  });
});

module.exports = router;
```

### .env.example Template
```bash
# backend/.env.example
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/vibeapp
JWT_SECRET=your-secret-key-here
NODE_ENV=development
FCM_SERVER_KEY=your-fcm-server-key
```

### Backend package.json Scripts
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "migrate": "node src/config/migrate.js",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  }
}
```

### Root .gitignore
```gitignore
# Dependencies
node_modules/

# Environment
.env

# Build artifacts
dist/
www/
.angular/

# Capacitor
android/.gradle/
android/app/build/
android/build/
ios/

# Uploads (keep folder, ignore contents)
backend/src/uploads/*
!backend/src/uploads/.gitkeep
```

### Angular Standalone Health Check Component (verification only)
```typescript
// frontend/src/app/home/home.page.ts
import { Component, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>VIBE Health Check</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-button (click)="checkHealth()">Check Backend</ion-button>
      <p>Status: {{ status() }}</p>
    </ion-content>
  `
})
export class HomePage {
  private http = inject(HttpClient);
  status = signal<string>('not checked');

  checkHealth() {
    this.http.get(`${environment.apiUrl}/health`).subscribe({
      next: (res: any) => this.status.set(res.data.status),
      error: () => this.status.set('ERROR — check CORS')
    });
  }
}
```

### Railway Monorepo Configuration
In the Railway service settings (not a file):
- **Root Directory:** `/backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Watch Paths:** `/backend/**` (prevents frontend changes from triggering redeploys)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `express@4` as default | `express@5` is now `latest` on npm | October 2024 | Recommend pinning `express@4` for this project to avoid routing syntax gotchas |
| `@angular-eslint` eslintrc format | ESLint 9 flat config (`eslint.config.mjs`) | Angular-eslint v18 (2024) | `ng add @angular-eslint/schematics@18` sets up flat config automatically |
| FCM Legacy HTTP API | FCM v1 API via `firebase-admin` | June 2025 (shutdown) | Phase 5 concern; note it in `.env.example` from day one |
| Capacitor 5 | Capacitor 6 (8.x based on npm) | 2024 | All `@capacitor/*` packages must be `8.x` |

**Deprecated/outdated:**
- `body-parser` as separate package: Express 4.16+ includes `express.json()` and `express.urlencoded()` built-in. Do not install `body-parser`.
- `@ionic/angular` NgModule imports: In Ionic 8, use `@ionic/angular/standalone` for tree-shaking and standalone component compatibility.

---

## Open Questions

1. **Express 4 vs Express 5**
   - What we know: Express 5.2.1 is now `latest` on npm; Express 4.22.1 is `latest-4`. Express 5 has breaking routing syntax changes.
   - What's unclear: Whether the team has prior Express 5 experience or whether tutorials they follow target v4 or v5.
   - Recommendation: Pin `express@4` (`npm install express@4`) for this academic project to avoid routing syntax confusion and ensure tutorial compatibility.

2. **Railway Uploads Volume**
   - What we know: Railway disk is ephemeral — Multer uploads are wiped on every redeploy (noted in project memory).
   - What's unclear: Phase 1 only scaffolds the `/uploads` directory as static files. No uploads happen in Phase 1.
   - Recommendation: Document this risk in `CLAUDE.md` or `STATE.md` for Phase 2/3 when uploads begin. Consider Railway Volume in a future phase.

3. **SSL for local pg connection**
   - What we know: The conditional `ssl: { rejectUnauthorized: false }` only when `NODE_ENV === 'production'` pattern works. Local dev with a local Postgres instance does not need SSL.
   - What's unclear: If the developer uses Railway's public PostgreSQL URL for local dev (not a local instance), they will need SSL locally too.
   - Recommendation: The conditional on `NODE_ENV` is the correct pattern. Document in `.env.example` that local dev uses a local PostgreSQL or the public Railway URL with `NODE_ENV=development`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test framework detected — this is a greenfield project |
| Config file | Wave 0 must create: `backend/src/__tests__/` + basic smoke test |
| Quick run command | `node src/config/migrate.js && curl -s http://localhost:3000/health` (smoke only) |
| Full suite command | Manual: start backend, run `ionic serve`, open Android emulator, click health check button |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Backend binds to 0.0.0.0:PORT | smoke | `PORT=3001 node src/index.js &sleep 2 && curl -s http://localhost:3001/health && kill %1` | ❌ Wave 0 |
| FOUND-02 | PostgreSQL connects via DATABASE_URL | smoke | `node src/config/migrate.js` (fails fast if no DB connection) | ❌ Wave 0 |
| FOUND-03 | All tables created by migrate.js | smoke | `node src/config/migrate.js` (idempotent, verifies structure) | ❌ Wave 0 |
| FOUND-04 | CORS allows capacitor://localhost | manual | Start server, use `curl -H "Origin: capacitor://localhost"` to verify response headers | N/A |
| FOUND-05 | /uploads serves static files | smoke | `curl -s http://localhost:3000/uploads/.gitkeep` returns 200 | ❌ Wave 0 |
| FOUND-06 | GET /health returns 200 | smoke | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health` | ❌ Wave 0 |
| FOUND-07 | .env.example exists and lists all vars | manual | Review file exists and contains all required keys | N/A |
| FOUND-08 | Angular environments configured | manual | `ionic build --prod` completes; inspect built JS for Railway URL | N/A |
| QUAL-01 | ESLint + Prettier pass | automated | `cd backend && npx eslint src/` and `cd frontend && ng lint` | ❌ Wave 0 |
| QUAL-02 | API envelope format | manual | Review GET /health response shape: `{ data, error, message }` | N/A |
| QUAL-03 | Standalone components | automated | `ng lint` catches NgModule usage via `@angular-eslint` rules | ❌ Wave 0 |
| QUAL-04 | Signals for local state | manual | Code review — no automated enforcement | N/A |
| QUAL-05 | No console.error in prod | manual | Inspect production build output | N/A |

### Sampling Rate
- **Per task commit:** `node src/config/migrate.js` (backend tasks) or `ng lint` (frontend tasks)
- **Per wave merge:** Full smoke suite: backend up + `GET /health` 200 + lint clean
- **Phase gate:** Android emulator calls Railway health check without CORS errors before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/uploads/.gitkeep` — required for static file serving to work on fresh checkout
- [ ] `backend/.env.example` — required before any developer can run the backend
- [ ] `backend/src/config/db.js` — pg Pool singleton (all subsequent tasks depend on this)
- [ ] `backend/src/config/migrate.js` — all tables must exist before any backend feature work
- [ ] ESLint config: `backend/eslint.config.mjs` — linting must pass before Phase 2 begins
- [ ] Angular-eslint: `ng add @angular-eslint/schematics@18` in frontend — QUAL-01 requires this from day one

---

## Sources

### Primary (HIGH confidence)
- [Railway Express Deployment Guide](https://docs.railway.com/guides/express) — PORT binding, DATABASE_URL pattern, 0.0.0.0 requirement
- [Railway Monorepo Guide](https://docs.railway.com/guides/monorepo) — Root directory setting for backend subfolder, watch paths
- [Railway PostgreSQL Docs](https://docs.railway.com/databases/postgresql) — DATABASE_URL injection, SSL setup
- [Ionic CORS Troubleshooting](https://ionicframework.com/docs/troubleshooting/cors) — iOS `capacitor://localhost` vs Android `http://localhost` distinction
- [node-postgres official](https://node-postgres.com/) — Pool instantiation, SSL configuration
- [Ionic Blog: Understanding CORS in Ionic Apps](https://ionic.io/blog/understanding-cors-errors-in-ionic-apps) — Confirmed platform-specific origin values
- npm live version checks: `express@4.22.1`, `pg@8.20.0`, `cors@2.8.6`, `@capacitor/core@8.3.0`, `@ionic/angular@8.8.3`

### Secondary (MEDIUM confidence)
- [Railway Help Station — SSL issues](https://station.railway.com/questions/unable-to-connect-to-railway-postgres-fr-03e6edff) — `rejectUnauthorized: false` pattern confirmed by community + cross-verified with node-postgres SSL docs
- [angular-eslint GitHub README](https://github.com/angular-eslint/angular-eslint/blob/main/README.md) — Angular 18 requires `@angular-eslint@18`, not latest (v21)
- [Ionic Standalone Components Guide](https://ionic.zendesk.com/hc/en-us/articles/10386373742231-Angular-Standalone-Components-with-Ionic) — `@ionic/angular/standalone` import pattern
- [Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html) — Breaking changes documented; justification for recommending Express 4

### Tertiary (LOW confidence)
- Project memory file (`project_vibe.md`) — `null` origin needed for Capacitor edge cases — flagged for validation during CORS implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm view` live calls
- Architecture: HIGH — Railway and Ionic official docs consulted directly
- Pitfalls: HIGH (CORS, Railway binding) / MEDIUM (SSL pattern) — verified against official Railway and Capacitor docs
- CORS `null` origin: LOW — sourced from project memory only; validate during implementation

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable ecosystem; Capacitor and Ionic release cycles are ~6-month)
