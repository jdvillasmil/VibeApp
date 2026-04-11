# Codebase Concerns

**Analysis Date:** 2026-04-09

## Security Considerations

**JWT Token Not Refreshed in Frontend:**
- Risk: JWT tokens are signed with 7-day expiration (`/backend/src/services/auth.service.js:32`), but frontend has no refresh mechanism. After 7 days, users must re-login, leading to poor UX.
- Files: `frontend/src/app/core/services/auth.service.ts`, `backend/src/services/auth.service.js`
- Current mitigation: Token stored in Capacitor Preferences (secure on mobile)
- Recommendations: Implement refresh token pattern with refresh endpoint and auto-refresh logic in HTTP interceptor (`frontend/src/app/core/interceptors/auth.interceptor.ts`)

**JWT Payload Decoded Client-Side Without Validation:**
- Risk: Frontend decodes JWT payload via `atob()` at `/frontend/src/app/core/services/auth.service.ts:44` without verifying signature. This is acceptable for reading claims (server already verified), but could be fragile if token format changes.
- Files: `frontend/src/app/core/services/auth.service.ts:37-49`
- Current mitigation: Server verifies token signature; client-side decode is read-only
- Recommendations: Add explicit error handling for malformed tokens; consider storing decoded payload separately after login instead of decoding every time

**CORS Configuration with Broad Origins:**
- Risk: CORS allows `'http://localhost'` and `'http://localhost:8100'` globally, plus dynamic `RENDER_EXTERNAL_URL`. In production, if `RENDER_EXTERNAL_URL` is misconfigured, unauthorized origins could access API.
- Files: `backend/src/app.js:10-25`, `backend/src/index.js:7-13`
- Current mitigation: Credentials: true requires explicit origin match
- Recommendations: Validate `RENDER_EXTERNAL_URL` at startup; consider moving allowed origins to separate config file; add logging for rejected CORS requests

**No Input Validation on Interests Field:**
- Risk: `interests` field in user profile accepts arbitrary arrays without length/content limits. A malicious client could send gigantic arrays causing memory/DB issues.
- Files: `backend/src/controllers/users.controller.js:16-26`, `backend/src/routes/users.js`
- Current mitigation: None
- Recommendations: Add express-validator rules for interests array max length (e.g., 5-10 items, each < 50 chars)

**Database SSL Config in Production:**
- Risk: `backend/src/config/db.js:10` uses `rejectUnauthorized: false` in production for PostgreSQL SSL, which defeats certificate validation and is vulnerable to MITM attacks.
- Files: `backend/src/config/db.js`
- Current mitigation: None
- Recommendations: Use proper SSL certificates; set `rejectUnauthorized: true` in production; only disable for development with explicit env var

## Tech Debt

**No Request Input Validation Framework:**
- Issue: Backend uses `express-validator` (installed in `package.json:22`) but most routes don't validate inputs. Controllers rely on manual checks (e.g., `friendships/:userId` parsing at `discovery.controller.js:24-27`).
- Files: `backend/src/routes/*`, `backend/src/controllers/*`
- Impact: Easy to miss edge cases; inconsistent error messages; potential injection vulnerabilities
- Fix approach: Create validation schemas using `express-validator` chain API in each route; standardize error responses

**Socket.io Error Handling Silent Failures:**
- Issue: Socket event handlers catch errors and emit generic 'error' event (`backend/src/socket/index.js:45-46, 60-62`), but don't log details. Server logs errors to console only if unexpected.
- Files: `backend/src/socket/index.js`
- Impact: Difficult to debug user issues; errors silently fail without user feedback beyond generic message
- Fix approach: Add structured logging (e.g., winston or pino) with request IDs; emit detailed error types to client; add Sentry/error tracking integration

