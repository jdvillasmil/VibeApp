# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:**
- Backend controllers: `[resource].controller.js` (e.g., `auth.controller.js`, `users.controller.js`)
- Backend services: `[resource].service.js` (e.g., `auth.service.js`, `chats.service.js`)
- Backend middleware: descriptive name with `.js` (e.g., `auth.middleware.js`, `validate.js`, `upload.js`)
- Backend routes: `[resource].js` (e.g., `auth.js`, `users.js`)
- Angular pages: `[name].page.ts` and `[name].page.html` (e.g., `home.page.ts`, `login.page.ts`)
- Angular components: `[name].component.ts` and `[name].component.html` (e.g., `swipe-card.component.ts`)
- Angular services: `[name].service.ts` (e.g., `auth.service.ts`, `socket.service.ts`)
- Angular modules: `[name].module.ts` (e.g., `app.module.ts`, `home.module.ts`)
- Test files: `[name].spec.ts` or `[name].component.spec.ts` (e.g., `app.component.spec.ts`)

**Functions:**
- Use camelCase: `getMe`, `updateAvatar`, `startTyping`, `verifyToken`
- Async functions use async/await pattern without suffix (e.g., `register`, not `registerAsync`)
- Handlers/controllers are named by action: `register`, `login`, `updateMe`, `getMe`
- Private methods prefixed with underscore: `_setupGesture` (though in modern Angular, `private` keyword is used instead)

**Variables:**
- camelCase for all variables and constants: `authHeader`, `passwordHash`, `offsetX`, `likeOpacityVal`
- Constants in UPPERCASE with underscores if multi-word: `TOKEN_KEY`, `CORS_ORIGINS`, `JWT_SECRET`, `VIBE_CONFIG`
- DB column names in snake_case: `avatar_url`, `password_hash`, `created_at`, `vibe_updated_at`
- Destructured parameters follow camelCase: `{ email, password }`, `{ name, bio, interests }`

**Types:**
- Backend has minimal TypeScript usage (only in config files)
- Frontend uses TypeScript with strict mode enabled (`strict: true` in tsconfig.json)
- Interfaces defined with `export interface [Name]` format (e.g., `export interface SwipeUser`, `export interface ChatMessage`)
- Component class names suffixed with `Component` or `Page` (enforced by ESLint)
- Service class names suffixed with `Service` (convention, not enforced)

## Code Style

**Formatting:**
- Tool: Prettier v3.8.1
- Semi-colons: enabled (`semi: true`)
- Quote style: single quotes (`singleQuote: true`)
- Print width: 100 characters (`printWidth: 100`)
- Trailing commas: ES5 style (`trailingComma: "es5"`)
- Tab width: 2 spaces (`tabWidth: 2`)
- Configuration file: `.prettierrc` at project root

**Linting:**

*Backend:*
- Tool: ESLint v10.2.0 (flat config format, eslint.config.mjs)
- Enforces Prettier formatting via `eslint-plugin-prettier`
- Rule: `prettier/prettier: 'error'` — treats Prettier violations as linting errors
- Rule: `no-console: ['warn', { allow: ['log', 'warn'] }]` — allows `console.log()` and `console.warn()` but disallows others
- Rule: `no-unused-vars: ['error', { argsIgnorePattern: '^_' }]` — unused parameters prefixed with `_` are allowed
- Commands: `npm run lint`, `npm run lint:fix`

*Frontend:*
- Tool: ESLint v9.16.0 with Angular ESLint plugin v20.0.0
- Config file: `.eslintrc.json`
- Enforces component selector style: `app-` prefix in kebab-case (e.g., `app-swipe-card`)
- Enforces component class suffix: `Component` or `Page` suffix required
- Enforces directive selector style: `app` prefix in camelCase
- Extends `@angular-eslint/recommended` and template plugin rules
- Command: `ng lint`

## Import Organization

**Order (Backend, JavaScript):**
1. Node.js built-in modules (`require('http')`, `require('path')`)
2. Third-party packages (`require('express')`, `require('bcryptjs')`)
3. Local files (`require('../services/auth.service')`, `require('../config/db')`)

**Order (Frontend, TypeScript):**
1. Angular core imports (`import { Component } from '@angular/core'`)
2. Angular feature/library imports (`import { HttpClient } from '@angular/common/http'`)
3. RxJS imports (`import { firstValueFrom } from 'rxjs'`)
4. Capacitor imports (`import { Preferences } from '@capacitor/preferences'`)
5. Third-party (socket.io, etc.)
6. Local services (`import { AuthService } from '../services/auth.service'`)
7. Local components
8. Environment config (`import { environment } from '../../environments/environment'`)

