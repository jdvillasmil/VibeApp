# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services

**Image/File Storage:**
- Cloudinary - Image upload and transformation service
  - SDK/Client: `cloudinary` v1.41.3, `multer-storage-cloudinary` v4.0.0
  - Auth: Environment variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - Configuration: `/backend/src/middleware/upload.js`
  - Folders: `vibe/avatars` (user profiles), `vibe/chat` (chat images)
  - Transformations: Avatar images cropped to 400x400px
  - Allowed formats: JPG, PNG, WebP (avatars); JPG, PNG, WebP, GIF (chat images)

**Push Notifications (Firebase Cloud Messaging):**
- FCM - Firebase Cloud Messaging for push notifications
  - Auth: `FCM_SERVER_KEY` environment variable
  - Status: Configured but implementation in controllers/services not yet detailed

## Data Storage

**Databases:**
- PostgreSQL - Primary relational database
  - Connection: `DATABASE_URL` environment variable
  - Client: `pg` v8.20.0 (Node.js PostgreSQL client)
  - Configuration: `/backend/src/config/db.js`
  - SSL: Enabled in production (NODE_ENV === 'production'), disabled in development
  - Pool error handling: Logs unexpected pool errors

**Local File Storage:**
- Local filesystem - For uploaded files before/during processing
  - Directory: `/backend/src/uploads` (exists as .gitkeep placeholder)
  - Served via: Express.static at `/uploads` route (`/backend/src/app.js`)
  - Dotfiles allowed for serving .gitkeep file

**Caching:**
- Not detected - No Redis or in-memory cache integration

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `/backend/src/middleware/auth.middleware.js`, `/backend/src/services/auth.service.js`
  - Token generation: jsonwebtoken v9.0.3
  - Expiration: 7 days
  - Secret: `JWT_SECRET` environment variable
  - Storage (frontend): @capacitor/preferences - Secure device storage (`/frontend/src/app/core/services/auth.service.ts`)
  
**Authentication Flow:**
- Backend: Bearer token in `Authorization` header (`Authorization: Bearer <token>`)
- Frontend: Token stored in Capacitor preferences, attached to HTTP requests via HttpClient interceptor (implicit via services)
- Socket.io: Token passed via `auth.token` in handshake (`/backend/src/socket/index.js`)

**Password Security:**
- bcryptjs v3.0.3 - Password hashing with salt rounds: 10

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Console-based logging
  - Backend: `console.log()`, `console.warn()` calls throughout services
  - Frontend: Angular default console logging via RxJS
  - Key logs: Database connection status, socket events, auth attempts

## CI/CD & Deployment

**Hosting:**
- Render.com - Backend deployment
  - Public URL: `RENDER_EXTERNAL_URL` environment variable
  - CORS configured for: `process.env.RENDER_EXTERNAL_URL` (`/backend/src/index.js`, `/backend/src/app.js`)

**Frontend Deployment:**
- Capacitor-built native apps (iOS/Android)
- Web version: Built output to `www/` directory (ng build)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar workflow files found

## Environment Configuration

**Required env vars (Backend):**
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:password@host:port/dbname`)
- `JWT_SECRET` - Secret key for signing/verifying JWTs
- `NODE_ENV` - Environment mode (development/production)
- `FCM_SERVER_KEY` - Firebase Cloud Messaging server key
- `CLOUDINARY_CLOUD_NAME` - Cloudinary account cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `RENDER_EXTERNAL_URL` - Public backend URL (production)

**Frontend Environment Config:**
- `/frontend/src/environments/environment.ts` - Development
  - `apiUrl: 'http://localhost:3000'`
  - `production: false`
  
- `/frontend/src/environments/environment.prod.ts` - Production
  - `apiUrl: 'https://vibeapp-backend.onrender.com'`
  - `production: true`

**Secrets location:**
- Backend: `.env` file (git-ignored via .gitkeep reference)
- Frontend: No secrets stored; uses environment build-time configuration
- Secure token storage: Capacitor preferences API (device-level secure storage)

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints for external services

**Outgoing:**
- Socket.io events emitted to connected clients
  - `new_message` - New chat message event (`/backend/src/socket/index.js`)
  - `typing` - User typing indicator
  - `stop_typing` - User stopped typing
  - `messages_read` - Messages marked as read
  - `new_match` - Match notifications (not fully detailed in socket setup)

## CORS Configuration

**Allowed Origins:**
- `capacitor://localhost` - iOS Capacitor WebView
- `http://localhost` - Android Capacitor WebView
- `http://localhost:8100` - Ionic serve dev server
- `http://localhost:4200` - Angular CLI dev server
- `process.env.RENDER_EXTERNAL_URL` - Production backend public URL

**Credentials:** Allowed (cookies/auth headers permitted)

**Configuration Files:**
- `/backend/src/app.js` - Express CORS middleware
- `/backend/src/index.js` - Socket.io CORS settings

## API Endpoints

**Available Routes:**
- `GET /health` - Health check
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update current user profile
- `POST /users/:id/avatar` - Upload user avatar (via multer)
- `/chats` - Chat management endpoints
- `POST /chats/:id/images` - Upload chat images (via multer)
- `/discovery` - User discovery/matching endpoints

**Response Format:**
- Standardized envelope: `{ data, error, message }`
- HTTP 401: Unauthorized
- HTTP 500: Server errors

---

*Integration audit: 2026-04-09*
