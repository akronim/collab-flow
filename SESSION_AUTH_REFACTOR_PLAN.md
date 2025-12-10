# Session-Based Authentication Refactor Plan

This document outlines the high-level plan to refactor the authentication mechanism from a token-based (JWT) architecture to a traditional session-based one.

**Primary Goals:**
1.  Simplify the frontend authentication logic by removing token management and silent refreshes.
2.  Implement a "logout from all devices" feature.

**Key Trade-Offs & Warnings:**
- **Stateful Backend:** This moves complexity from the frontend to the backend. The `google-oauth-backend` will become a stateful service. While a persistent, shared session store (e.g., PostgreSQL) is required for scalability, we will start with a temporary in-memory store for initial development.
- **CSRF Protection:** A session-based architecture is more vulnerable to Cross-Site Request Forgery (CSRF). Implementing robust CSRF protection (e.g., Double Submit Cookie pattern) is a **critical and mandatory** part of this refactor for all state-changing endpoints.

---

## Phase 1: Backend Refactor (`google-oauth-backend`)

### Task 1.1: Introduce a Custom Session Store
-   **Note:** While `express-session` will be used for core middleware functionality, a **custom store** is required to support the "logout everywhere" feature.
-   [ ] Create a simple `InMemorySessionStore` class that implements the `express-session` store interface (`get`, `set`, `destroy`) and adds our own custom `destroyAll(userId)` method. This is a temporary solution.
-   [ ] **TODO:** The custom `InMemorySessionStore` will later be swapped with a `PostgresSessionStore` that uses `connect-pg` and implements the same interface.
-   [ ] Add and configure the `express-session` middleware to use our new custom `InMemorySessionStore`.

### Task 1.2: Implement CSRF Protection
-   [ ] Choose a CSRF mitigation strategy (e.g., `csurf` library or a manual implementation of the Double Submit Cookie pattern).
-   [ ] Add middleware to generate and validate CSRF tokens for all state-changing requests (POST, PUT, PATCH, DELETE).

### Task 1.3: Update Authentication Flow
-   [ ] **Login (`/api/auth/token`):**
    -   [ ] **Security:** Immediately after successful Google authentication, call `req.session.regenerate()` to create a new, clean session and prevent session fixation attacks.
    -   [ ] Remove public-facing JWT generation from the login flow and delete the old `tokenStore.service.ts`.
    -   [ ] **Security:** Encrypt the `google_refresh_token` using an application-level secret before storing it in the session object.
    -   [ ] Store minimal user profile information (like `userId`) and the encrypted Google Refresh Token in `req.session`.
-   [ ] **Logout (`/api/auth/logout`):**
    -   [ ] The handler must find the `userId` from the current session.
    -   [ ] It must then call the custom store's `destroyAll(userId)` method to delete all sessions associated with that user.
    -   [ ] This ensures that logging out on one device logs the user out everywhere.
-   [ ] **Refresh (`/api/auth/internal-refresh`):**
    -   [ ] This endpoint is no longer needed and can be **deleted**.
-   [ ] **Get Current User (`/api/users/me`):**
    -   [ ] **New endpoint.** Add a route and controller to return the current user's profile from `req.session`.
    -   [ ] If no valid session exists, return 401.
    -   [ ] This endpoint is called by the frontend on app startup to restore auth state.

### Task 1.4: Update Gateway Middleware
-   [ ] The `tokenValidationMiddleware` will be replaced by the `express-session` middleware, which handles validating the user's session.
-   [ ] The `gatewayProxy` middleware will be updated to:
    -   [ ] Read user information from `req.session`.
    -   [ ] Use the repurposed `jwt.service.ts` to create a new, short-lived internal JWT.
    -   [ ] Set this new JWT in the `Authorization` header of the request being proxied to downstream services like `collab-flow-api`.

---

## Phase 2: Frontend Refactor (`sync-forge`)

### Task 2.1: Consolidate API Clients & Remove Token-Based Logic
-   [ ] **Merge `simpleApiClient.ts` and `authApiClient.ts` into a single `apiClient.ts`:**
    -   [ ] The new client uses `withCredentials: true` for all requests (session cookie).
    -   [ ] Remove the request interceptor that adds the `Authorization: Bearer` header (no longer needed).
    -   [ ] The 401 response interceptor will be updated in Task 2.3.
-   [ ] **`stores/auth.ts`:**
    -   [ ] Gut the store. Remove `accessToken`, `expiresAt`, proactive refresh timers, and all refresh logic.
    -   [ ] The store will only be responsible for holding the user's profile (`user`) and an `isAuthenticated` flag.

