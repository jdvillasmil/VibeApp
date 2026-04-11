# Testing Patterns

**Analysis Date:** 2026-04-09

## Test Framework

**Runner:**
- Frontend: Karma v6.4.0
- Framework: Jasmine v5.1.0
- Config: `frontend/karma.conf.js`

**Assertion Library:**
- Jasmine built-in assertions (e.g., `expect(value).toBeTruthy()`)

**Run Commands:**
```bash
# Frontend
ng test              # Run tests in watch mode with Chrome
ng test --watch     # Explicit watch mode
ng test --code-coverage  # Run with coverage report
```

**Backend:**
- No test framework configured
- No test files present in `backend/src/`

## Test File Organization

**Frontend Location:**
- Co-located with source files: `[name].component.spec.ts` sits next to `[name].component.ts`
- Test file placement: `frontend/src/app/[feature]/[name].component.spec.ts`
- Current test files:
  - `frontend/src/app/app.component.spec.ts`
  - `frontend/src/app/home/home.page.spec.ts`

**Naming:**
- Pattern: `[feature/component-name].spec.ts`
- Examples: `app.component.spec.ts`, `home.page.spec.ts`

**Structure:**
```
frontend/src/
├── app/
│   ├── app.component.ts
│   ├── app.component.spec.ts       <- Co-located test
│   ├── home/
│   │   ├── home.page.ts
│   │   └── home.page.spec.ts       <- Co-located test
│   └── shared/
│       └── components/
│           ├── swipe-card/
│           │   └── swipe-card.component.ts
│           │   └── [swipe-card.component.spec.ts]  <- Not yet written
```

## Test Structure

**Suite Organization:**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**Patterns:**
- Setup: `beforeEach(async () => { ... })` — configures TestBed, creates component fixture, detects changes
- Assertions: `expect(component).toBeTruthy()`
- Component access: `component` instance, `fixture` for DOM interaction
- Change detection: `fixture.detectChanges()` called after creating component

**Component Testing Pattern:**
1. Configure TestBed with component declarations and imports
2. Call `compileComponents()` to compile component templates/styles
3. Create fixture with `TestBed.createComponent(ComponentClass)`
4. Get component instance: `fixture.componentInstance`
5. Trigger initial change detection: `fixture.detectChanges()`
6. Test the component

## Mocking

**Framework:**
- Jasmine built-in spies: `spyOn()`, `jasmine.createSpy()`, `jasmine.createSpyObj()`

**Patterns:**

Not yet implemented in test files. Expected patterns based on Angular/Jasmine conventions:

```typescript
// Mock a service
beforeEach(() => {
  const authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken', 'login']);
  TestBed.configureTestingModule({
    declarations: [LoginPage],
    providers: [{ provide: AuthService, useValue: authServiceSpy }]
  });
});

// Spy on method calls
spyOn(component, 'checkHealth').and.returnValue(Promise.resolve());

// Mock HTTP calls (would use HttpClientTestingModule)
TestBed.configureTestingModule({
  imports: [HttpClientTestingModule],
  declarations: [HomePage]
});
const httpMock = TestBed.inject(HttpTestingController);
```

**What to Mock:**
- HTTP calls (HttpClientTestingModule should be used)
- External services (AuthService, SocketService)
- Capacitor APIs (Preferences)

**What NOT to Mock:**
- Component's own methods (test the real behavior)
- Ionic components in simple unit tests (use CUSTOM_ELEMENTS_SCHEMA)
- RxJS operators (test observable behavior)

## Fixtures and Factories

**Test Data:**

Currently no fixtures or factories in use. Based on patterns, would look like:

```typescript
// Mock user data
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  interests: ['Gaming', 'Music'],
  vibe: 'Gaming'
};

// Mock swipe card user
const mockSwipeUser: SwipeUser = {
  id: 2,
  name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: 'Love gaming',
  interests: ['Gaming', 'Music'],
  vibe: 'Gaming'
};
```

**Location:**
- Would be co-located in test file or in `frontend/src/testing/` directory
- Not yet established in codebase

## Coverage

