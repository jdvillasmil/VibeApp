# Architecture Patterns

**Domain:** Real-time mobile discovery + chat app (Ionic 8 + Angular 18 + Node.js + Socket.io + PostgreSQL)
**Researched:** 2026-04-01
**Confidence:** MEDIUM — Based on training data (cutoff Aug 2025). WebSearch/WebFetch unavailable during this session. All patterns are well-established; Angular 18 signals APIs may have minor updates.

---

## Recommended Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    IONIC ANGULAR APK (Frontend)                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Auth Module │  │  Discovery   │  │     Chat Module       │  │
│  │  (login,reg) │  │  Module      │  │  (rooms, messages,    │  │
│  │              │  │  (swipe,     │  │   typing, reactions)  │  │
│  │  AuthService │  │   cards,     │  │                       │  │
│  │  JWT store   │  │   score)     │  │  SocketService        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                 │                       │               │
│  ┌──────┴─────────────────┴───────────────────────┴───────────┐  │
│  │                  Core Services Layer                        │  │
│  │  ApiService (HTTP interceptor + JWT attach)                 │  │
│  │  SocketService (Socket.io client, room management)         │  │
│  │  NotificationService (FCM + in-app panel)                  │  │
│  │  AuthStore (signal-based: user, token, isAuthenticated)    │  │
│  └─────────────────────────────┬───────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────┘
                                 │ REST (HTTPS) + WebSocket (WSS)
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                    NODE.JS EXPRESS BACKEND                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Express Router Layer                                     │   │
│  │  POST /auth/register  POST /auth/login                    │   │
│  │  GET/PUT /users/:id   GET /discovery/candidates           │   │
│  │  POST /swipes         GET /matches                        │   │
│  │  GET /chats/:id/messages  POST /chats/:id/messages        │   │
│  │  POST /uploads        GET /notifications                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Auth Controller│  │Discovery Control│  │ Chat Controller │  │
│  │  + AuthService  │  │ + SwipeService  │  │ + MsgService    │  │
│  │  bcrypt, JWT    │  │ MatchService    │  │ Socket.io rooms │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                      │           │
│  ┌────────┴────────────────────┴──────────────────────┴────────┐ │
│  │  Middleware: authMiddleware (JWT verify), errorHandler,     │ │
│  │  uploadMiddleware (Multer), rateLimiter                     │ │
│  └──────────────────────────────┬──────────────────────────────┘ │
│                                  │                                │
│  ┌───────────────────────────────┴──────────────────────────┐   │
│  │  Socket.io Server                                         │   │
│  │  Namespace: / (default)                                   │   │
│  │  Rooms: chat:{chat_id}   Presence: user:{user_id}         │   │
│  │  Events: join_chat, leave_chat, send_message,             │   │
│  │          typing_start, typing_stop, message_read,         │   │
│  │          message_reaction                                  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (Railway)                                      │   │
│  │  users, friendships, chats, messages, notifications       │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Frontend Feature Modules (Angular Standalone)

| Module / Feature Area | Responsibility | Key Components | Communicates With |
|-----------------------|---------------|----------------|-------------------|
| **Auth** | Register, login, token storage | `LoginPage`, `RegisterPage` | `AuthService`, `ApiService` |
| **Discovery** | Swipe deck, vibe cards, match score | `DiscoveryPage`, `SwipeCardComponent`, `VibeTagComponent` | `DiscoveryService`, `ApiService` |
| **Matches** | Friends list, match confirmation | `MatchesPage`, `MatchCardComponent` | `MatchesService`, `ApiService` |
| **Chat** | Room list, message thread, image send | `ChatsPage`, `ChatRoomPage`, `MessageBubbleComponent`, `TypingIndicatorComponent` | `ChatService`, `SocketService` |
| **Profile** | View/edit own profile, avatar, interests | `ProfilePage`, `EditProfilePage` | `ProfileService`, `ApiService` |
| **Notifications** | Bell icon, unread badge, history panel | `NotificationsBellComponent`, `NotificationsPanelPage` | `NotificationService` |
| **Shared** | Reusable UI: avatar, spinner, toast wrapper | `AvatarComponent`, `LoadingComponent` | None |

### Core Services (app-level, `providedIn: 'root'`)