### Task 2.2: Implement CSRF Handling
-   [ ] **`services/apiClient.ts`:**
    -   [ ] Add a request interceptor to attach the CSRF token (from a cookie or fetched from `/api/csrf-token`) to all state-changing requests (POST, PUT, PATCH, DELETE) via the `X-CSRF-Token` header.

### Task 2.3: Update Application Startup & Routing
-   [ ] **Application Startup (e.g., in `main.ts` or `App.vue`):**
    -   [ ] On initial app load, make a single API call to `/api/users/me` to fetch the current user's data.
    -   [ ] If the call is successful, populate the Pinia auth store. The user is now considered logged in.
    -   [ ] If the call fails with a 401, the user is not logged in.
-   [ ] **`router/index.ts`:**
    -   [ ] The `beforeEach` guard should no longer make an API call. It should simply check the user's status in the Pinia store (`auth.isAuthenticated`).
-   [ ] **`services/apiClient.ts`:**
    -   [ ] Update the 401 response interceptor to trigger a hard redirect to the login page (e.g., `window.location.href = '/login'`), as a 401 is now a fatal session error.
-   [ ] **`AuthCallback.vue`:**
    -   [ ] The callback will no longer expect a token. After the backend call, it should redirect to the main app, which will then trigger the app startup logic to fetch the user data.

---

## Summary of Affected Backend Files (`google-oauth-backend`)

Based on the plan above, the following files are expected to be impacted during the implementation of Phase 1.

### Files to be Modified
-   `google-oauth-backend/src/server.ts`: To register the new `express-session` and CSRF middleware.
-   `google-oauth-backend/src/controllers/auth.controller.ts`: To rewrite login/logout logic for sessions instead of tokens.
-   `google-oauth-backend/src/routes/auth.routes.ts`: To remove the obsolete `/internal-refresh` route and add `/users/me` route.
-   `google-oauth-backend/src/routes/gateway.routes.ts`: To replace `tokenValidationMiddleware` with session-based auth check.
-   `google-oauth-backend/src/middleware/gateway.middleware.ts`: To read user identity from `req.session` and create/attach internal JWT for downstream services.
-   `google-oauth-backend/src/services/jwt.service.ts`: To be repurposed for generating internal JWTs for downstream services.
-   `google-oauth-backend/src/config/index.ts`: To remove public-facing JWT env vars and add session/internal JWT config.
-   `google-oauth-backend/src/constants/index.ts`: To remove `INTERNAL_REFRESH` endpoint and add session/CSRF/internal JWT related constants.
-   `google-oauth-backend/src/types/index.ts`: To update `Express.Request` augmentation for session data and add session type definitions.

### Files to be Deleted
-   `google-oauth-backend/src/services/tokenStore.service.ts`: Replaced by the new session store.
-   `google-oauth-backend/src/middleware/tokenValidation.middleware.ts`: Replaced by `express-session` middleware.

### New Files to be Created
-   `google-oauth-backend/src/services/inMemorySession.store.ts` (or similar): To implement the custom `InMemorySessionStore` required by Task 1.1.
-   `google-oauth-backend/src/middleware/csrf.middleware.ts`: To implement the CSRF protection middleware.

### Test Files
-   **To be deleted:**
    -   `google-oauth-backend/src/__tests__/middleware/tokenValidation.middleware.spec.ts`
-   **To be rewritten:**
    -   `google-oauth-backend/src/__tests__/controllers/auth.controller.spec.ts`: Heavy rewrite for session-based logic.
    -   `google-oauth-backend/src/__tests__/middleware/gateway.middleware.spec.ts`: Update to mock session and internal JWT creation.
    -   `google-oauth-backend/src/__tests__/server.spec.ts`: Heavy rewrite - currently mocks `tokenStore` and tests JWT-based `/internal-refresh` endpoint.
    -   `google-oauth-backend/src/__tests__/services/jwt.service.spec.ts`: To be updated for internal JWT generation.

---

## Summary of Affected Frontend Files (`sync-forge`)

Based on the plan above, the following files are expected to be impacted during the implementation of Phase 2.

### Files to be Modified
-   `sync-forge/src/stores/auth.ts`: **Heavy rewrite**. To remove all token logic and only manage the user profile.
-   `sync-forge/src/router/index.ts`: To simplify the `beforeEach` navigation guard to only check the Pinia store.
-   `sync-forge/src/views/AuthCallback.vue`: To remove token processing and simply redirect after login.
-   `sync-forge/src/App.vue` (or `main.ts`): To add the initial `/api/users/me` call on application startup.
-   `sync-forge/src/main.ts`: To remove `authPlugin` import and usage.
-   `sync-forge/src/constants/apiEndpoints.ts`: To remove `AUTH_INTERNAL_REFRESH` and add `/api/users/me` endpoint.
-   `sync-forge/src/services/project.service.ts`: To update import from `authApiClient` to new `apiClient`.
-   `sync-forge/src/services/task.service.ts`: To update import from `authApiClient` to new `apiClient`.

