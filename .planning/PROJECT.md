# VIBE

## What This Is

VIBE is a mobile friend-discovery app built as an Android APK for a university final project, designed to portfolio-level professional standards. Instead of generic profiles, users express their current energy/mood (their "vibe"), making connections feel authentic and spontaneous. Two developers (Juan David + Renny) are delivering a full-stack real-time application with swipe-based discovery, live chat, and push notifications.

## Core Value

Two users who mutually like each other are instantly connected with a live chat — everything else (vibe status, match score, reactions, notifications) amplifies that core moment.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Auth & Profile**
- [ ] User can register with name, email, password, and profile photo (Multer upload)
- [ ] User can log in and receive a JWT stored in @capacitor/preferences
- [ ] User can view and edit their profile (name, bio, avatar, interests)
- [ ] Passwords hashed with bcrypt (salt rounds: 10)

**Vibe Status**
- [ ] User can set their current vibe from presets (Gaming / Music / Studying / Hang / Chill)
- [ ] Vibe is displayed as the hero element on discovery cards (more prominent than photo)
- [ ] Vibe change is persisted to DB with vibe_updated_at timestamp

**Friend Discovery**
- [ ] User sees a swipe card stack excluding self and existing relations
- [ ] Swipe right = like, swipe left = reject (Tinder-style gestures with overlay animations)
- [ ] When two users mutually like each other, friendship is confirmed and a chat is auto-created
- [ ] Discovery cards show match score ("72% compatible") based on interest overlap

**Real-time Chat**
- [ ] Accepted friends have a persistent chat room (Socket.io, rooms scoped to chat_id)
- [ ] User can send text messages with live delivery (no polling)
- [ ] User can send images in chat (Multer upload + display in bubble)
- [ ] Chat history loads from PostgreSQL on open

**Chat Features**
- [ ] Messages show read receipts (✓✓ grey = delivered, ✓✓ blue = read)
- [ ] Typing indicator shown in real time ("X is typing...")
- [ ] User can react to messages with emoji (👍 ❤️ 😂 😮), reactions synced via Socket.io

**Notifications**
- [ ] Push notifications delivered via Capacitor Push Notifications + FCM for: new friend request, request accepted, new message (background)
- [ ] In-app notifications panel with bell icon, unread count badge, and notification history

**Polish**
- [ ] Dark mode throughout (Ionic CSS variables)
- [ ] Generated avatar fallback (initials + deterministic color from name)
- [ ] Swipe animation: green overlay + ✓ right, red overlay + ✗ left

### Out of Scope

- Firebase Auth — professor requires hand-rolled JWT + bcrypt
- OAuth / third-party auth providers — same constraint
- localStorage for tokens — APK context requires @capacitor/preferences
- Expo / React Native — strictly Ionic 8 + Angular 18
- ORM — DB migrations run as a raw script (node src/config/migrate.js)
- ML-based match scoring — pure backend set-intersection logic only

## Context

- **Team:** Juan David + Renny, 2 developers
- **Deadline:** University semester delivery
- **Target device:** Physical Android device running APK connecting to Railway backend over HTTPS
- **Environments:** `development` → localhost:3000; `production` → Railway public URL baked into environment.prod.ts at APK build time
- **Definition of done per phase:** All endpoints tested in Postman (backend); feature functional on Android emulator or physical device (frontend); no console errors; code pushed to GitHub

## Constraints

- **Tech Stack**: Ionic 8 + Angular 18 + Capacitor (frontend); Node.js + Express + Socket.io (backend); PostgreSQL on Railway — non-negotiable per professor requirements
- **Auth**: Manual JWT + bcrypt only — no Firebase Auth, no OAuth
- **Token Storage**: @capacitor/preferences exclusively — never localStorage
- **File Storage**: Multer to Railway server disk (/uploads served as static)
- **DB**: PostgreSQL on Railway via DATABASE_URL — no local DB in production; no ORM
- **Deployment**: Railway for both backend and PostgreSQL; GitHub auto-deploy on push to main
- **Socket.io auth**: JWT passed in handshake.auth.token, verified before room join
- **API responses**: Uniform `{ data, error, message }` envelope
- **Angular style**: Standalone components (no NgModule where avoidable); signals preferred over RxJS
- **Code quality**: ESLint + Prettier from day 1; .env never committed (.env.example documents all vars)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ionic 8 + Angular 18 over React Native / Expo | Professor requirement + team familiarity | — Pending |
| Manual JWT + bcrypt over Firebase Auth | Professor explicitly requires hand-rolled auth | — Pending |
| Railway for PostgreSQL + backend | Simple single-platform deployment, free tier available | — Pending |
| Multer to disk over S3/Cloudinary | Simplicity for academic project; Railway disk is sufficient | — Pending |
| Socket.io over SSE/WebRTC | Best fit for chat rooms + typing + reactions pattern | — Pending |
| Angular signals over RxJS where applicable | Reduces boilerplate, aligns with Angular 18 direction | — Pending |
| No ORM — raw SQL migrations | Demonstrates DB fundamentals for academic evaluation | — Pending |

---
*Last updated: 2026-04-01 after initialization*