| Service | Responsibility | State (Signals) |
|---------|---------------|-----------------|
| `AuthService` | Login, register, logout, token refresh | `currentUser`, `isAuthenticated`, `token` |
| `ApiService` | HTTP client wrapper, attaches JWT header, handles 401 | None (stateless) |
| `SocketService` | Socket.io connection lifecycle, room join/leave, event emission/subscription | `isConnected` |
| `ChatService` | Message history load, send message, read receipts, reactions | `activeMessages`, `typingUsers` |
| `DiscoveryService` | Fetch candidate stack, submit swipe, receive match event | `candidateStack`, `pendingMatch` |
| `NotificationService` | FCM token registration, handle push events, in-app panel state | `unreadCount`, `notificationList` |
| `ProfileService` | Get/update user profile, avatar upload | `profileData` |

### Backend Route / Controller / Service Separation

```
src/
  routes/
    auth.routes.js          → POST /auth/register, /auth/login
    users.routes.js         → GET /users/:id, PUT /users/:id
    discovery.routes.js     → GET /discovery/candidates, POST /swipes
    matches.routes.js       → GET /matches
    chats.routes.js         → GET /chats, GET /chats/:id/messages, POST /chats/:id/messages
    notifications.routes.js → GET /notifications, PATCH /notifications/:id/read
    uploads.routes.js       → POST /uploads/avatar, POST /uploads/message-image

  controllers/
    auth.controller.js
    users.controller.js
    discovery.controller.js
    chats.controller.js
    notifications.controller.js

  services/
    auth.service.js         → bcrypt compare, JWT sign/verify helpers
    match.service.js        → mutual-like detection, friendship creation, chat auto-creation
    chat.service.js         → message persistence, read receipt updates
    notification.service.js → FCM dispatch, DB notification insert
    score.service.js        → interest set-intersection scoring

  middleware/
    auth.middleware.js      → verifyToken (REST routes)
    upload.middleware.js    → Multer config (disk storage, file type validation)
    error.middleware.js     → Uniform { data, error, message } envelope
    rateLimit.middleware.js → express-rate-limit for auth endpoints

  sockets/
    index.js                → io.use() JWT handshake guard, register event handlers
    chat.socket.js          → join_chat, send_message, typing_*, message_read, message_reaction
    presence.socket.js      → user online/offline broadcast

  config/
    db.js                   → pg Pool, DATABASE_URL
    migrate.js              → raw SQL migration runner
```

---

## Socket.io Room Lifecycle

### Connection and Authentication

```
Client                                    Server
  |                                          |
  |-- io.connect({ auth: { token: JWT } }) ->|
  |                                          |-- io.use(): verify JWT
  |                                          |-- if invalid: next(new Error('unauthorized'))
  |                                          |-- if valid: socket.data.userId = decoded.sub
  |<-------- connect event (ack) ------------|
```

Key implementation note: The JWT is passed in `socket.handshake.auth.token`, verified in `io.use()` middleware BEFORE any event handlers fire. This prevents unauthenticated sockets from ever reaching room logic.

### Room Creation

Rooms are NOT explicitly created on the server. Socket.io creates a room automatically when the first socket joins it. The room name convention is `chat:{chat_id}` (e.g., `chat:42`). This makes room IDs stable, predictable, and directly tied to the database `chats.id`.

### Room Join Flow

```
Client                                    Server
  |                                          |
  |-- emit('join_chat', { chatId: 42 }) ---->|
  |                                          |-- Verify: user IS a participant in chat 42 (DB check)
  |                                          |-- socket.join('chat:42')
  |                                          |-- Load last N messages from DB
  |<---- emit('chat_history', messages[]) ---|
  |                                          |-- Broadcast to room: user joined (optional)
```

Authorization check before join is mandatory. Without it, any authenticated user can join any room.

### Message Send Flow

```
Client                                    Server
  |                                          |
  |-- emit('send_message', { chatId, text }) |
  |                                          |-- Insert message into DB (returns message row with id)
  |                                          |-- io.to('chat:42').emit('new_message', messageRow)
  |<---- new_message event (to all in room) -|
```

Persist FIRST, then broadcast. If DB write fails, no emission occurs. If DB write succeeds but socket dies, message is still in DB and loads on reconnect.

