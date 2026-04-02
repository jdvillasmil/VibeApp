# Feature Landscape

**Domain:** Friend-discovery / social-matching mobile app (swipe-based)
**Project:** VIBE
**Researched:** 2026-04-01
**Confidence:** MEDIUM — based on established domain patterns (Tinder, Bumble BFF, Friended, Yubo, Meetup) without live web verification due to tool restrictions

---

## Table Stakes

Features users expect in this genre. Missing = product feels incomplete or broken. These are the minimum bar before any differentiation matters.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Registration with photo upload | Identity without a face feels untrustworthy; users won't engage | Medium | VIBE has this (Multer). Avatar fallback for no-photo edge case also covered. |
| Login / session persistence | App that logs you out every cold-start is immediately deleted | Low | VIBE has JWT + @capacitor/preferences. |
| Profile with editable bio and interests | Users need to signal who they are before swiping begins | Low | VIBE has name, bio, avatar, interests. |
| Swipe-based discovery (right = like, left = skip) | Genre-defining gesture — users arrive expecting it | Medium | VIBE has this with correct overlay animations (green/red). |
| Mutual match → connection | The core reward loop. If liking doesn't lead anywhere, users churn | Low | VIBE auto-creates chat on mutual like. Correct. |
| Chat with matched connections | Without chat, "matching" is meaningless | Medium | VIBE has Socket.io chat. |
| Chat history persistence | Users expect to re-open a conversation and find it intact | Low | VIBE loads from PostgreSQL on open. |
| Unread message indicator | Users won't know when to return without a signal | Low | VIBE has badge + notification. |
| Push notifications for match + message | Background re-engagement; without it retention collapses | Medium | VIBE has FCM + Capacitor Push. |
| Block / report mechanism | Safety floor — app stores may reject without it; university audience makes this relevant | Low | NOT IN PROJECT.MD. See gap note below. |
| "No more profiles" empty state | Discovery deck runs out; users need feedback, not a blank screen | Low | Not explicitly called out in PROJECT.md. Low risk to add. |
| Loading and error states | Network failures on a mobile app over HTTPS to Railway will happen | Low | Not explicitly scoped but must exist at implementation. |

### Gap: Block / Report

This is the most significant table-stakes omission. Even for a portfolio/university project:
- App stores (Google Play) require a reporting mechanism for user-generated content.
- Without it, any user can be harassed with no recourse.
- Minimum viable implementation: a "Block user" option on a profile card that inserts a row into a `blocks` table and excludes them from discovery. No moderation queue needed for v1.
- Complexity: **Low** (one API endpoint + one DB table + filter in discovery query).

---

## Differentiators

Features that distinguish VIBE from generic swipe apps. These are the planned "vibe" mechanics — validated below against genre norms.

| Feature | Value Proposition | Complexity | Validated? | Notes |
|---------|-------------------|------------|------------|-------|
| Vibe status as hero element (Gaming / Music / Studying / Hang / Chill) | Shifts discovery from "who are you always" to "who are you right now" — reduces friction for introverts who find static profiles hard | Low | YES | This is genuinely differentiated. No major app in this genre makes current mood the primary filter. Correct to make it more prominent than photo. |
| Match score ("72% compatible") from interest overlap | Gives users a concrete reason to swipe right beyond photo attraction | Low | YES — with caveat | Simple set-intersection is fine for v1. The RISK is users treating a low number as a disqualifier. Consider displaying it as "interests in common: 3" instead of a percentage, which implies false precision. |
| Vibe-first card layout | Re-orders the visual hierarchy to emphasize state over identity | Low | YES | Good UX decision. Reinforces core value proposition. |
| Emoji reactions on messages | Adds expressiveness without requiring typing | Medium | YES — but deferred risk | WhatsApp-style reactions are now expected in any modern chat (table stakes sliding up). Manageable if scoped to 4 fixed emoji as planned. |
| Typing indicator | Reduces anxiety during live conversation | Low | YES | Standard in Socket.io patterns. Low complexity, high perceived quality. |
| Read receipts (delivered / read) | Closes the feedback loop on message state | Low | YES | Low complexity but requires careful UX — users sometimes find read receipts stressful. Fine for v1. |
| In-app notification panel | Keeps notification history visible inside the app | Low | YES — but low priority | FCM covers the critical path (re-engagement). The in-app panel is nice-to-have. If time-constrained, ship FCM first, panel second. |
| Dark mode | Expected on any mobile app in 2026 | Low | TABLE STAKES now | Ionic CSS variables make this nearly free. Correct to include. |
| Generated avatar fallback (initials + deterministic color) | Prevents broken-image states; makes no-photo profiles feel intentional | Low | YES | Small detail, high polish signal. Keep it. |

