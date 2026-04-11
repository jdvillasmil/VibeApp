# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Layered monolithic architecture with separation into Express backend and Angular frontend, connected via REST API and WebSocket for real-time features.

**Key Characteristics:**
- REST API for CRUD operations (auth, users, discovery, chats)
- WebSocket (Socket.io) layer for real-time messaging and notifications
- JWT-based authentication with Bearer token flow
- Client-side token storage in Capacitor preferences (mobile)
- Service-based business logic isolation

## Layers

**Backend HTTP Endpoints (Express):**
- Purpose: Handle stateless REST API requests for all CRUD operations
- Location: `backend/src/routes/`, `backend/src/controllers/`
- Contains: Route definitions and request handlers
- Depends on: Middleware (auth, validation), services, database
- Used by: Frontend via HttpClient, mobile via Capacitor WebView

**Backend Services (Business Logic):**
- Purpose: Encapsulate domain logic away from HTTP concerns
- Location: `backend/src/services/`
- Contains: `auth.service.js`, `users.service.js`, `discovery.service.js`, `chats.service.js`
- Depends on: Database pool
- Used by: Controllers, Socket event handlers

**Backend Middleware:**
- Purpose: Cross-cutting concerns for all requests
- Location: `backend/src/middleware/`
- Contains: Auth token verification, file upload via Cloudinary, input validation
- Depends on: jwt, multer, express-validator
- Used by: Routes

**WebSocket Layer (Real-time):**
- Purpose: Handle persistent connections for instant messaging and presence
- Location: `backend/src/socket/index.js`
- Contains: Socket.io connection handler with JWT verification
- Depends on: jwt, chats service
- Used by: Client Socket.io connections

**Database Layer:**
- Purpose: PostgreSQL connection pool and migrations
- Location: `backend/src/config/db.js`, `backend/src/config/migrate.js`
- Contains: pg Pool initialization with SSL for production
- Depends on: pg package
- Used by: All services via parameterized queries

**Frontend Core Layer (Guards, Interceptors, Services):**
- Purpose: Centralized authentication, HTTP configuration, socket management
- Location: `frontend/src/app/core/`
- Contains:
  - `guards/auth.guard.ts`: authGuard (protect app routes), guestGuard (protect public routes)
  - `interceptors/auth.interceptor.ts`: Attaches Bearer token to all HTTP requests
  - `services/auth.service.ts`: Login/register/profile/token management
  - `services/socket.service.ts`: Socket.io connection wrapper with event subjects
- Depends on: Angular HttpClient, Capacitor Preferences, Socket.io-client
- Used by: Pages, components

**Frontend Pages (Smart Components):**
- Purpose: Route-aware containers that manage page state and user interactions
- Location: `frontend/src/app/pages/`
- Contains: discover, chat-room, chat-list, friends-list, profile, login, register
- Depends on: Core services, HttpClient, Socket service
- Used by: Router

**Frontend Shared Components:**
- Purpose: Reusable UI components
- Location: `frontend/src/app/shared/components/`
- Contains: SwipeCardComponent (Tinder-like card), AvatarComponent
- Depends on: Angular core
- Used by: Pages

## Data Flow

**User Registration Flow:**
1. User submits form with name, email, password, optional avatar to `/auth/register`
2. Frontend multipart form includes optional avatar file
3. Backend middleware (`uploadAvatar`) uploads to Cloudinary, returns URL or null
4. `auth.controller.register()` calls `authService.register()`
5. Service hashes password with bcrypt, inserts user into DB, returns user object
6. Controller signs JWT (payload: {id, email}), returns user + token
7. Frontend stores token in Capacitor preferences, sets `isAuthenticated` signal
8. Frontend redirects to `/tabs/discover`

**Discovery (Swipe) Flow:**
1. DiscoverPage loads on init, calls `GET /discovery`
2. Backend service `getDiscoverUsers()` excludes current user and anyone already swiped
3. Returns 20 random users (safe fields only: id, name, avatar_url, bio, interests, vibe)
4. Frontend renders SwipeCardComponent with user stack
5. User swipes left (reject) or right (like)
6. Frontend calls `POST /friendships` with {userId, action: 'like'|'reject'}
7. If action='like', service checks for mutual match:
   - No match: Creates friendship record with status='pending'
   - Mutual match found: Updates both friendships to 'accepted', creates chat room
8. If matched, backend emits 'new_match' event via Socket.io to both users
9. Frontend subscribes to socket.newMatch$ and shows toast