### Typing Indicator

```javascript
// Client emits:
socket.emit('typing_start', { chatId: 42 })
socket.emit('typing_stop',  { chatId: 42 })

// Server:
socket.on('typing_start', ({ chatId }) => {
  socket.to(`chat:${chatId}`).emit('user_typing', { userId: socket.data.userId })
})
socket.on('typing_stop', ({ chatId }) => {
  socket.to(`chat:${chatId}`).emit('user_stopped_typing', { userId: socket.data.userId })
})
```

Note: `socket.to()` broadcasts to everyone in the room EXCEPT the sender. This is the correct method for typing indicators.

### Read Receipt Flow

```
Client                                    Server
  |                                          |
  |-- emit('message_read', { messageId }) -->|
  |                                          |-- UPDATE messages SET read_at = NOW()
  |                                          |-- Notify sender via user:{senderId} room
  |<-- emit('receipt_update', { messageId }) |   (only sender needs this event)
```

Use a per-user presence room (`user:{userId}`) for private server-to-client events like receipts. This avoids needing a separate REST poll.

### Room Leave and Cleanup

```javascript
// Explicit leave (user navigates away from chat):
socket.emit('leave_chat', { chatId: 42 })
// Server: socket.leave('chat:42')

// Implicit leave (disconnect):
socket.on('disconnect', () => {
  // Socket.io automatically removes socket from all rooms on disconnect
  // No manual cleanup needed for rooms
  // DO handle: update user online status, clear typing indicators
})
```

Socket.io automatically removes a socket from all rooms it joined when that socket disconnects. The server must NOT rely on 'leave_chat' events for cleanup — always handle disconnect.

---

## JWT Auth Flow Across REST + WebSocket

### REST Authentication Flow

```
1. POST /auth/login → { data: { token, user } }
2. Client stores token in @capacitor/preferences (never localStorage)
3. ApiService HTTP interceptor reads token and sets:
   Authorization: Bearer <token>
4. authMiddleware.js:
   - Extracts token from header
   - jwt.verify(token, JWT_SECRET)
   - Sets req.user = { sub: userId, ... }
   - next() or 403
```

### Angular HTTP Interceptor Pattern (Signals-aware)

```typescript
// auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token(); // signal read

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) authService.logout();
      return throwError(() => err);
    })
  );
};
```

### WebSocket Authentication Flow

```
1. SocketService.connect() is called AFTER login (token already in AuthStore)
2. io({ auth: { token: authService.token() } })
3. Server io.use() middleware:
   - socket.handshake.auth.token
   - jwt.verify → socket.data.userId = userId
   - next() or next(new Error('Authentication error'))
4. Client handles connect_error:
   - if error.message === 'Authentication error' → logout()
```

The socket connection must be established AFTER the token is stored. It should be torn down on logout.

### Token Lifecycle

```
Login → Store token → Connect socket → Use app
Logout → Clear token → socket.disconnect() → Redirect to login
Token expiry → 401 on REST → authService.logout() → socket.disconnect()
App resume (Capacitor) → Read token → If valid, reconnect socket
```

---

## Data Flow: Match Creation → Chat Auto-Creation → Push Notification Chain

This is the most complex multi-step flow in the system. It happens entirely server-side when a swipe is submitted.