### Validation Summary for Planned Differentiators

- **Vibe status as primary discovery signal:** Genuinely novel, well-scoped, low-risk to implement. Keep as hero feature.
- **Match score:** Valid differentiator, but reframe as "X interests in common" rather than a percentage to avoid false precision and negative bias.
- **Chat polish (reactions, typing, receipts):** All appropriate. Reactions and receipts are becoming table stakes; including them is correct.
- **Notifications:** FCM is table stakes. The in-app panel is a differentiator; scope it as non-blocking.

---

## Anti-Features

Features to deliberately NOT build in v1. These are the classic over-engineering traps for this genre.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Undo last swipe ("super like" / rewind) | Adds state complexity (undo stack, cooldown logic, premium gating); zero value for a university project | Accept that swipes are final. Users adapt quickly. |
| Stories / ephemeral status (24h expiring content) | Requires S3 or equivalent, CDN, expiry jobs, complex UI — disproportionate build cost | Vibe status (non-expiring preset) covers the same intent at 10% of the cost. |
| Video in chat | Multer to Railway disk is not designed for video; file size, streaming, codecs all become problems fast | Images only. Explicitly out of scope. |
| Location-based discovery (geo proximity) | PostGIS or haversine queries, device location permissions, privacy implications — not needed for a university cohort app | University cohort is naturally co-located. Skip entirely. |
| ML / algorithmic matching | Explicitly out of scope per professor. Even if it were in scope, training data requires scale you don't have | Pure set-intersection is the right call. |
| Group chats / multi-user rooms | Doubles the complexity of chat architecture (fan-out, member management) | 1:1 only. Socket.io rooms scoped to chat_id is clean. |
| "Who viewed my profile" | Requires a separate view-events table, privacy considerations, and a notification type | Not valuable enough to justify the complexity for v1. |
| Infinite swipe history / "people I've seen" | Requires storing every swipe event for display purposes beyond the relation record | The `relations` table already records swipes. Exposing this as a UI feature adds no user value in v1. |
| Premium / freemium gating | Ads, subscriptions, feature locks — all scope-creep for an academic project | Ship a fully open app. |
| Email verification flow | Adds SMTP dependency, token expiry logic, and a multi-step registration flow | For a university cohort where fake emails are not a threat vector, skip. |
| Password reset / forgot password | Same as above — SMTP dependency, token logic | Out of scope for academic context. Add a note in the README that it's a known omission. |
| Settings page beyond profile edit | Notification preferences, privacy controls, account deletion — all valid eventually | Defer. Profile edit covers the minimum needed. |
| Paginated discovery with filters (age, distance, interest) | Filter UI, query complexity, and state management — not needed when the user pool is a classroom | Show all eligible users, let Vibe + match score do the sorting signal. |

---

## Feature Dependencies

These dependencies must be respected during phase planning. Building out of order causes rework.

```
Auth (register + login + JWT)
  → Profile (create/edit requires authenticated user)
    → Vibe Status (requires user record to attach vibe to)
      → Friend Discovery (requires profiles + vibe + interests to render cards)
        → Match logic (mutual like → friendship record)
          → Chat rooms (require friendship record to exist)
            → Real-time messaging (requires chat room)
              → Typing indicator (requires active socket room)
              → Read receipts (requires message records)
              → Emoji reactions (requires message records)

Push notifications (FCM token registration)
  → Notification triggers (require match logic + chat events upstream)
    → In-app notification panel (requires notification records in DB)

File upload (Multer middleware)
  → Profile photo upload (requires auth + file upload)
  → Chat image sending (requires chat room + file upload)

Block/report (recommended addition)
  → Discovery query (must filter blocked users from card stack)
  → Already depends on Auth only — can be added any time after Auth phase
```

