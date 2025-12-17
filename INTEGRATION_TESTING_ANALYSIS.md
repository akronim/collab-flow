# Integration Testing Analysis

## Overview

This document analyzes the feasibility and approach for implementing real integration tests across the 3 projects in this monorepo.

---

## The 3 Projects

| Project | Role | Port | Tech |
|---------|------|------|------|
| **sync-forge** | Vue.js frontend | 5173 | Vue 3, Vite, Pinia, Axios |
| **google-oauth-backend** | OAuth gateway + session mgmt | 3001 | Express, express-session, http-proxy-middleware |
| **collab-flow-api** | Resource API (tasks, projects) | 3002 | Express, JWT validation |

### Communication Flow

```
sync-forge (5173)
    ↓ (Axios, credentials:true)
    ├─→ google-oauth-backend (3001)
    │        ├─→ POST /api/auth/token (exchange code)
    │        ├─→ GET /api/auth/me (check auth)
    │        └─→ POST /api/* (proxy to collab-flow-api)
    │             ↓ (http-proxy-middleware)
    │             └─→ collab-flow-api (3002)
    │                  ├─→ GET/POST /api/projects
    │                  ├─→ GET/POST /api/tasks
    │                  └─→ GET/POST /api/users
    │
    └─→ Google OAuth (external)
         └─→ oauth2.googleapis.com
         └─→ googleapis.com/oauth2/v3/userinfo
```

---

## Complexity Assessment: MEDIUM

### Why Not Hard

- No real database (in-memory mock data)
- Clear HTTP contracts between services
- MSW already installed in all 3 projects (unused)
- Good architectural separation
- Well-defined API endpoints

### Why Not Easy

- OAuth PKCE flow is stateful
- CSRF + session cookies must work correctly
- 3 services need coordination
- Security features (httpOnly, CSRF rotation) must be verified

---

## Current Testing Infrastructure

| Project | Framework | Environment | MSW |
|---------|-----------|-------------|-----|
| sync-forge | Vitest | happy-dom | Installed, not configured |
| collab-flow-api | Vitest | node | Installed, not configured |
| google-oauth-backend | Vitest | node | Installed, not configured |

### Existing Tests

- **Unit tests:** ~195 test cases across all projects
- **E2E tests:** Playwright configured but no tests written
- **Integration tests:** None

---

## Recommended Approach

### Phase 1: MSW Setup (1-2 days)

- [ ] Create MSW handler definitions for collab-flow-api
- [ ] Share types between projects (create `/shared-types` or workspace)
- [ ] Set up MSW server in google-oauth-backend tests
- [ ] Verify handlers work with existing HTTP calls

### Phase 2: Frontend + OAuth Backend Integration (3-5 days)

**Start here - highest value, tests the critical auth flow.**

- [ ] Orchestrate frontend + oauth-backend startup
- [ ] Test complete auth flow:
  - [ ] Unauthenticated state (/login redirect)
  - [ ] CSRF token generation
  - [ ] Token exchange (code → session)
  - [ ] Session persistence
  - [ ] Logout
- [ ] Mock collab-flow-api with MSW

### Phase 3: Full Stack Integration (2-3 days)

- [ ] Docker Compose setup for all three services
- [ ] Mock Google OAuth responses
- [ ] Test complete flows:
  - [ ] Login → view projects → create task → update task
  - [ ] Task board operations
  - [ ] Session expiration handling
  - [ ] CSRF attack prevention

### Phase 4: CI/CD Integration (1 day)

- [ ] Add integration test job to CI pipeline
- [ ] Run before merging to main
- [ ] Generate coverage reports

---

## Recommended Project Structure

```
collab-flow/
├── integration-tests/                    # New directory
│   ├── fixtures/
│   │   ├── auth.fixtures.ts
│   │   ├── tasks.fixtures.ts
│   │   └── projects.fixtures.ts
│   ├── mocks/
│   │   ├── handlers.ts                   # MSW handlers
│   │   ├── server.ts                     # MSW server setup
│   │   └── shared-types.ts
│   ├── scenarios/
│   │   ├── auth.integration.test.ts
│   │   ├── task-crud.integration.test.ts
│   │   ├── projects.integration.test.ts
│   │   └── csrf-security.integration.test.ts
│   ├── setup.ts
│   └── teardown.ts
├── docker-compose.test.yml               # For full stack testing
└── vitest.integration.config.ts
```

---

## Tools Needed

| Tool | Purpose |
|------|---------|
| `start-server-and-test` | Orchestrate service startup for tests |
| MSW handlers | Mock external services (already installed) |
| `vitest.integration.config.ts` | Separate config for integration tests |
| Docker Compose (optional) | Full stack testing in CI |

---

