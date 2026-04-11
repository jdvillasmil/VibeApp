# Requirements: VIBE

**Defined:** 2026-04-01
**Core Value:** Two users who mutually like each other are instantly connected with a live chat

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Backend Express app starts and binds to `0.0.0.0:process.env.PORT` (Railway compatible)
- [x] **FOUND-02**: PostgreSQL connection established via `DATABASE_URL` environment variable
- [x] **FOUND-03**: All DB tables created via migration script (`node src/config/migrate.js`)
- [x] **FOUND-04**: CORS configured to allow `capacitor://localhost`, `http://localhost:8100`, and Railway frontend origin
- [x] **FOUND-05**: `/uploads` directory served as static files
- [x] **FOUND-06**: `GET /health` returns 200 with service status
- [x] **FOUND-07**: `.env.example` documents all required environment variables; `.env` is gitignored
- [x] **FOUND-08**: Angular environments configured (`environment.ts` → localhost, `environment.prod.ts` → Railway URL)

### Authentication

- [x] **AUTH-01**: User can register with name, email, password, and optional profile photo (Multer upload)
- [x] **AUTH-02**: Passwords are hashed with bcrypt (salt rounds: 10) before storage
- [x] **AUTH-03**: User can log in with email/password and receive a JWT
- [x] **AUTH-04**: JWT is stored in `@capacitor/preferences` (never localStorage)
- [x] **AUTH-05**: JWT verify middleware protects all non-public endpoints
- [x] **AUTH-06**: Angular HTTP interceptor attaches JWT to all API requests (async Preferences pattern)
- [x] **AUTH-07**: Angular route guard redirects unauthenticated users to login

### Profile

- [x] **PROF-01**: User can view their own profile (name, bio, avatar, interests, vibe status)
- [x] **PROF-02**: User can update their profile (name, bio, interests)
- [x] **PROF-03**: User can upload a new avatar photo (replaces existing)
- [x] **PROF-04**: User without an uploaded avatar sees a generated fallback (initials + deterministic color from name)

### Vibe Status

- [ ] **VIBE-01**: User can set their current vibe from 5 presets (Gaming / Music / Studying / Hang / Chill)
- [ ] **VIBE-02**: Vibe change is persisted to DB with `vibe_updated_at` timestamp
- [ ] **VIBE-03**: Vibe status is displayed as the hero element on discovery cards (more visually prominent than photo)
- [ ] **VIBE-04**: User can update their vibe at any time via profile or quick-access UI

### Discovery

- [ ] **DISC-01**: User sees a swipe card stack of other users (excludes self and existing friendship relations)
- [ ] **DISC-02**: Discovery cards show: vibe status (hero), avatar, name, interests in common count (e.g., "3 interests in common")
- [ ] **DISC-03**: Swiping right registers a "like"; swiping left registers a "reject"
- [ ] **DISC-04**: When two users mutually like each other, a friendship is confirmed and a chat is automatically created between them
- [ ] **DISC-05**: Swipe gesture shows green overlay + ✓ icon when swiping right, red overlay + ✗ icon when swiping left
- [ ] **DISC-06**: Empty state is shown when no more discovery cards are available

### Friends

- [ ] **FREN-01**: User can view their friends list (accepted friendships)
- [ ] **FREN-02**: User can see pending incoming friend requests

### Chat

- [ ] **CHAT-01**: User can see a list of all their chats (one per matched friend)
- [ ] **CHAT-02**: User can open a chat and see full message history (loaded from PostgreSQL)
- [ ] **CHAT-03**: User can send a text message; recipient receives it in real time via Socket.io (no polling)
- [ ] **CHAT-04**: Socket.io connects after login using JWT in `handshake.auth.token`; disconnects on logout
- [ ] **CHAT-05**: Messages are persisted to PostgreSQL before being broadcast to the room
- [ ] **CHAT-06**: User can send an image in chat (Multer upload + displayed in message bubble)
- [ ] **CHAT-07**: Messages show read receipts (✓✓ grey = delivered, ✓✓ blue = read when recipient opens chat)
- [ ] **CHAT-08**: Typing indicator shows "X is typing..." in real time; disappears when typing stops
- [ ] **CHAT-09**: Socket.io event handlers run inside Angular NgZone to trigger change detection

### Notifications

- [x] **NOTF-01**: App saves device FCM token to backend on login (`POST /users/me/fcm-token`)
- [x] **NOTF-02**: Push notification is sent via FCM v1 API (`firebase-admin`) when a user receives a new friend request
- [x] **NOTF-03**: Push notification is sent when a friend request is accepted (mutual match)
- [x] **NOTF-04**: Push notification is sent when a new message arrives while app is in background
- [x] **NOTF-05**: Notifications are persisted in the `notifications` DB table
- [x] **NOTF-06**: In-app notification panel shows notification history list with unread count badge on bell icon
- [x] **NOTF-07**: Notifications are marked as read when the panel is opened