---

## MVP Recommendation

### Must ship (no exceptions)

1. Auth + Profile (registration, login, photo, bio, interests)
2. Vibe Status (preset selection, hero display on card)
3. Friend Discovery (swipe stack, like/reject, mutual match)
4. 1:1 Chat (Socket.io, text messages, history from DB)
5. Push notifications via FCM (match + new message)
6. Dark mode (Ionic variables — nearly free, do not defer)
7. Block user (single endpoint + DB filter — required for app store compliance)

### Ship if time allows (high value, low cost)

8. Chat image sending (Multer already in stack; incremental effort)
9. Read receipts (low complexity, high perceived quality)
10. Typing indicator (low complexity, high perceived quality)
11. Emoji reactions (medium complexity — scope to 4 fixed emoji only)
12. In-app notification panel (nice-to-have; FCM covers the critical path)
13. Generated avatar fallback (trivial; ships with auth phase)

### Defer (explicitly out of scope)

- Undo swipe
- Stories / ephemeral content
- Video in chat
- Location-based discovery
- Group chats
- "Who viewed my profile"
- Email verification / password reset
- Premium features
- Filter / search in discovery

---

## V1 Mistake Patterns (Genre-Specific)

Based on established patterns in Tinder-style and friend-discovery apps, the following mistakes are most common and most costly:

### Over-building traps

**Match algorithm complexity.** Teams spend weeks on ML-based compatibility scoring when set-intersection of interests works identically from a user's perspective at v1 scale. VIBE correctly avoids this.

**Real-time over-engineering.** Polling → SSE → WebSockets is a natural progression. Jumping to WebSockets (Socket.io) from day one is only justified if chat is a primary feature. In VIBE's case it IS a primary feature, so this is correct — but teams often add socket complexity to screens that don't need it (discovery, profile).

**File upload scope creep.** Starting with "images only" and then adding video mid-build. Railway disk + Multer is not a media platform. VIBE's constraint (images only, disk storage) is the right call.

**Notification over-scoping.** Building 8 notification types when 2 (match + message) drive 95% of re-engagement. VIBE has the right 2 types. Do not add more in v1.

### Under-building traps

**No block/report mechanism.** The single most common omission in social app v1s. App store rejection risk. See gap noted above.

**No empty states.** Discovery runs out of cards. Chat loads with no messages. Profile has no photo. Each of these needs a designed state, not a blank screen or console error.

**Optimistic UI skipped.** Sending a message and waiting for the server round-trip before showing it in the bubble feels broken. Socket.io makes optimistic rendering easy — show the message immediately, confirm on server ACK.

**No connection loss handling.** Socket.io disconnects on mobile (background, network switch). Without reconnection logic and a "reconnecting..." indicator, chat feels unreliable. Capacitor apps are especially prone to this due to the WebView lifecycle.

**JWT expiry not handled.** 401 responses that silently fail instead of redirecting to login. Users get stuck with a dead session. An HTTP interceptor in Angular that catches 401s and routes to `/login` is a one-time, low-effort implementation.

---

## Sources

**Confidence note:** Web search and Context7 tools were unavailable during this research session. All findings are based on:
- Training knowledge of Tinder, Bumble BFF, Friended, Yubo, Meetup, and similar apps (patterns as of training cutoff August 2025)
- Direct analysis of PROJECT.md feature set against genre conventions
- Established mobile app development patterns for Socket.io, Capacitor, and FCM

**Confidence levels:**
- Table stakes identification: HIGH (genre patterns are stable and well-established)
- Differentiator validation: HIGH (comparison against known app landscape)
- Anti-feature recommendations: HIGH (common over-engineering patterns are well-documented)
- Complexity estimates: MEDIUM (estimates based on standard implementations; actual complexity depends on team experience with specific technologies)
- Block/report gap: HIGH (Google Play policy is well-known; the implementation pattern is standard)

**Recommend verifying:**
- Current Google Play Developer Policy on user reporting requirements (policy may have updated)
- Socket.io reconnection behavior with Capacitor WebView on Android (version-specific quirks possible)