```
POST /swipes
  body: { target_user_id: 7, direction: 'right' }
  headers: Authorization: Bearer <JWT>

  ┌─────────────────────────────────────────────────────────────┐
  │  SwipeController                                             │
  │    1. Extract actor_id from req.user.sub                    │
  │    2. INSERT INTO swipes (actor_id=5, target_id=7,          │
  │                           direction='right')                 │
  │    3. Call MatchService.checkMutualLike(5, 7)               │
  └─────────────────────┬───────────────────────────────────────┘
                         │
  ┌──────────────────────▼──────────────────────────────────────┐
  │  MatchService.checkMutualLike(5, 7)                          │
  │    SELECT * FROM swipes                                      │
  │    WHERE actor_id=7 AND target_id=5 AND direction='right'    │
  │    → returns row (mutual like found)                         │
  │                                                              │
  │    BEGIN TRANSACTION                                         │
  │      INSERT INTO friendships (user_a=5, user_b=7,           │
  │                               status='accepted')             │
  │      INSERT INTO chats (user_a=5, user_b=7)                 │
  │      → returns chat_id = 42                                  │
  │    COMMIT                                                     │
  │                                                              │
  │    Return { matched: true, chatId: 42, matchedUser: {...} }  │
  └──────────────────────┬───────────────────────────────────────┘
                          │
  ┌───────────────────────▼─────────────────────────────────────┐
  │  NotificationService.dispatchMatchNotification(5, 7, 42)    │
  │    INSERT INTO notifications (user_id=5, type='match',      │
  │                               ref_id=42)                     │
  │    INSERT INTO notifications (user_id=7, type='match',      │
  │                               ref_id=42)                     │
  │    FCM.send(user5.fcm_token, { title: 'New match!', ... })  │
  │    FCM.send(user7.fcm_token, { title: 'New match!', ... })  │
  └──────────────────────┬──────────────────────────────────────┘
                          │
  ┌───────────────────────▼─────────────────────────────────────┐
  │  Socket.io real-time notify (if users are online)           │
  │    io.to('user:5').emit('match_created', { chatId: 42,      │
  │                                            matchedUser })    │
  │    io.to('user:7').emit('match_created', { chatId: 42,      │
  │                                            matchedUser })    │
  └──────────────────────┬──────────────────────────────────────┘
                          │
  ┌───────────────────────▼─────────────────────────────────────┐
  │  HTTP Response to actor (user 5)                            │
  │    200 { data: { matched: true, chatId: 42,                 │
  │                  matchedUser }, message: 'It\'s a match!' } │
  └─────────────────────────────────────────────────────────────┘

Frontend (both users):
  On 'match_created' event:
    → DiscoveryService updates candidateStack signal (remove matched user)
    → Navigate or show match modal
    → MatchesService refreshes matches list
    → ChatsPage shows new chat room
```

### Key Rule: Transaction Boundary

The friendship INSERT and chat INSERT must be inside one database transaction. If the chat insert fails, the friendship must also roll back. Orphaned friendships with no chat room would break navigation.

---

## Angular Signals Architecture Patterns

### AuthStore Pattern (Signal-based global state)

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Private writable signals
  private _currentUser = signal<User | null>(null);
  private _token = signal<string | null>(null);

  // Public readonly computed signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  async login(credentials: LoginDto): Promise<void> {
    const res = await firstValueFrom(this.http.post<AuthResponse>('/auth/login', credentials));
    this._token.set(res.data.token);
    this._currentUser.set(res.data.user);
    await Preferences.set({ key: 'auth_token', value: res.data.token });
  }

  async logout(): Promise<void> {
    this._token.set(null);
    this._currentUser.set(null);
    await Preferences.remove({ key: 'auth_token' });
    this.socketService.disconnect();
  }

  async restoreSession(): Promise<void> {
    const { value } = await Preferences.get({ key: 'auth_token' });
    if (value) {
      this._token.set(value);
      // Fetch current user from /users/me
    }
  }
}
```

### ChatService Signals Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class ChatService {
  private _messages = signal<Message[]>([]);
  private _typingUsers = signal<Set<number>>(new Set());

  readonly messages = this._messages.asReadonly();
  readonly typingUsers = this._typingUsers.asReadonly();
  readonly hasUnread = computed(() =>
    this._messages().some(m => !m.read_at && m.sender_id !== this.authService.currentUser()?.id)
  );

  addMessage(msg: Message): void {
    this._messages.update(msgs => [...msgs, msg]);
  }

  setTyping(userId: number, isTyping: boolean): void {
    this._typingUsers.update(users => {
      const next = new Set(users);
      isTyping ? next.add(userId) : next.delete(userId);
      return next;
    });
  }
}
```

### Standalone Component Pattern

```typescript
@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [IonContent, IonFooter, MessageBubbleComponent, TypingIndicatorComponent, AsyncPipe],
  template: `...`
})
export class ChatRoomPage implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private socketService = inject(SocketService);
  private route = inject(ActivatedRoute);

  chatId = signal<number>(0);
  messages = this.chatService.messages;          // derived signal
  typingUsers = this.chatService.typingUsers;    // derived signal

  ngOnInit() {
    const id = +this.route.snapshot.params['id'];
    this.chatId.set(id);
    this.socketService.joinChat(id);
    this.chatService.loadHistory(id);
  }

  ngOnDestroy() {
    this.socketService.leaveChat(this.chatId());
  }
}
```

