# Research Summary: VIBE

**Domain:** Mobile friend-discovery app (swipe + match + real-time chat + push notifications)
**Researched:** 2026-04-01
**Overall confidence:** MEDIUM (architecture and patterns HIGH; exact package versions LOW — require npm verification before project init)

---

## Executive Summary

VIBE is a well-scoped academic project with a fixed, non-negotiable tech stack. The domain (swipe-based social matching + real-time chat) is mature: Tinder-like apps have solved the core patterns, and the chosen stack (Ionic + Angular + Capacitor + Socket.io + PostgreSQL) maps directly to those patterns with no exotic requirements.

The biggest technical risk is not the product logic but infrastructure gotchas specific to this stack combination: APK CORS origin (`capacitor://localhost`), Railway's ephemeral disk wiping uploaded files on every deploy, FCM Legacy API shutdown (must use v1 via `firebase-admin`), and Railway requiring `0.0.0.0` binding. Each of these is silent-failure territory — the app appears to work in local dev and breaks only on the physical device or first Railway deployment.

The second risk area is the Capacitor/Angular version alignment. Capacitor 6 must match `@capacitor/android` and all `@capacitor/` plugins at the same major version. A mismatch (e.g., `@capacitor/core@6` + `@capacitor/push-notifications@5`) silently breaks push registration. All versions should be verified against npm before initializing the project.

The architecture is straightforward: a single-backend Express server handles both REST (auth, profiles, discovery, uploads) and WebSocket (chat, typing, reactions) via Socket.io on the same HTTP server. PostgreSQL holds all persistent state. The frontend is a standard Ionic tab-based SPA with Angular Router. No microservices, no message queue, no CDN — appropriate for academic scope.

---

## Key Findings

**Stack:** Ionic 8 + Angular 18 standalone components + Capacitor 6 on frontend; Express 4 + Socket.io 4 + pg (node-postgres) on backend; PostgreSQL on Railway.

**Architecture:** Single Express server (REST + Socket.io), single PostgreSQL database, no ORM, JWT auth everywhere (HTTP Authorization header + Socket.io handshake.auth.token).

**Critical pitfall:** `capacitor://localhost` must be in Express CORS `origin` array — omitting it causes silent 403 failures on every API call from the physical Android device.

---

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation** — Project scaffolding, environment config, Railway wiring
   - Addresses: `capacitor.config.ts`, `environment.prod.ts`, CORS, DATABASE_URL, PORT binding, migration script
   - Avoids: Discovering CORS/Railway issues mid-feature work
   - Research flag: Verify all package versions at project init (`npm view`)

2. **Auth & Profile** — Registration, login, JWT, profile CRUD, avatar upload
   - Addresses: bcrypt, JWT sign/verify, `@capacitor/preferences` token storage, Multer setup
   - Avoids: Retrofitting auth middleware onto existing endpoints
   - Research flag: Confirm `bcrypt` native build on Railway (fallback: `bcryptjs`)

3. **Vibe Status + Discovery** — Vibe presets, swipe card stack, like/reject, match detection
   - Addresses: Match score (set-intersection), swipe gesture (Ionic gesture API or HammerJS)
   - Avoids: Complex ML; pure SQL intersection is the right scope

4. **Real-time Chat** — Socket.io rooms, message persistence, read receipts, typing indicator, emoji reactions
   - Addresses: Socket.io JWT middleware, room join on match, message CRUD in PostgreSQL
   - Avoids: Polling; all state transitions via Socket.io events
   - Research flag: Socket.io + Railway WebSocket proxy timeout (use `transports: ['websocket']`)

5. **Push Notifications** — FCM registration, Capacitor push plugin, backend send via firebase-admin
   - Addresses: FCM v1 via `firebase-admin`, token storage in users table, foreground/background handling
   - Avoids: FCM Legacy API (shut down June 2025); must use v1
   - Research flag: FCM v1 service account setup; Capacitor push on physical device vs emulator

6. **Polish** — Dark mode, generated avatar fallback, swipe animations, in-app notification panel
   - Addresses: Ionic CSS variables for dark mode, Angular animations API for swipe overlays
   - No deep research needed; standard Ionic/Angular patterns

**Phase ordering rationale:**
- Foundation first: CORS + Railway + DB connection errors block all subsequent phases
- Auth before features: Every feature endpoint requires `req.user`; retrofit is expensive
- Discovery before Chat: Chat rooms are created by the match event; match logic must exist first
- Push last: Non-blocking feature; adds background delivery to already-working in-app flow
- Polish last: No blocking dependencies; visual layer on top of working functionality

**Research flags for phases:**
- Phase 1 (Foundation): Confirm exact package versions via `npm view` before scaffolding
- Phase 4 (Chat): Test Socket.io WebSocket transport through Railway proxy on physical device early
- Phase 5 (Push): FCM v1 service account JSON must be obtained from Firebase Console; cannot be generated programmatically

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Architecture patterns HIGH; exact versions need npm verification |
| Features | HIGH | Domain is well-understood; swipe/match/chat patterns are stable |
| Architecture | HIGH | Single-server Express + Socket.io on same HTTP instance is documented pattern |
| Pitfalls | HIGH | CORS, Railway disk, FCM v1, PORT binding are documented, reproducible issues |

---

## Gaps to Address

- **Exact package versions:** All versions in STACK.md marked [VERIFY]. Run `npm view <package> version` for each before `npm install`.
- **Ionic gesture API vs HammerJS:** Ionic 8 provides `GestureController`; HammerJS may have been removed. Verify gesture approach for swipe cards at Phase 3.
- **Railway disk persistence:** Free tier wipes uploads on deploy. If professor reviews via live demo, schedule demo on a stable deployment or use Railway volumes. Evaluate before Phase 2 completion.
- **Socket.io + Railway proxy timeout:** Railway reverse proxy has a 30-second timeout on HTTP. WebSocket upgrade must succeed before that window. Forcing `transports: ['websocket']` is the mitigation; test on physical device in Phase 4.
- **Capacitor emulator vs physical device for push:** FCM push does not work on Android emulator without Google Play Services. Push testing requires a physical device or a properly configured emulator image. Note for Phase 5.