**Requirements:**
- No coverage target enforced in Karma config
- Coverage reporter configured to output HTML and text-summary reports
- Location: `frontend/coverage/app/` (relative to karma.conf.js location)

**View Coverage:**
```bash
ng test --code-coverage
# Opens coverage report at frontend/coverage/app/index.html
```

## Test Types

**Unit Tests:**
- Scope: Individual component or service
- Current examples: `app.component.spec.ts` tests component creation
- Approach: Isolated component with mocked dependencies
- Pattern: TestBed setup → create fixture → test assertions

**Integration Tests:**
- Not currently implemented
- Would test: Component + service interaction, navigation, socket events
- Would use: HttpClientTestingModule, socket.io test client

**E2E Tests:**
- Not currently implemented
- Framework would be: Cypress or Protractor (Angular compatible)
- Scope: Full user workflows (login → discover → swipe → chat)

## Common Patterns

**Async Testing:**

Pattern from existing tests:
```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    declarations: [HomePage],
    imports: [IonicModule.forRoot()]
  }).compileComponents();
});
```

For async operations in tests:
```typescript
it('should load user profile', async () => {
  const authService = TestBed.inject(AuthService);
  spyOn(authService, 'getProfile').and.returnValue(Promise.resolve({ data: mockUser }));
  
  await component.loadProfile();
  expect(component.user).toEqual(mockUser);
});
```

**Error Testing:**

Pattern not yet shown in existing tests. Expected:
```typescript
it('should handle login error', async () => {
  const authService = TestBed.inject(AuthService);
  spyOn(authService, 'login').and.returnValue(Promise.reject(new Error('Invalid credentials')));
  
  const result = await component.login('test@example.com', 'wrong');
  expect(result).toBeNull();
});
```

**Subscription Testing:**

For Observable/Subject testing:
```typescript
it('should emit new message', (done) => {
  socketService.newMessage$.subscribe((msg: ChatMessage) => {
    expect(msg.body).toBe('Hello');
    done();
  });
  
  socketService.newMessage$.next(mockMessage);
});

// Or using `fakeAsync` and `tick`
it('should receive socket events', fakeAsync(() => {
  socketService.newMessage$.subscribe(msg => {
    expect(msg.body).toBe('Hello');
  });
  socketService.newMessage$.next(mockMessage);
  tick();
}));
```

## Test Configuration Details

**Karma Config (`frontend/karma.conf.js`):**
- Browser: Chrome
- Framework: Jasmine + @angular-devkit/build-angular
- Plugins: karma-jasmine, karma-chrome-launcher, karma-jasmine-html-reporter, karma-coverage
- Watch mode: enabled by default (`autoWatch: true`, `singleRun: false`)
- Coverage reporters: HTML format and text-summary
- Suppresses duplicate Jasmine HTML output: `suppressAll: true`

**TypeScript Config for Tests (`frontend/tsconfig.spec.json`):**
- Extends `tsconfig.json` with test-specific settings
- Includes `**/*.spec.ts` files
- Includes support for Jasmine globals and types

## Testing Gaps

**Not Tested:**
- Backend services (auth.service.js, users.service.js, discovery.service.js, chats.service.js) — no test framework configured
- Backend controllers — no test files exist
- Frontend services (auth.service.ts, socket.service.ts) — no service tests
- Frontend pages (discover, chat-list, profile, etc.) — only app and home tested
- Frontend components (swipe-card, avatar, etc.) — no tests written
- Real HTTP calls — HttpClientTestingModule not yet used
- WebSocket/Socket.IO events — no socket test infrastructure
- Error scenarios — tests don't cover error handling paths
- User interactions — no DOM testing (button clicks, form inputs)

**Coverage Estimate:**
- Current: Minimal (only 2 basic component instantiation tests)
- Risk: Changes to auth logic, UI interactions, socket events could break undetected

## Recommended Additions

**Priority Tests to Add:**
1. `auth.service.spec.ts` — test token storage/retrieval, JWT decoding
2. `socket.service.spec.ts` — test connection, event emissions
3. Discover page test — test swipe card interactions, API calls
4. Chat room test — test message sending, typing indicators
5. Backend: Create auth service tests (register, login, token verification)
6. Backend: Create database integration tests for user/chat operations