### SocketService Pattern (RxJS bridge to signals)

```typescript
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private _isConnected = signal(false);

  readonly isConnected = this._isConnected.asReadonly();

  connect(token: string): void {
    this.socket = io(environment.apiUrl, { auth: { token } });
    this.socket.on('connect', () => this._isConnected.set(true));
    this.socket.on('disconnect', () => this._isConnected.set(false));
    this.registerGlobalEvents();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._isConnected.set(false);
  }

  joinChat(chatId: number): void {
    this.socket?.emit('join_chat', { chatId });
  }

  leaveChat(chatId: number): void {
    this.socket?.emit('leave_chat', { chatId });
  }

  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket?.on(event, (data: T) => observer.next(data));
      return () => this.socket?.off(event);
    });
  }
}
```

---

## Scalability Considerations

| Concern | At 100 users (current scope) | At 10K users | At 1M users |
|---------|------------------------------|--------------|-------------|
| WebSocket connections | Single Node process fine | Need Socket.io Redis adapter for multi-process | Dedicated socket cluster |
| File uploads | Multer to Railway disk fine | S3/Cloudinary | S3 mandatory |
| DB queries | Raw SQL with pg pool fine | Add indexes + query optimization | Read replicas |
| Push notifications | FCM direct fine | FCM batch sends | Queue-based dispatch |
| Discovery candidates | In-process SQL filtering | DB-level filtering with spatial index | Dedicated recommendation service |

For the academic scope (100 users, 2 devs, semester deadline), the single-Railway-process architecture is correct. Do not over-engineer.

---

## Suggested Build Order for 2 Developers

The key constraint: the frontend cannot progress on real-time features until the backend socket server exists. Auth must exist before everything else since JWT tokens gate all other endpoints.

### Phase 1: Foundation (Week 1-2) — Both devs together

Both developers work on shared foundations before splitting. This avoids auth-blocked parallel work.

| Dev A (Juan David) | Dev B (Renny) |
|--------------------|---------------|
| Backend: Express skeleton, DB connection, raw SQL migration script, uniform error middleware | Frontend: Ionic project scaffold, routing, Ionic dark mode CSS variables, shared UI components (avatar, spinner) |
| Backend: POST /auth/register, POST /auth/login (bcrypt + JWT) | Frontend: AuthService with signals, @capacitor/preferences token storage, HTTP interceptor |
| **Sync point:** Auth endpoints live, frontend login/register functional | |

### Phase 2: Discovery (Week 2-3) — Parallel

| Dev A (Backend) | Dev B (Frontend) |
|-----------------|------------------|
| GET /discovery/candidates (excludes self + existing relations) | DiscoveryPage: swipe card stack, gesture animations, vibe overlay |
| POST /swipes (insert swipe row, call MatchService) | SwipeCardComponent: green/red overlay, ✓/✗ icons |
| MatchService: mutual-like detection, friendship + chat TX | Match modal component (shown on match_created) |
| GET /matches | MatchesPage: friends list |

### Phase 3: Real-time Chat (Week 3-4) — Parallel

| Dev A (Backend) | Dev B (Frontend) |
|-----------------|------------------|
| Socket.io server setup: JWT handshake middleware | SocketService: connect/disconnect lifecycle, joinChat/leaveChat |
| Events: join_chat, send_message, leave_chat | ChatsPage: room list, navigate to room |
| Events: typing_start/stop, message_read | ChatRoomPage: message thread, input, send |
| Image upload endpoint: POST /chats/:id/messages with Multer | MessageBubbleComponent: text + image rendering, read receipts |
| Reactions: message_reaction event + DB update | TypingIndicatorComponent, emoji reaction picker |

### Phase 4: Notifications (Week 4-5) — Parallel

| Dev A (Backend) | Dev B (Frontend) |
|-----------------|------------------|
| FCM integration: send on match, send on new message | Capacitor Push Notifications: register device token, handle foreground/background |
| POST /users/:id/fcm-token endpoint | NotificationService: token registration, FCM event routing |
| GET /notifications, PATCH /notifications/:id/read | NotificationsBellComponent: unread badge, panel |
| Socket.io: match_created + message events to user rooms | In-app notification panel page |