### Files to be Deleted
-   `sync-forge/src/services/simpleApiClient.ts`: To be consolidated into `apiClient.ts`.
-   `sync-forge/src/services/authApiClient.ts`: To be consolidated into `apiClient.ts`.
-   `sync-forge/src/plugins/auth.ts`: The `init()` logic for setting up token functions is no longer needed.

### New Files to be Created
-   `sync-forge/src/services/apiClient.ts`: A new, single API client with `withCredentials: true` and new interceptors for CSRF and 401 handling.

### Test Files
-   **To be deleted:**
    -   `sync-forge/src/__tests__/services/simpleApiClient.test.ts`
    -   `sync-forge/src/__tests__/services/authApiClient.test.ts`
    -   `sync-forge/src/__tests__/plugins/auth.test.ts`
-   **To be rewritten:**
    -   `sync-forge/src/__tests__/stores/auth.test.ts`: Heavy rewrite to match the simplified store.
    -   `sync-forge/src/__tests__/views/AuthCallback.test.ts`: Heavy rewrite for the new, simpler component logic.
-   **To be modified:**
    -   `sync-forge/src/__tests__/App.test.ts`: Add tests for the new startup logic.
    -   `sync-forge/src/__tests__/main.test.ts`: Heavy rewrite - currently tests `authPlugin` init and token setup, which are being removed.
-   **To be created:**
    -   `sync-forge/src/__tests__/services/apiClient.test.ts`: Test the consolidated client and its new interceptors.

---

## Environment Variables & Central Config (`config/`)

The project uses a centralized config system at `config/` that generates `.env` files for all services via `npm run env:sync`. This system must be updated for session-based auth.

### Variables to Remove/Replace

| Variable | Services | Change |
|----------|----------|--------|
| `JWT_SECRET` | `google-oauth-backend`, `collab-flow-api` | Replace with `SESSION_SECRET` in gateway; see open question below for API |
| `JWT_EXPIRES_IN` | `google-oauth-backend`, `collab-flow-api` | Remove |
| `shared.JWT_SECRET_LENGTH` | `config/config.json` | Rename to `SESSION_SECRET_LENGTH` |
| `shared.JWT_EXPIRES_IN` | `config/config.json` | Remove or replace with `SESSION_MAX_AGE` |

### New Variables Needed

| Variable | Service | Purpose |
|----------|---------|---------|
| `SESSION_SECRET` | `google-oauth-backend` | Sign session cookies |
| `SESSION_MAX_AGE` | `google-oauth-backend` | Session expiry (e.g., `7d`) |
| `GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY` | `google-oauth-backend` | Encrypt Google refresh token stored in session |

### Files to Update

-   `config/config.json`: Replace JWT config with session config in `shared`.
-   `config/sync.ts`: Update `SharedConfig` interface, `ENV_KEYS`, and `generateEnvContents()`.
-   `config/__tests__/sync.spec.ts`: Update tests for new config shape.

### Open Question: Gateway → `collab-flow-api` Authentication

Currently, the gateway validates the JWT and proxies the request **with the same JWT** to `collab-flow-api`, which also validates it.

With session-based auth, the gateway will read user info from `req.session`, but **how should it pass user identity to `collab-flow-api`?**

**Options:**
1.  **Pass user info as headers** (e.g., `X-User-Id`, `X-User-Email`) — Simple, but requires trust between services.
2.  **Keep internal JWT** between gateway and API — Gateway creates a short-lived JWT from session data for each proxied request.
3.  **Share session store** — Both services read from the same session store (adds coupling).

**Decision (2025-12-09):**
We have decided to proceed with **Option 2: Keep internal JWT**.

**Reasoning:** This pattern provides the best balance of security and decoupling. The `google-oauth-backend` will handle stateful, user-facing session management, while all downstream services (like `collab-flow-api`) can remain stateless. They will only need to validate a standard, short-lived JWT issued by a trusted source (the gateway), minimizing changes to their existing architecture.

---

## Implementation Reference Snippets

These snippets illustrate key implementation details for security-critical or non-obvious parts of the refactor.

### Custom Session Store Interface