### APK & Deployment

- [ ] **APK-01**: Android APK built with `ionic capacitor build android --prod` targeting Railway URLs via `environment.prod.ts`
- [ ] **APK-02**: APK connects to Railway backend over HTTPS (no HTTP cleartext traffic)
- [ ] **APK-03**: Backend auto-deploys to Railway on push to `main` branch
- [ ] **APK-04**: Railway environment variables set: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `FCM_SERVER_KEY`
- [ ] **APK-05**: APK is installable and functional on a physical Android device

### Code Quality

- [x] **QUAL-01**: ESLint + Prettier configured and passing from day one
- [x] **QUAL-02**: All API responses use `{ data, error, message }` envelope format
- [x] **QUAL-03**: Angular uses standalone components (no NgModule where avoidable)
- [x] **QUAL-04**: Angular signals used in preference to RxJS for local state
- [x] **QUAL-05**: No `console.error` in production builds

## v2 Requirements

### Social Safety
- **SAFE-01**: User can block another user (blocked users don't appear in discovery)
- **SAFE-02**: User can report a user for inappropriate behavior

### Chat Enhancements
- **CHAT-10**: Message reactions (👍 ❤️ 😂 😮) — stored in DB, synced via Socket.io, long-press emoji picker
- **CHAT-11**: Message search within a conversation

### Discovery Enhancements
- **DISC-07**: Filter discovery by vibe status (show only users in "Gaming mode", etc.)
- **DISC-08**: Location-based discovery radius

### Auth Enhancements
- **AUTH-08**: Password change from profile settings
- **AUTH-09**: Account deletion

## Out of Scope

| Feature | Reason |
|---------|--------|
| Firebase Auth / OAuth | Professor explicitly requires hand-rolled JWT + bcrypt |
| React Native / Expo | Stack is non-negotiable: Ionic 8 + Angular 18 |
| ORM (TypeORM, Prisma, etc.) | Raw SQL migrations required to demonstrate DB fundamentals |
| localStorage for tokens | APK context requires @capacitor/preferences (localStorage not available) |
| ML-based match scoring | Pure set-intersection logic; ML is out of scope for academic project |
| iOS build / App Store | Android APK only; iOS requires Mac + Apple Developer account |
| Video messages | Storage/bandwidth costs; out of scope for academic delivery |
| Real-time chat polling fallback | Socket.io WebSocket only (`transports: ['websocket']`) |
| CDN for file storage | Multer to Railway disk; evaluate volumes if needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| FOUND-08 | Phase 1 | Complete |
| QUAL-01 | Phase 1 | Complete |
| QUAL-02 | Phase 1 | Complete |
| QUAL-03 | Phase 1 | Complete |
| QUAL-04 | Phase 1 | Complete |
| QUAL-05 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| AUTH-07 | Phase 2 | Complete |
| PROF-01 | Phase 2 | Complete |
| PROF-02 | Phase 2 | Complete |
| PROF-03 | Phase 2 | Complete |
| PROF-04 | Phase 2 | Complete |
| VIBE-01 | Phase 3 | Pending |
| VIBE-02 | Phase 3 | Pending |
| VIBE-03 | Phase 3 | Pending |
| VIBE-04 | Phase 3 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| DISC-05 | Phase 3 | Pending |
| DISC-06 | Phase 3 | Pending |
| FREN-01 | Phase 3 | Pending |
| FREN-02 | Phase 3 | Pending |
| CHAT-01 | Phase 4 | Pending |
| CHAT-02 | Phase 4 | Pending |
| CHAT-03 | Phase 4 | Pending |
| CHAT-04 | Phase 4 | Pending |
| CHAT-05 | Phase 4 | Pending |
| CHAT-06 | Phase 4 | Pending |
| CHAT-07 | Phase 4 | Pending |
| CHAT-08 | Phase 4 | Pending |
| CHAT-09 | Phase 4 | Pending |
| NOTF-01 | Phase 5 | Complete |
| NOTF-02 | Phase 5 | Complete |
| NOTF-03 | Phase 5 | Complete |
| NOTF-04 | Phase 5 | Complete |
| NOTF-05 | Phase 5 | Complete |
| NOTF-06 | Phase 5 | Complete |
| NOTF-07 | Phase 5 | Complete |
| APK-01 | Phase 6 | Pending |
| APK-02 | Phase 6 | Pending |
| APK-03 | Phase 6 | Pending |
| APK-04 | Phase 6 | Pending |
| APK-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 57 total (note: initial count of 51 was incorrect — actual count per requirements list is 57)
- Mapped to phases: 57
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 — traceability expanded to individual requirement rows; QUAL-01 to QUAL-05 formally assigned to Phase 1 (established at foundation, enforced throughout)*