### Phase 5: Polish (Week 5-6) — Both devs

- Profile edit (avatar upload with Multer, bio, interests)
- Match score display on discovery cards
- Generated avatar fallback (initials + color)
- Vibe status presets UI + backend persistence
- Error states, loading skeletons, empty states
- Postman collection finalization + end-to-end test on physical Android

### Critical Dependency Chain

```
DB schema → Auth endpoints → JWT interceptor → All other REST
Auth REST → Socket.io JWT middleware → All socket events
Swipe backend (match TX) → match_created socket event → Frontend match flow
Chat DB table → Message history load → Chat UI
FCM backend → Push notification receive → Notification UI
```

Do not start socket event handlers until the JWT handshake middleware is tested and working. A broken auth layer poisons every subsequent feature.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Connecting Socket Before Token is Available

**What:** Calling `SocketService.connect()` on app init before restoring the session from @capacitor/preferences.
**Why bad:** Socket connection with no token is rejected; error handling complexity increases.
**Instead:** Call `connect()` at the end of `AuthService.restoreSession()` and at the end of `login()`. Never in `AppComponent.ngOnInit()`.

### Anti-Pattern 2: Trusting Client Room Membership

**What:** Skipping the DB membership check in `join_chat` handler — just joining any room if authenticated.
**Why bad:** Any logged-in user can receive messages from any chat.
**Instead:** Always query `SELECT * FROM chats WHERE id=$1 AND (user_a=$2 OR user_b=$2)` before `socket.join()`.

### Anti-Pattern 3: Broadcasting Before DB Persist

**What:** `io.to(room).emit('new_message', ...)` before the `INSERT INTO messages` completes.
**Why bad:** If the INSERT fails, clients show a message that doesn't exist. On reconnect, the message is gone.
**Instead:** Always `await db.query('INSERT ...')`, get the returned row, then emit.

### Anti-Pattern 4: Using RxJS Subjects for All State

**What:** Wrapping signals with BehaviorSubject because it "feels familiar."
**Why bad:** Defeats the purpose of Angular 18 signals; adds unnecessary subscription boilerplate.
**Instead:** Use `signal()` for local component state, `computed()` for derived values, signals in services for shared state. Reserve RxJS only for event streams from Socket.io (Observable wrapper) and HTTP responses (HttpClient returns Observables).

### Anti-Pattern 5: Separate HTTP Base URLs in Each Service

**What:** Each service hardcodes `http://localhost:3000` or references `environment.apiUrl` directly.
**Why bad:** Every service needs updating when the URL changes; interceptors don't fire if URLs diverge.
**Instead:** Single `ApiService` wrapper that uses `environment.apiUrl` as base; all other services call `ApiService` methods.

### Anti-Pattern 6: Skipping the Transaction on Match Creation

**What:** Inserting friendship and chat in separate sequential DB queries without a transaction.
**Why bad:** If the chat insert fails after friendship succeeds, the user has a friendship with no accessible chat. This is an unrecoverable data state.
**Instead:** `BEGIN` / `INSERT friendship` / `INSERT chat` / `COMMIT` in a single `pg` transaction block.

---

## Sources

- Angular 18 signals documentation: https://angular.dev/guide/signals (training data, HIGH confidence for patterns shown)
- Socket.io v4 rooms documentation: https://socket.io/docs/v4/rooms/ (training data, HIGH confidence — stable API)
- Socket.io v4 authentication: https://socket.io/docs/v4/middlewares/#sending-credentials (training data, HIGH confidence)
- Capacitor Preferences API: https://capacitorjs.com/docs/apis/preferences (training data, HIGH confidence)
- PostgreSQL transaction patterns with node-postgres: https://node-postgres.com/features/transactions (training data, HIGH confidence)
- Note: WebSearch and WebFetch were unavailable during this session. All patterns are based on training data (cutoff Aug 2025) and are well-established for the given library versions. Angular signals API is stable as of Angular 17+. Verify any Angular 18 signal API details against https://angular.dev before implementation.
