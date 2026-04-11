# Codebase Structure

**Analysis Date:** 2026-04-09

## Directory Layout

```
VibeApp/
├── backend/                           # Express.js Node server
│   ├── src/
│   │   ├── index.js                  # Server entry point (HTTP + WebSocket)
│   │   ├── app.js                    # Express app configuration
│   │   ├── config/
│   │   │   ├── db.js                 # PostgreSQL pool setup
│   │   │   └── migrate.js            # Database migration script
│   │   ├── routes/
│   │   │   ├── health.js             # GET /health (liveness probe)
│   │   │   ├── auth.js               # POST /auth/register, /login
│   │   │   ├── users.js              # GET /users/me, PATCH /users/me
│   │   │   ├── discovery.js          # GET /discovery, POST /friendships
│   │   │   └── chats.js              # GET /chats, /chats/:id/messages, POST /chats/:id/images
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # register(), login()
│   │   │   ├── users.controller.js   # getProfile(), updateProfile()
│   │   │   ├── discovery.controller.js # discover(), friendship(), getFriends()
│   │   │   └── chats.controller.js   # getChats(), getMessages(), uploadImage(), saveMessage()
│   │   ├── services/
│   │   │   ├── auth.service.js       # register(), login(), signToken()
│   │   │   ├── users.service.js      # getProfile(), updateProfile()
│   │   │   ├── discovery.service.js  # getDiscoverUsers(), likeUser(), rejectUser(), getFriends(), updateVibe()
│   │   │   └── chats.service.js      # getChats(), getMessages(), saveMessage(), markRead()
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # verifyToken() — Bearer token validation
│   │   │   ├── upload.js             # uploadAvatar — Cloudinary multipart middleware
│   │   │   └── validate.js           # Input validation schemas
│   │   ├── socket/
│   │   │   └── index.js              # Socket.io event handlers (join_chat, send_message, typing, etc.)
│   │   └── uploads/                  # Static folder for file serving (.gitkeep only)
│   ├── package.json
│   └── node_modules/
│
├── frontend/                          # Angular + Ionic web/mobile app
│   ├── src/
│   │   ├── main.ts                   # Bootstrap entry point
│   │   ├── index.html                # HTML shell
│   │   ├── app/
│   │   │   ├── app.component.ts      # Root component (standalone)
│   │   │   ├── app.routes.ts         # Route definitions
│   │   │   ├── app-routing.module.ts # (legacy, may not be used)
│   │   │   ├── core/                 # Singleton services, guards, interceptors
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth.service.ts       # Login, register, getProfile, token management
│   │   │   │   │   └── socket.service.ts    # Socket.io wrapper with observables
│   │   │   │   ├── guards/
│   │   │   │   │   └── auth.guard.ts        # authGuard, guestGuard
│   │   │   │   └── interceptors/
│   │   │   │       └── auth.interceptor.ts  # Attaches Bearer token to HTTP requests
│   │   │   ├── pages/                # Feature pages (routable components)
│   │   │   │   ├── login/
│   │   │   │   │   └── login.page.ts         # Email/password login form
│   │   │   │   ├── register/
│   │   │   │   │   └── register.page.ts      # Signup with avatar upload
│   │   │   │   ├── tabs/
│   │   │   │   │   └── tabs.page.ts          # Main navigation shell (protected route)
│   │   │   │   ├── discover/
│   │   │   │   │   └── discover.page.ts      # Swipe card stack (like/reject)
│   │   │   │   ├── friends-list/
│   │   │   │   │   └── friends-list.page.ts  # Accepted matches
│   │   │   │   ├── chat-list/
│   │   │   │   │   └── chat-list.page.ts     # Open chats
│   │   │   │   ├── chat-room/
│   │   │   │   │   └── chat-room.page.ts     # Single chat with real-time messages
│   │   │   │   ├── profile/
│   │   │   │   │   └── profile.page.ts       # User profile edit
│   │   │   │   └── home/
│   │   │   │       └── home.page.ts          # (initial page, may not be used)
│   │   │   └── shared/                       # Reusable components
│   │   │       └── components/
│   │   │           ├── avatar/
│   │   │           │   └── avatar.component.ts # User avatar display
│   │   │           └── swipe-card/
│   │   │               └── swipe-card.component.ts # Card for discover page
│   │   ├── environments/
│   │   │   ├── environment.ts         # Development API URL
│   │   │   └── environment.prod.ts    # Production API URL
│   │   ├── polyfills.ts               # Browser polyfills
│   │   └── styles/                    # Global styles
│   ├── package.json
│   ├── angular.json                   # Angular CLI config
│   ├── tsconfig.json                  # TypeScript config
│   └── node_modules/
│
└── .planning/                         # Project planning documents
    ├── codebase/                      # Architecture/structure docs
    ├── phases/                        # Execution phases
    └── ROADMAP.md                     # Project roadmap
```

## Directory Purposes

**backend/src/config:**
- Purpose: Centralized database and migration setup
- Contains: pg Pool instance, migration runner
- Key files: `db.js`, `migrate.js`

**backend/src/routes:**
- Purpose: HTTP endpoint definitions and middleware chaining
- Contains: Router definitions that mount controllers and middleware
- Key files: All route files organize by feature (auth, users, discovery, chats)

**backend/src/controllers:**
- Purpose: HTTP request handlers that orchestrate services
- Contains: req/res handling, response formatting, error handling
- Key files: One per feature domain

