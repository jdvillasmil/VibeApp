# Roadmap: VIBE

## Overview

VIBE is delivered in 6 phases that mirror the natural dependency chain of the product. Foundation comes first to eliminate infrastructure surprises before any feature work. Auth unlocks every protected endpoint. Vibe status and discovery deliver the core match moment. Real-time chat makes that moment valuable. Push notifications extend the experience to the background. Polish and APK build complete the submission-ready product.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Backend Foundation** - Project scaffolding, Render deployment, DB migration, CORS verified, code quality baseline
- [ ] **Phase 2: Auth & Profile** - Registration, login, JWT, profile CRUD, avatar upload
- [ ] **Phase 3: Vibe Status + Discovery** - Vibe presets, swipe card stack, like/reject, mutual match, friends list
- [ ] **Phase 4: Real-time Chat** - Socket.io rooms, message persistence, read receipts, typing indicator
- [ ] **Phase 5: Push Notifications** - FCM registration, background push, in-app notification panel
- [ ] **Phase 6: APK & Polish** - Production APK build, dark mode, swipe animations, device validation

## Phase Details

### Phase 1: Backend Foundation
**Goal**: The backend and frontend scaffolds are connected, the database is migrated, and the development pipeline is operational — no feature work is blocked by infrastructure unknowns
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05
**Success Criteria** (what must be TRUE):
  1. `GET /health` returns 200 from both localhost and the Railway public URL
  2. The Angular app running on the emulator successfully calls the backend without CORS errors (capacitor://localhost origin accepted)
  3. `node src/config/migrate.js` runs without errors and all tables exist in PostgreSQL
  4. ESLint and Prettier pass with zero errors on a fresh checkout
  5. `.env.example` lists every required variable; no `.env` file is committed to git
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Backend scaffold: Express server, pg Pool, migration, health route, CORS, static files, ESLint
- [x] 01-02-PLAN.md — Frontend scaffold: Ionic + Angular 20 standalone, environment files, Capacitor Android, Angular ESLint
- [x] 01-03-PLAN.md — Integration verification: Render deploy, migration, Android emulator CORS checkpoint

### Phase 2: Auth & Profile
**Goal**: Users can create accounts, authenticate securely, and manage their profiles — every protected endpoint is usable
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, PROF-01, PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. A new user can register with name, email, password, and optional photo; the uploaded photo is served from /uploads
  2. A registered user can log in, receive a JWT stored in @capacitor/preferences, and be redirected to the main app
  3. An unauthenticated user navigating to a protected route is redirected to login
  4. A logged-in user can view and edit their profile (name, bio, interests) and upload a new avatar
  5. A user without an uploaded avatar sees a generated fallback with their initials and a deterministic background color
**Plans**: TBD

### Phase 3: Vibe Status + Discovery
**Goal**: Users can express their current vibe and discover other users through swipe gestures — a mutual like creates a confirmed friendship and chat room
**Depends on**: Phase 2
**Requirements**: VIBE-01, VIBE-02, VIBE-03, VIBE-04, DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, FREN-01, FREN-02
**Success Criteria** (what must be TRUE):
  1. A user can select one of 5 vibe presets and see it immediately reflected on their profile and discovery card
  2. Swiping right shows a green overlay with a check icon; swiping left shows a red overlay with an X icon
  3. When user A likes user B and user B has already liked user A, both users' friends lists update and a chat room is auto-created
  4. Discovery cards show the vibe status as the most visually prominent element along with avatar, name, and interest overlap count
  5. An empty state screen is shown when the discovery stack is exhausted
**Plans**: TBD

### Phase 4: Real-time Chat
**Goal**: Matched friends can exchange text and image messages in real time with no polling — all state changes (delivery, read, typing) are Socket.io events
**Depends on**: Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09
**Success Criteria** (what must be TRUE):
  1. Opening the chat list shows all matched friends; tapping a friend opens the conversation with full message history
  2. A sent message appears instantly in the recipient's open chat without page refresh or polling
  3. Sending an image in chat displays it as a bubble in the conversation for both users
  4. When a message is read by the recipient, the sender's receipt indicators change from grey to blue
  5. When one user is typing, the other user sees "X is typing..." disappear within two seconds of typing stopping
**Plans**: TBD

### Phase 5: Push Notifications
**Goal**: Users receive push notifications for key social events when the app is in the background, and can review notification history in-app
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07
**Success Criteria** (what must be TRUE):
  1. A device FCM token is saved to the backend on login and updated when it changes
  2. A physical Android device receives a push notification when another user sends a friend request, when a match is confirmed, and when a message arrives while the app is backgrounded
  3. Opening the in-app notification panel shows the full notification history list with unread count on the bell icon
  4. All unread notifications are marked as read after opening the panel
**Plans**: TBD

### Phase 6: APK & Polish
**Goal**: The app is built as a production APK pointing to Railway, installs on a physical Android device, and presents a polished dark-mode UI
**Depends on**: Phase 5
**Requirements**: APK-01, APK-02, APK-03, APK-04, APK-05
**Success Criteria** (what must be TRUE):
  1. `ionic capacitor build android --prod` produces an APK that installs and runs on a physical Android device
  2. All API calls from the installed APK use HTTPS; no cleartext HTTP traffic is observed
  3. The backend auto-deploys to Railway on push to the main branch with all required environment variables set
  4. The entire app renders in dark mode with consistent styling across all screens via Ionic CSS variables
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 4/4 | Complete   | 2026-04-09 |
| 2. Auth & Profile | 0/TBD | Not started | - |
| 3. Vibe Status + Discovery | 0/TBD | Not started | - |
| 4. Real-time Chat | 0/TBD | Not started | - |
| 5. Push Notifications | 0/TBD | Not started | - |
| 6. APK & Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-04-01*
*Updated: 2026-04-08 — Phase 1 plans defined (3 plans, 2 waves)*