**Chat Message Flow (Real-time):**
1. ChatRoomPage initializes: loads message history, joins Socket room, marks as read
2. User types: `onTyping()` emits 'typing' event via socket (debounced)
3. After 2s idle: emits 'stop_typing' event
4. User sends message: `send()` emits 'send_message' via socket with {chatId, body}
5. Socket handler verifies membership, calls `chatsService.saveMessage()`
6. Service inserts message into DB, returns enriched message with sender info
7. Socket broadcasts 'new_message' to all users in that chat room
8. All connected clients subscribe to socket.newMessage$ and append message
9. On message receive from other user: `markRead()` calls socket.read_messages
10. Socket updates DB: sets read_at timestamp for unread messages from others
11. Socket broadcasts 'messages_read' event back to sender
12. Sender updates UI: sets read_at on messages, shows double checkmark

**Image Upload in Chat:**
1. User clicks image button, selects file
2. `onImgSelected()` uploads via `POST /chats/{id}/images` with FormData
3. Backend middleware uploads to Cloudinary, controller saves message with imageUrl
4. Frontend receives message, emits via socket.send_image
5. Same flow as text: broadcast to room, mark read

**State Management:**
- **Auth state:** Token stored in Capacitor preferences (secure mobile storage), decoded client-side to extract {id, email}
- **Page state:** Angular signals (reactive, client-side)
- **Socket state:** Observable subjects (newMessage$, typingEvent$, etc.)
- **Server state:** PostgreSQL database (single source of truth)

## Key Abstractions

**AuthService:**
- Purpose: Manages auth flow and token lifecycle
- Examples: `frontend/src/app/core/services/auth.service.ts`
- Pattern: Injectable singleton, async methods returning promises via firstValueFrom

**SocketService:**
- Purpose: Abstracts Socket.io connection details, exposes typed observables
- Examples: `frontend/src/app/core/services/socket.service.ts`
- Pattern: Singleton with public observables (newMessage$, typingEvent$, etc.), internal socket reference

**Service Layer (Backend):**
- Purpose: Business logic isolation, reusable by controllers and socket handlers
- Examples: `backend/src/services/auth.service.js`, `backend/src/services/discovery.service.js`
- Pattern: Exported functions that query DB pool, throw errors with .status property for controller error handling

**Controllers:**
- Purpose: HTTP request/response mapping
- Examples: `backend/src/controllers/auth.controller.js`, `backend/src/controllers/discovery.controller.js`
- Pattern: Async functions with req, res parameters, uniform response shape {data, error, message}

## Entry Points

**Backend Server:**
- Location: `backend/src/index.js`
- Triggers: `npm start` or `npm run dev`
- Responsibilities:
  - Create HTTP server
  - Initialize Socket.io with CORS and auth middleware
  - Attach io instance to req.io for controllers
  - Register socket event handlers
  - Listen on PORT (default 3000)

**Backend Express App:**
- Location: `backend/src/app.js`
- Triggers: Required by index.js
- Responsibilities:
  - Configure CORS (Capacitor origins, localhost, RENDER_EXTERNAL_URL for production)
  - Parse JSON/form data
  - Serve static uploads/ folder
  - Mount routes (/health, /auth, /users, /discovery, /chats)
  - Global error handler

**Frontend Bootstrap:**
- Location: `frontend/src/main.ts`
- Triggers: `ng serve` or build
- Responsibilities:
  - Bootstrap AppComponent in standalone mode
  - Provide routing (preload all modules)
  - Provide IonicAngular configuration
  - Provide HttpClient with authInterceptor
  - Setup RouteReuseStrategy for Ionic

**Frontend Root Component:**
- Location: `frontend/src/app/app.component.ts`
- Triggers: Bootstrapped by main.ts
- Responsibilities:
  - Render root <ion-app> and <ion-router-outlet>
  - No business logic (presentational only)

## Error Handling

**Strategy:** Errors with .status property bubble from services → controllers, which format as uniform response shape. Socket errors emit 'error' events.

**Patterns:**
- Service throws: `const err = new Error('message'); err.status = 400; throw err;`
- Controller catches: Check err.status, respond with appropriate HTTP code, uniform {data: null, error, message}
- Socket error: Emit error event back to client (non-blocking)
- HTTP Interceptor: No special error handling (passes through to components)
- Guard errors: Redirect via router.createUrlTree() (no throw)

## Cross-Cutting Concerns

**Logging:** 
- Backend: console.log/console.error in services and controllers (non-structured)
- Frontend: None (no logging service)

**Validation:**
- Backend: express-validator in routes (request sanitization), service-level checks (likeUser validates requesterId !== addresseeId)
- Frontend: Angular form validation in pages (reactive checks), no dedicated validation layer

**Authentication:**
- Backend: Middleware verifies Bearer token, sets req.user = {id, email}
- Frontend: Guards check Capacitor token, interceptor attaches Bearer header
- Socket: Auth middleware on connection (same JWT verification)