## Key Test Scenarios

### 1. Auth Flow

```typescript
describe(`Auth Flow Integration`, () => {
  it(`should complete OAuth PKCE flow end-to-end`, async () => {
    // 1. Initial state - user not authenticated
    // GET /api/auth/me → 401
    // CSRF cookie set in response

    // 2. User initiates login
    // Generate PKCE code verifier
    // Build Google auth URL

    // 3. User returns from Google with code
    // POST /api/auth/token with code + verifier
    // Mock Google token exchange
    // Verify session cookie set
    // Verify CSRF token rotated

    // 4. Authenticated request
    // GET /api/projects (with session cookie)
    // Verify Authorization header added to proxy request
    // Verify JWT valid on collab-flow-api
  })
})
```

### 2. Session Security

```typescript
describe(`Session Security`, () => {
  it(`should prevent CSRF attacks`, async () => {
    // POST without CSRF token → 403
    // POST with wrong CSRF token → 403
    // POST with correct CSRF token → 200
  })

  it(`should protect session cookie`, async () => {
    // Verify collabflow.sid has httpOnly: true
    // Verify token transmitted on every request
  })
})
```

### 3. JWT Propagation

```typescript
describe(`JWT Propagation`, () => {
  it(`should add internal JWT to proxied requests`, async () => {
    // Authenticated user makes request
    // OAuth backend extracts session userId
    // Creates JWT with user data
    // Adds Authorization: Bearer <JWT> header
    // Resource API validates JWT
  })
})
```

### 4. Task CRUD

```typescript
describe(`Task Management`, () => {
  it(`should create, read, update, and delete tasks`, async () => {
    // POST /api/tasks → create
    // GET /api/tasks/:id → read
    // PUT /api/tasks/:id → update
    // DELETE /api/tasks/:id → delete
    // All operations go through auth flow
  })
})
```

---

## Test Checklist

### Auth & Security

- [ ] Unauthenticated users redirected to login
- [ ] CSRF token generated on first visit
- [ ] CSRF token validated on state-changing requests
- [ ] Session cookie set after auth
- [ ] Session cookie is httpOnly
- [ ] JWT created with correct payload
- [ ] JWT expires correctly
- [ ] Invalid JWT rejected
- [ ] Logout clears session
- [ ] Re-login after logout works

### API Gateway

- [ ] Requests routed to collab-flow-api
- [ ] Authorization header added
- [ ] Session cookies removed from proxy
- [ ] Response forwarded back correctly

### Task Operations

- [ ] Create task (POST)
- [ ] Read task (GET)
- [ ] Update task (PUT)
- [ ] Delete task (DELETE)
- [ ] Unauthorized user cannot access tasks

### Error Handling

- [ ] 401 on expired session
- [ ] 403 on CSRF token mismatch
- [ ] 404 on missing resource
- [ ] 500 on server error

---

## Docker Compose (For CI/CD)

```yaml
# docker-compose.test.yml
services:
  collab-flow-api:
    build: ./collab-flow-api
    environment:
      - NODE_ENV=test
    ports:
      - "3002:3002"

  google-oauth-backend:
    build: ./google-oauth-backend
    environment:
      - NODE_ENV=test
      - COLLAB_FLOW_API_URL=http://collab-flow-api:3002
    ports:
      - "3001:3001"
    depends_on:
      - collab-flow-api

  sync-forge:
    build: ./sync-forge
    ports:
      - "5173:5173"
    depends_on:
      - google-oauth-backend
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Google OAuth credentials leak | Critical | Use fake credentials in CI |
| Test data pollution | High | Reset mock data between tests |
| Port conflicts | Medium | Use dynamic ports or Docker network |
| Flaky OAuth flow | Medium | Use MSW for Google APIs |
| Session state leakage | High | Clear cookies between tests |
| Type mismatches | Medium | Share types across projects |

---

## Effort Estimates

| Component | Effort | Risk |
|-----------|--------|------|
| MSW Setup | 1 day | Low |
| Frontend + OAuth Backend | 3-5 days | Medium |
| OAuth Backend + Resource API | 2-3 days | Medium |
| Full Stack (3 services) | 3-5 days | High |
| Docker Compose | 1 day | Low |
| CI/CD Integration | 1 day | Low |

**Total estimated timeline: 2-3 weeks** for complete integration testing with CI/CD.

---

## Conclusion

Integration testing is **highly feasible** for this architecture:

- Clear service boundaries
- Well-defined HTTP contracts
- Existing test framework setup
- MSW already installed
- Manageable codebase (~3,400 lines)
- No complex database logic

**Recommended start:** Frontend + OAuth Backend integration tests using MSW and `start-server-and-test`. This is where 80% of the complexity lives.
