# Technology Stack

**Analysis Date:** 2026-04-09

## Languages

**Primary:**
- JavaScript (ES6+) - Backend services (`/backend/src`)
- TypeScript 5.9.0 - Frontend application (`/frontend/src`)

**Secondary:**
- HTML/CSS - Angular templates and styles (`/frontend/src`)

## Runtime

**Environment:**
- Node.js - Used for backend (specified via `npm` in package.json)

**Package Manager:**
- npm - Version locked via `package-lock.json`
- Lockfile: Present in both `/backend/package-lock.json` and frontend via Angular CLI

## Frameworks

**Core:**
- Express.js 4.22.1 - HTTP API server (`/backend/src/app.js`, `/backend/src/index.js`)
- Angular 20.0.0 - Frontend SPA framework (`/frontend/package.json`)
- Ionic 8.0.0 - Mobile UI components (`/frontend/package.json`, `@ionic/angular`)
- Capacitor 8.3.0 - Native bridge for iOS/Android (`/frontend/capacitor.config.ts`)

**Real-time Communication:**
- Socket.io 4.8.3 - WebSocket server (`/backend/src/socket/index.js`)
- Socket.io-client 4.8.3 - WebSocket client (`/frontend/src/app/core/services/socket.service.ts`)

**Testing:**
- Karma 6.4.0 - Test runner (frontend)
- Jasmine 5.1.0 - Testing framework (frontend)

**Build/Dev:**
- Angular CLI 20.0.0 - Frontend build tooling
- Angular DevKit - Build system for Angular

## Key Dependencies

**Critical:**
- pg 8.20.0 - PostgreSQL client for database queries (`/backend/src/config/db.js`)
- express-validator 7.3.2 - Input validation middleware (`/backend/src/middleware/validate.js`)
- jsonwebtoken 9.0.3 - JWT authentication (`/backend/src/middleware/auth.middleware.js`, `/backend/src/services/auth.service.js`)
- bcryptjs 3.0.3 - Password hashing (`/backend/src/services/auth.service.js`)

**File Handling & Cloud Storage:**
- multer 2.1.1 - File upload middleware (`/backend/src/middleware/upload.js`)
- multer-storage-cloudinary 4.0.0 - Cloudinary storage adapter
- cloudinary 1.41.3 - Image/file upload service client

**Frontend HTTP & Storage:**
- RxJS 7.8.0 - Reactive programming library (Angular services)
- @angular/common/HttpClient - HTTP client for API calls
- @capacitor/preferences - Secure device storage for auth tokens (`/frontend/src/app/core/services/auth.service.ts`)

**Native Features:**
- @capacitor/core 8.3.0 - Capacitor core
- @capacitor/status-bar 8.0.2 - Device status bar control
- @capacitor/keyboard 8.0.2 - Virtual keyboard handling
- @capacitor/app 8.1.0 - App lifecycle management
- @capacitor/haptics 8.0.2 - Haptic feedback
- @capacitor/android 8.3.0 - Android native integration

**UI & Icons:**
- ionicons 7.0.0 - Icon library for Ionic

## Code Quality

**Linting:**
- ESLint 10.2.0 (backend), 9.16.0 (frontend) - Static code analysis
  - Backend: eslint.config.mjs with prettier integration
  - Frontend: .eslintrc.json with Angular/TypeScript plugins
- @angular-eslint suite - Angular-specific linting rules

**Formatting:**
- Prettier 3.8.1 - Code formatter
  - Configuration: `.prettierrc` at project root
  - Settings: 2-space tabs, single quotes, 100 char line width, trailing commas

**Backend Config:** `/backend/eslint.config.mjs`
- Enforces no-console warnings for non-log/warn
- Ignores unused args prefixed with `_`

**Frontend Config:** `/frontend/.eslintrc.json`
- Angular component suffixes: Page, Component
- Component selector prefix: `app` (kebab-case)
- Directive selector prefix: `app` (camelCase)

## Configuration

**Environment:**
- .env file (backend) - Runtime configuration
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `FCM_SERVER_KEY`, `CLOUDINARY_*`, `PORT`, `RENDER_EXTERNAL_URL`
- .env.example available at `/backend/.env.example`
- Angular environment files: `/frontend/src/environments/environment.ts` (dev), `/frontend/src/environments/environment.prod.ts` (production)

**Build:**
- TypeScript config: `/frontend/tsconfig.json`
  - Target: ES2022
  - Module: ES2020
  - Strict mode enabled
  - Angular Ivy compilation enabled
  
- Capacitor config: `/frontend/capacitor.config.ts`
  - App ID: `com.vibe.app`
  - App name: `VIBE`
  - Web dir: `www` (built output)
  - Android scheme: https

## Platform Requirements

**Development:**
- Node.js (backend)
- npm for dependency management
- Angular CLI for frontend scaffolding
- Capacitor CLI for native builds
- Modern browser for web dev (ng serve)

**Production:**
- Node.js runtime for backend API
- PostgreSQL database
- Cloudinary account for image/file storage
- Render.com deployment (indicated by RENDER_EXTERNAL_URL env var)
- iOS/Android devices or emulators for mobile apps

---

*Stack analysis: 2026-04-09*