**No Logging Framework:**
- Issue: Codebase uses `console.log/console.error` scattered throughout. No structured logging, log levels, or log rotation.
- Files: All backend files
- Impact: Production debugging is difficult; no audit trail; logs mixed with stdout (can't separate by level or component)
- Fix approach: Install `winston` or `pino`; replace all console calls; add request ID correlation; configure rotation and retention

**Password Reset Not Implemented:**
- Issue: Users can register and login, but have no way to reset forgotten passwords. No password reset endpoint or email service integration.
- Files: `backend/src/services/auth.service.js`, `backend/src/routes/auth.js`
- Impact: Users permanently locked out if they forget password; customer support burden
- Fix approach: Create password reset flow with email verification; store reset tokens with expiration; implement rate limiting on reset requests

**Test Coverage Zero:**
- Issue: No test files found in codebase. Backend has no unit/integration tests. Frontend has test scaffolding (`frontend/karma.conf.js`) but no actual tests.
- Files: None (coverage gap)
- Impact: Refactoring is risky; regressions likely; integration bugs missed; deployment confidence low
- Fix approach: Set up Jest for backend; add unit tests for services and controllers (start with auth); implement integration tests for socket events

## Performance Bottlenecks

**Discovery Query No Pagination:**
- Problem: `/discovery` endpoint at `backend/src/services/discovery.service.js:6-22` returns up to 20 random users with no offset/limit parameters. Scales poorly as user base grows.
- Files: `backend/src/services/discovery.service.js:6-22`, `backend/src/controllers/discovery.controller.js:3-10`
- Cause: Simple LIMIT 20 hardcoded; no cursor-based or offset pagination
- Improvement path: Add `offset` and `limit` query params; implement cursor-based pagination for better performance at scale

**Chat Messages Query Returns Last 200 Without Pagination:**
- Problem: `getMessages()` at `backend/src/services/chats.service.js:37-50` fetches last 200 messages per chat. For chat-heavy users, this is slow and wastes bandwidth.
- Files: `backend/src/services/chats.service.js:37-50`
- Cause: Hardcoded LIMIT 200; no pagination UI integration
- Improvement path: Implement infinite scroll with cursor pagination; add message date filtering (e.g., last 7 days default)

**Chat List Query with Subquery on Every Row:**
- Problem: `getChats()` at `backend/src/services/chats.service.js:15-35` uses nested subquery to count unread messages for each chat. This N+1-like issue scales poorly with number of chats.
- Files: `backend/src/services/chats.service.js:15-35`
- Cause: Subquery in SELECT for unread count
- Improvement path: Use window functions (`COUNT(*) OVER()`) or separate query; add database indexes on `messages(chat_id, read_at, sender_id)`

**No Database Indexes:**
- Problem: Migration script at `backend/src/config/migrate.js` creates tables but no indexes on foreign keys or frequently queried fields.
- Files: `backend/src/config/migrate.js`
- Cause: Migration only does CREATE TABLE IF NOT EXISTS, no CREATE INDEX
- Improvement path: Add indexes on: `friendships(requester_id, addressee_id)`, `messages(chat_id, created_at)`, `users(email)` for login

**Avatar Upload No Optimization:**
- Problem: Cloudinary storage at `backend/src/middleware/upload.js:16` resizes to 400x400 for avatars, but frontend doesn't request optimized formats (webp, srcset).
- Files: `backend/src/middleware/upload.js`, frontend avatar component
- Cause: Cloudinary transformation applied server-side, but client requests full image
- Improvement path: Add Cloudinary URL transformation in frontend (w_100,h_100,f_auto,q_auto); implement lazy loading for avatars

## Fragile Areas

**Socket.io Connection Without Explicit Cleanup:**
- Files: `backend/src/socket/index.js`, `frontend/src/app/core/services/socket.service.ts`
- Why fragile: Socket stays connected across page navigations. If user logs out but socket still connected, they may receive events for old user ID. No explicit join/leave validation.
- Safe modification: Always call `socket.disconnect()` on logout; validate user ID in socket handlers matches current authenticated user
- Test coverage: No socket tests exist

**Friendship Status Values Scattered Across Code:**
- Files: `backend/src/services/discovery.service.js` (hardcoded 'pending', 'accepted', 'rejected'), migration script
- Why fragile: Status values are strings defined only at query time. No enum or constant file. Adding new status requires grep-and-replace.
- Safe modification: Create `backend/src/constants/friendshipStatus.js` with enum; use throughout; test status transitions explicitly
- Test coverage: No tests for status transitions or race conditions

**Dynamic SQL Generation in users.service.js:**
- Files: `backend/src/services/users.service.js:21-44` (updateMe function)
- Why fragile: Builds UPDATE SET clause dynamically. Easy to introduce SQL injection if params not carefully handled (currently safe due to parameterized queries, but fragile pattern).
- Safe modification: Use a library like `knex.js` or helper function to safely build dynamic queries; always validate field names against whitelist
- Test coverage: No tests for edge cases (empty updates, null values)

**No Explicit Timestamps on Friendship Creation:**
- Files: `backend/src/config/migrate.js:20-28` (friendships table has created_at but not used)
- Why fragile: Friendships table tracks `created_at` but service queries never order by it. If two friendships happen same second, ordering is undefined.
- Safe modification: Ensure all friendship queries order by `created_at DESC` for consistency; add updated_at for status changes
- Test coverage: No tests for ordering

## Missing Critical Features

**No Email Verification on Registration:**
- Problem: Users can register with any email (no verification). Typos lead to unreachable accounts.
- Blocks: Password reset (needs email), email notifications, account recovery
- Implementation: Add email verification flow with tokens; store verified flag on users table; block certain actions until verified

**No Blocking/Reporting System:**
- Problem: No way to block harassing users or report inappropriate content. Bad user behavior can't be moderated.
- Blocks: User safety and platform moderation
- Implementation: Add block relationship type; create report table with reason; add moderation dashboard (future phase)

**No Offline Message Queueing:**
- Problem: If user goes offline, socket disconnects. Messages sent to them are lost (they were online briefly before disconnect).
- Blocks: Reliable chat experience; critical for mobile app
- Implementation: Queue unseen messages in DB; fetch on reconnect; emit to client with unread status

**No Rate Limiting on API Endpoints:**
- Problem: No throttling on message sends, likes, or auth attempts. Easy to spam/flood.
- Blocks: User experience degradation; potential DOS
- Implementation: Add express-rate-limit middleware; different limits per endpoint; store in Redis

## Dependencies at Risk

**Node.js Standard Library Dependency:**
- Risk: Backend uses Node.js built-ins without version check. If deployed with incompatible Node version, silent failures occur.
- Impact: Deployment could fail or behave unexpectedly
- Migration plan: Add `.nvmrc` file with Node version; add `engines` field to package.json; document Node version requirement

**Capacitor Plugin Fragmentation:**
- Risk: Frontend uses multiple Capacitor 8.x plugins with mixed versions (e.g., `@capacitor/preferences ^8.0.1` vs `@capacitor/core 8.3.0`). Minor version mismatches can cause runtime issues.
- Impact: Preferences API may be incompatible with Core runtime
- Migration plan: Align all Capacitor dependencies to same minor version; test on actual Android and iOS devices

**Socket.io-Client Version Mismatch Potential:**
- Risk: Frontend uses `socket.io-client ^4.8.3`, backend uses `socket.io ^4.8.3`. Caret allows up to next major, so frontend could upgrade to 5.x while backend stays 4.x, breaking protocol.
- Impact: Frontend and backend socket protocol incompatibility after upgrade
- Migration plan: Pin exact versions or use tilde (~) for both; test socket upgrades explicitly

## Test Coverage Gaps

**Auth Flow Not Tested:**
- What's not tested: Login with invalid credentials, token expiration, refresh flow, logout clearing preferences
- Files: `backend/src/services/auth.service.js`, `frontend/src/app/core/services/auth.service.ts`
- Risk: Regressions in auth could lock users out or expose tokens
- Priority: High

**Socket.io Events Not Tested:**
- What's not tested: Message sending/receiving, typing indicators, read status, disconnect/reconnect, auth failure
- Files: `backend/src/socket/index.js`, `frontend/src/app/core/services/socket.service.ts`
- Risk: Real-time features silently break; users don't receive messages
- Priority: High

**Database Schema Consistency:**
- What's not tested: Foreign key constraints, cascade deletes, uniqueness constraints
- Files: `backend/src/config/migrate.js`
- Risk: Data corruption; orphaned records; app crashes on deletion
- Priority: Medium

**File Upload Edge Cases:**
- What's not tested: Large files, invalid formats, concurrent uploads, Cloudinary failures
- Files: `backend/src/middleware/upload.js`, `frontend/src/app/pages/profile/profile.page.ts`
- Risk: Uploads fail silently or hang; users can't complete profile setup
- Priority: Medium

**Discovery Algorithm Edge Cases:**
- What's not tested: User with no unviewed profiles (empty stack), self-swiping validation, mutual match race condition
- Files: `backend/src/services/discovery.service.js`, `backend/src/controllers/discovery.controller.js`
- Risk: Infinite loops, duplicate matches, swiping failures
- Priority: Medium

---

*Concerns audit: 2026-04-09*