**Path Aliases:**
- Frontend uses `baseUrl: "./"` in tsconfig.json (no path aliases defined)
- Relative paths used throughout: `../services/auth.service`, `../../environments/environment`

## Error Handling

**Backend Patterns:**
- Controllers use try-catch blocks with consistent JSON response format
- Service functions throw errors with optional `.status` property for HTTP status codes
- Error response format: `{ data: null, error: 'ERROR_CODE', message: 'User message' }`
- Common status codes: 400 (validation), 401 (unauthorized), 404 (not found), 409 (conflict), 500 (server error)
- Example from `users.service.js`:
  ```javascript
  if (result.rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  ```

**Frontend Patterns:**
- Services use `firstValueFrom()` to convert observables to promises for cleaner async/await
- Components use `.subscribe({ next, error })` pattern for side effects
- Error handling in `HttpClient` requests shown in `home.page.ts`:
  ```typescript
  this.http.get(...).subscribe({
    next: (res) => this.status.set(res.data.status),
    error: () => this.status.set('ERROR — check CORS or backend'),
  });
  ```
- No explicit error types defined; errors logged or displayed as user messages

## Logging

**Framework:** `console` object directly

**Patterns:**
- Logging used for development/debugging, not in error handling
- Backend logs with context prefix: `console.log('[register] ERROR:', err)`, `console.log('[auth.service.register] called with email:', email)`
- Warnings for unhandled errors: `console.warn('Unhandled error:', err.message)`
- Common practice: log sensitive operations (registration, login) with identifying info
- No structured logging library (winston, pino, etc.)
- Console output includes socket connections and server startup messages

## Comments

**When to Comment:**
- Route endpoint descriptions: `// POST /auth/register — multipart form with optional avatar file`
- Complex logic explanations: `// interests may arrive as a JSON string when sent via FormData`
- Configuration explanations: `// CORS — must include both Capacitor origins (iOS and Android differ)`
- Environment-specific behavior: `// dotfiles: 'allow' required so Express serves .gitkeep (dotfiles are denied by default)`
- Architecture notes: `// Attach io to every request so controllers can emit events`
- Guard documentation in Angular: `/** Blocks unauthenticated users — redirects to /login */`

**JSDoc/TSDoc:**
- Used selectively in Angular services and guards
- Format: `/** [Description] */` for single-line documentation
- Example from `auth.guard.ts`:
  ```typescript
  /**
   * Decode JWT payload without verification (server already verified it).
   * Returns { id, email } from the token claims, or null if no token.
   */
  async getTokenPayload(): Promise<{ id: number; email: string } | null>
  ```
- Not consistently applied across all functions; more common in Angular files than backend

## Function Design

**Size:**
- Typical functions 5-50 lines
- Single responsibility principle observed
- Controllers keep logic minimal; delegate to services
- Example: `register()` in `auth.controller.js` (~40 lines) handles request parsing and error response, delegates to `authService.register()`

**Parameters:**
- Functions accept destructured objects: `register({ name, email, password, avatarUrl })`
- Backend controller handlers receive `(req, res)` standard Express pattern
- Angular services receive simple parameters or objects
- Optional parameters handled explicitly: `{ name, bio, interests }` with undefined checks

**Return Values:**
- Backend controllers: always return `res.status(code).json(...)` with consistent format
- Backend services: return data objects or throw errors (no null returns)
- Frontend services: return promises from `firstValueFrom()` or direct HTTP observables
- React signals used in Angular components for state: `signal<string>('not checked')`

## Module Design

**Exports:**
- Backend uses CommonJS: `module.exports = { functionName1, functionName2 }`
- Frontend uses ES6: `export class ComponentName` or `export interface InterfaceName`
- Services exported as classes with injectable decorator: `@Injectable({ providedIn: 'root' })`

**Barrel Files:**
- Not extensively used in this codebase
- Each feature module (auth, users, chats) has separate route, controller, service files
- No index files aggregating exports for folders

**File Organization:**
- Backend follows MVC-like pattern: routes → controllers → services
- Routes define endpoints and middleware
- Controllers handle HTTP logic (request parsing, responses)
- Services contain business logic and database queries
- Middleware handles cross-cutting concerns (auth, validation, file upload)
- Frontend follows Angular feature module structure: pages grouped by feature with their services and components