**backend/src/services:**
- Purpose: Reusable business logic (queries, mutations, validation)
- Contains: Database queries, domain logic, error throwing
- Key files: One per feature domain

**backend/src/middleware:**
- Purpose: Pluggable request/response transformers
- Contains: Auth verification, file upload, input validation
- Key files: `auth.middleware.js`, `upload.js`, `validate.js`

**backend/src/socket:**
- Purpose: WebSocket event handling for real-time features
- Contains: Socket.io event listeners and broadcasters
- Key files: `index.js` (main handler)

**frontend/src/app/core:**
- Purpose: Singleton services and route guards for app-wide concerns
- Contains: Auth logic, socket management, HTTP interception
- Key files: `services/auth.service.ts`, `services/socket.service.ts`, `guards/auth.guard.ts`, `interceptors/auth.interceptor.ts`

**frontend/src/app/pages:**
- Purpose: Feature pages that map to routes
- Contains: Smart components with state management via signals
- Key files: One per page (discover, chat-room, login, register, profile, etc.)

**frontend/src/app/shared/components:**
- Purpose: Reusable presentational components
- Contains: Dumb components that accept @Input/@Output
- Key files: `swipe-card/`, `avatar/`

## Key File Locations

**Entry Points:**
- Backend: `backend/src/index.js` — HTTP + Socket.io server
- Frontend: `frontend/src/main.ts` — Angular bootstrap
- Database: `backend/src/config/db.js` — PostgreSQL pool
- Routes: `backend/src/app.js` — Express router mount

**Configuration:**
- Backend env: `.env` (not in repo, set in deployment)
- Frontend env: `frontend/src/environments/environment.ts` and `environment.prod.ts`
- Backend DB: `backend/src/config/db.js`
- Frontend routing: `frontend/src/app/app.routes.ts`

**Core Logic:**
- Auth: `backend/src/services/auth.service.js`, `frontend/src/app/core/services/auth.service.ts`
- Discovery/Matching: `backend/src/services/discovery.service.js`, `frontend/src/app/pages/discover/discover.page.ts`
- Chat/Messaging: `backend/src/services/chats.service.js`, `backend/src/socket/index.js`, `frontend/src/app/pages/chat-room/chat-room.page.ts`
- Socket: `backend/src/socket/index.js`, `frontend/src/app/core/services/socket.service.ts`

**Testing:**
- Frontend unit tests: `frontend/src/**/*.spec.ts` (Jasmine/Karma)
- Backend: No test files found

## Naming Conventions

**Files:**
- Services: `{feature}.service.js` or `.ts` (e.g., `auth.service.js`)
- Controllers: `{feature}.controller.js` (e.g., `auth.controller.js`)
- Routes: `{feature}.js` or `{feature}.ts` (e.g., `auth.js`, `app.routes.ts`)
- Pages: `{feature}.page.ts` (e.g., `login.page.ts`)
- Components: `{name}.component.ts` (e.g., `swipe-card.component.ts`)
- Guards: `{name}.guard.ts` (e.g., `auth.guard.ts`)
- Interceptors: `{name}.interceptor.ts` (e.g., `auth.interceptor.ts`)

**Directories:**
- Feature-based: `routes/`, `controllers/`, `services/` organize by feature
- Structural: `core/` for singletons, `pages/` for routable, `shared/` for reusable
- Function-based: `middleware/`, `socket/`, `config/` by purpose

## Where to Add New Code

**New Feature (Backend):**
1. Add route: `backend/src/routes/{feature}.js` — mount on `app.js`
2. Add controller: `backend/src/controllers/{feature}.controller.js` — handlers
3. Add service: `backend/src/services/{feature}.service.js` — queries and logic
4. Add middleware (if needed): `backend/src/middleware/{feature}.js`
5. Test via REST client or Postman

**New Feature (Frontend):**
1. Add page: `frontend/src/app/pages/{feature}/{feature}.page.ts` — routable component
2. Add route entry: `frontend/src/app/app.routes.ts` — lazy load component
3. Inject AuthService/SocketService as needed from `core/services/`
4. Add to navigation in TabsPage or other navigation component

**New Reusable Component (Frontend):**
1. Create directory: `frontend/src/app/shared/components/{component-name}/`
2. Create component: `{component-name}.component.ts` — standalone with @Input/@Output
3. Import in pages that need it
4. Keep presentation logic minimal, pass data via signals

**New Service (Backend):**
1. Create file: `backend/src/services/{feature}.service.js`
2. Export functions (not class-based)
3. Each function queries `pool` from `../config/db`
4. Throw errors with `.status` property for controller handling

**Utilities (Backend):**
- Shared helpers: `backend/src/utils/` (not yet created, create if needed)

## Special Directories

**backend/src/uploads/:**
- Purpose: Static folder for serving uploaded files
- Generated: No (contains only .gitkeep)
- Committed: Yes (.gitkeep ensures folder persists)
- Note: Cloudinary is primary storage; this is fallback only

**frontend/src/environments/:**
- Purpose: Environment-specific config (API URLs)
- Generated: No
- Committed: Yes (no secrets, only API URLs)
- Switching: `environment.ts` for dev, `environment.prod.ts` for production

**backend/node_modules/, frontend/node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (from package.json)
- Committed: No (.gitignore)

**.planning/:**
- Purpose: GSD planning documents (roadmap, phases, architecture analysis)
- Generated: By GSD system
- Committed: Yes (planning artifacts)