```typescript
// google-oauth-backend/src/services/inMemorySession.store.ts
import session from 'express-session'

interface SessionData {
  userId: string
  email: string
  name: string
  encryptedGoogleRefreshToken: string
}

export class InMemorySessionStore extends session.Store {
  private sessions = new Map<string, string>() // sid -> JSON session data
  private userSessions = new Map<string, Set<string>>() // userId -> Set of sids

  get(sid: string, callback: (err?: Error | null, session?: session.SessionData | null) => void): void {
    const data = this.sessions.get(sid)
    callback(null, data ? JSON.parse(data) : null)
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: Error) => void): void {
    this.sessions.set(sid, JSON.stringify(sessionData))

    // Track session by userId for "logout all devices"
    const userId = (sessionData as unknown as SessionData).userId
    if (userId) {
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set())
      }
      this.userSessions.get(userId)!.add(sid)
    }

    callback?.()
  }

  destroy(sid: string, callback?: (err?: Error) => void): void {
    const data = this.sessions.get(sid)
    if (data) {
      const parsed = JSON.parse(data)
      const userId = parsed.userId
      if (userId) {
        this.userSessions.get(userId)?.delete(sid)
      }
    }
    this.sessions.delete(sid)
    callback?.()
  }

  /** Custom method: destroy all sessions for a user (logout everywhere) */
  destroyAllByUserId(userId: string, callback?: (err?: Error) => void): void {
    const sids = this.userSessions.get(userId)
    if (sids) {
      for (const sid of sids) {
        this.sessions.delete(sid)
      }
      this.userSessions.delete(userId)
    }
    callback?.()
  }
}
```

### Session Data Shape

```typescript
// google-oauth-backend/src/types/index.ts
declare module 'express-session' {
  interface SessionData {
    userId: string
    email: string
    name: string
    encryptedGoogleRefreshToken: string
  }
}
```

### express-session Middleware Setup

```typescript
// google-oauth-backend/src/server.ts
import session from 'express-session'
import { InMemorySessionStore } from './services/inMemorySession.store'

const sessionStore = new InMemorySessionStore()

app.use(session({
  store: sessionStore,
  secret: config.session.secret,
  name: `collabflow.sid`,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === `production`,
    sameSite: `lax`,
    maxAge: ms(config.session.maxAge) // e.g., 7 days
  }
}))
```

### CSRF Protection (Double-Submit Cookie Pattern)

```typescript
// google-oauth-backend/src/middleware/csrf.middleware.ts
import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'

const CSRF_COOKIE_NAME = `collabflow.csrf`
const CSRF_HEADER_NAME = `x-csrf-token`

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate CSRF token if not present
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString(`hex`)
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JS
      secure: process.env.NODE_ENV === `production`,
      sameSite: `lax`
    })
  }

  // Skip validation for safe methods
  if ([`GET`, `HEAD`, `OPTIONS`].includes(req.method)) {
    return next()
  }

  // Validate CSRF token for state-changing requests
  const cookieToken = req.cookies[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME]

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: `Invalid CSRF token` })
    return
  }

  next()
}
```

### `/api/users/me` Endpoint

```typescript
// google-oauth-backend/src/controllers/auth.controller.ts
export const handleGetCurrentUser = (req: Request, res: Response): void => {
  if (!req.session?.userId) {
    res.status(401).json({ error: `Not authenticated` })
    return
  }

  res.json({
    id: req.session.userId,
    email: req.session.email,
    name: req.session.name
  })
}

// Response shape (for frontend):
// { id: string, email: string, name: string }
```

### Frontend `apiClient.ts`

```typescript
// sync-forge/src/services/apiClient.ts
import axios from 'axios'

const CSRF_COOKIE_NAME = `collabflow.csrf`
const CSRF_HEADER_NAME = `X-CSRF-Token`

const getCsrfToken = (): string | undefined => {
  const match = document.cookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`))
  return match?.[1]
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_API_URL,
  withCredentials: true
})

// Attach CSRF token to state-changing requests
apiClient.interceptors.request.use((config) => {
  if ([`POST`, `PUT`, `PATCH`, `DELETE`].includes(config.method?.toUpperCase() ?? ``)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      config.headers[CSRF_HEADER_NAME] = csrfToken
    }
  }
  return config
})

// 401 = session expired, hard redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = `/login`
    }
    return Promise.reject(error)
  }
)
```

### Login Flow: Session Creation

```typescript
// google-oauth-backend/src/controllers/auth.controller.ts (handleTokenRequest)
export const handleTokenRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { code, codeVerifier } = req.body

  // ... validate inputs ...

  try {
    const googleTokenData = await exchangeCodeForToken(code, codeVerifier)
    const userData = await validateAccessToken(googleTokenData.access_token)

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        return next(err)
      }

      // Store user data in session
      req.session.userId = userData.id
      req.session.email = userData.email
      req.session.name = userData.name

      // Encrypt and store Google refresh token
      if (googleTokenData.refresh_token) {
        req.session.encryptedGoogleRefreshToken = encrypt(
          googleTokenData.refresh_token,
          config.encryption.key
        )
      }

      req.session.save((err) => {
        if (err) {
          return next(err)
        }
        res.json({ success: true })
      })
    })
  } catch (error) {
    next(error)
  }
}
```