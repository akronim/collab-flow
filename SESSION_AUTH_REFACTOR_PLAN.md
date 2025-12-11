# Session-Based Authentication Refactor Plan

This document outlines the high-level plan to refactor the authentication mechanism from a token-based (JWT) architecture to a traditional session-based one.

**Primary Goals:**
1.  Simplify the frontend authentication logic by removing token management and silent refreshes.
2.  Implement a "logout from all devices" feature.

**Key Trade-Offs & Warnings:**
- **Stateful Backend:** This moves complexity from the frontend to the backend. The `google-oauth-backend` will become a stateful service. While a persistent, shared session store (e.g., PostgreSQL) is required for scalability, we will start with a temporary in-memory store for initial development.
- **CSRF Protection:** A session-based architecture is more vulnerable to Cross-Site Request Forgery (CSRF). Implementing robust CSRF protection (e.g., Double Submit Cookie pattern) is a **critical and mandatory** part of this refactor for all state-changing endpoints.

---

## Architecture Overview

### Two-Secret Strategy

The refactored system uses **two separate secrets** for different purposes:

| Secret | Purpose | Used By |
|--------|---------|---------|
| `SESSION_SECRET` | Sign session cookies (user-facing) | `google-oauth-backend` only |
| `INTERNAL_JWT_SECRET` | Sign internal JWTs for service-to-service auth | `google-oauth-backend` + `collab-flow-api` |

**Why two secrets?**
- Session cookies are user-facing and handled by `express-session`
- Internal JWTs allow `collab-flow-api` to remain stateless while trusting the gateway
- Separation of concerns: compromising one doesn't compromise the other

### Request Flow After Refactor

```
Browser                    google-oauth-backend              collab-flow-api
   │                              │                               │
   │ GET /api/projects            │                               │
   │ Cookie: collabflow.sid=xxx   │                               │
   │─────────────────────────────>│                               │
   │                              │ 1. express-session validates  │
   │                              │    session cookie             │
   │                              │ 2. Read user from req.session │
   │                              │ 3. Create short-lived internal│
   │                              │    JWT (5min expiry)          │
   │                              │ 4. Proxy with Authorization:  │
   │                              │    Bearer <internal-jwt>      │
   │                              │──────────────────────────────>│
   │                              │                               │ Verify internal JWT
   │                              │                               │ Process request
   │                              │<──────────────────────────────│
   │<─────────────────────────────│                               │
```

---

## Phase 1: Backend Refactor (`google-oauth-backend`)

### Task 1.1: Introduce a Custom Session Store
-   **Note:** While `express-session` will be used for core middleware functionality, a **custom store** is required to support the "logout everywhere" feature.
-   [ ] Create a simple `InMemorySessionStore` class that implements the `express-session` store interface (`get`, `set`, `destroy`, `touch`) and adds our own custom `destroyAllByUserId(userId)` method. This is a temporary solution.
-   [ ] **TODO:** The custom `InMemorySessionStore` will later be swapped with a `PostgresSessionStore` that uses `connect-pg` and implements the same interface.
-   [ ] Add and configure the `express-session` middleware to use our new custom `InMemorySessionStore`.

### Task 1.2: Implement CSRF Protection
-   [ ] Choose a CSRF mitigation strategy (e.g., `csurf` library or a manual implementation of the Double Submit Cookie pattern).
-   [ ] Add middleware to generate and validate CSRF tokens for all state-changing requests (POST, PUT, PATCH, DELETE).
-   [ ] **Important:** The CSRF cookie is set on ANY request if missing (including GET). This ensures the frontend has the token before making its first POST.

### Task 1.3: Update Authentication Flow
-   [ ] **Login (`/api/auth/token`):**
    -   [ ] **Security:** Immediately after successful Google authentication, call `req.session.regenerate()` to create a new, clean session and prevent session fixation attacks.
    -   [ ] Remove public-facing JWT generation from the login flow and delete the old `tokenStore.service.ts`.
    -   [ ] **Security:** Encrypt the `google_refresh_token` using an application-level secret before storing it in the session object.
    -   [ ] Store minimal user profile information (like `userId`) and the encrypted Google Refresh Token in `req.session`.
-   [ ] **Logout (`/api/auth/logout`):**
    -   [ ] The handler must find the `userId` from the current session.
    -   [ ] It must then call the custom store's `destroyAllByUserId(userId)` method to delete all sessions associated with that user.
    -   [ ] This ensures that logging out on one device logs the user out everywhere.
-   [ ] **Refresh (`/api/auth/internal-refresh`):**
    -   [ ] This endpoint is no longer needed and can be **deleted**.
-   [ ] **Get Current User (`/api/auth/me`):**
    -   [ ] **New endpoint.** Add a route and controller to return the current user's profile from `req.session`.
    -   [ ] If no valid session exists, return 401.
    -   [ ] This endpoint is called by the frontend on app startup to restore auth state.

### Task 1.4: Update Gateway Middleware
-   [ ] The `tokenValidationMiddleware` will be replaced by a simpler `requireSession` middleware that checks `req.session.userId`.
-   [ ] The `gatewayProxy` middleware will be updated to:
    -   [ ] Read user information from `req.session`.
    -   [ ] Use `jwt.service.ts` (now configured with `INTERNAL_JWT_SECRET`) to create a new, short-lived internal JWT (5 min expiry).
    -   [ ] Set this new JWT in the `Authorization` header of the request being proxied to downstream services like `collab-flow-api`.

### Task 1.5: Update Server Middleware Order
-   [ ] **Critical:** Middleware must be registered in this order in `server.ts`:
    1. `cookie-parser` (required by express-session and CSRF)
    2. `express.json()` / `express.urlencoded()`
    3. `express-session`
    4. `csrfMiddleware`
    5. Routes (auth routes, gateway routes)
    6. Error handler

---

## Phase 2: Backend Refactor (`collab-flow-api`)

### Task 2.1: Update Configuration
-   [ ] **`config/index.ts`:**
    -   [ ] Rename `JWT_SECRET` to `INTERNAL_JWT_SECRET` in required env vars.
    -   [ ] Remove `JWT_EXPIRES_IN` (expiry is now controlled by the gateway; API only verifies).
    -   [ ] Update `config.jwt.secret` reference to use the new env var name.

**Note:** The `auth.middleware.ts` file requires no changes - it already correctly verifies JWTs using `config.jwt.secret`.

---

## Phase 3: Frontend Refactor (`sync-forge`)

### Task 3.1: Consolidate API Clients & Remove Token-Based Logic
-   [ ] **Merge `simpleApiClient.ts` and `authApiClient.ts` into a single `apiClient.ts`:**
    -   [ ] The new client uses `withCredentials: true` for all requests (session cookie).
    -   [ ] Remove the request interceptor that adds the `Authorization: Bearer` header (no longer needed).
    -   [ ] The 401 response interceptor will be updated in Task 3.3.
-   [ ] **`stores/auth.ts`:**
    -   [ ] Gut the store. Remove `accessToken`, `expiresAt`, proactive refresh timers, and all refresh logic.
    -   [ ] The store will only be responsible for holding the user's profile (`user`) and an `isAuthenticated` flag.

### Task 3.2: Implement CSRF Handling
-   [ ] **`services/apiClient.ts`:**
    -   [ ] Add a request interceptor to read the CSRF token from the `collabflow.csrf` cookie and attach it to all state-changing requests (POST, PUT, PATCH, DELETE) via the `X-CSRF-Token` header.

### Task 3.3: Update Application Startup & Routing
-   [ ] **Application Startup (e.g., in `main.ts` or `App.vue`):**
    -   [ ] On initial app load, make a single API call to `/api/auth/me` to fetch the current user's data.
    -   [ ] If the call is successful, populate the Pinia auth store. The user is now considered logged in.
    -   [ ] If the call fails with a 401, the user is not logged in.
    -   [ ] **Note:** This GET request also sets the CSRF cookie if missing, preparing the app for POST requests.
-   [ ] **`router/index.ts`:**
    -   [ ] The `beforeEach` guard should no longer make an API call. It should simply check the user's status in the Pinia store (`auth.isAuthenticated`).
-   [ ] **`services/apiClient.ts`:**
    -   [ ] Update the 401 response interceptor to trigger a hard redirect to the login page (e.g., `window.location.href = '/login'`), as a 401 is now a fatal session error.
    -   [ ] **Exception:** The `/api/auth/me` endpoint should NOT trigger a redirect on 401 (it's expected to fail for unauthenticated users).
-   [ ] **`AuthCallback.vue`:**
    -   [ ] The callback will no longer expect a token. After the backend call, it should redirect to the main app, which will then trigger the app startup logic to fetch the user data.

---

## Summary of Affected Backend Files (`google-oauth-backend`)

Based on the plan above, the following files are expected to be impacted during the implementation of Phase 1.

### Files to be Modified
-   `google-oauth-backend/src/server.ts`: To register the new `express-session` and CSRF middleware in correct order.
-   `google-oauth-backend/src/controllers/auth.controller.ts`: To rewrite login/logout logic for sessions instead of tokens.
-   `google-oauth-backend/src/routes/auth.routes.ts`: To remove the obsolete `/internal-refresh` route and add `/auth/me` route.
-   `google-oauth-backend/src/routes/gateway.routes.ts`: To replace `tokenValidationMiddleware` with session-based auth check.
-   `google-oauth-backend/src/middleware/gateway.middleware.ts`: To read user identity from `req.session` and create/attach internal JWT for downstream services.
-   `google-oauth-backend/src/services/jwt.service.ts`: To be reconfigured to use `INTERNAL_JWT_SECRET` and shorter expiry for internal JWTs.
-   `google-oauth-backend/src/config/index.ts`: To replace JWT env vars with session + internal JWT config.
-   `google-oauth-backend/src/constants/index.ts`: To remove `INTERNAL_REFRESH` endpoint and add `ME` endpoint.
-   `google-oauth-backend/src/types/index.ts`: To update `Express.Request` augmentation for session data and add session type definitions.

### Files to be Deleted
-   `google-oauth-backend/src/services/tokenStore.service.ts`: Replaced by the new session store.
-   `google-oauth-backend/src/middleware/tokenValidation.middleware.ts`: Replaced by `express-session` middleware + `requireSession`.

### New Files to be Created
-   `google-oauth-backend/src/services/inMemorySession.store.ts`: To implement the custom `InMemorySessionStore` required by Task 1.1.
-   `google-oauth-backend/src/middleware/csrf.middleware.ts`: To implement the CSRF protection middleware.
-   `google-oauth-backend/src/middleware/requireSession.middleware.ts`: Simple middleware to check `req.session.userId` exists.
-   `google-oauth-backend/src/utils/encryption.ts`: To implement encrypt/decrypt functions for Google refresh token.

### Test Files
-   **To be deleted:**
    -   `google-oauth-backend/src/__tests__/middleware/tokenValidation.middleware.spec.ts`
-   **To be rewritten:**
    -   `google-oauth-backend/src/__tests__/controllers/auth.controller.spec.ts`: Heavy rewrite for session-based logic.
    -   `google-oauth-backend/src/__tests__/middleware/gateway.middleware.spec.ts`: Update to mock session and internal JWT creation.
    -   `google-oauth-backend/src/__tests__/server.spec.ts`: Heavy rewrite - currently mocks `tokenStore` and tests JWT-based `/internal-refresh` endpoint.
    -   `google-oauth-backend/src/__tests__/services/jwt.service.spec.ts`: To be updated for internal JWT generation.
-   **To be created:**
    -   `google-oauth-backend/src/__tests__/services/inMemorySession.store.spec.ts`
    -   `google-oauth-backend/src/__tests__/middleware/csrf.middleware.spec.ts`
    -   `google-oauth-backend/src/__tests__/middleware/requireSession.middleware.spec.ts`
    -   `google-oauth-backend/src/__tests__/utils/encryption.spec.ts`

---

## Summary of Affected Backend Files (`collab-flow-api`)

### Files to be Modified
-   `collab-flow-api/src/config/index.ts`: Rename `JWT_SECRET` → `INTERNAL_JWT_SECRET`, remove `JWT_EXPIRES_IN`.

### Test Files
-   **To be modified:**
    -   `collab-flow-api/src/__tests__/middleware/auth.middleware.spec.ts`: Update to use new env var name if mocked.

---

## Summary of Affected Frontend Files (`sync-forge`)

Based on the plan above, the following files are expected to be impacted during the implementation of Phase 3.

### Files to be Modified
-   `sync-forge/src/stores/auth.ts`: **Heavy rewrite**. To remove all token logic and only manage the user profile.
-   `sync-forge/src/router/index.ts`: To simplify the `beforeEach` navigation guard to only check the Pinia store.
-   `sync-forge/src/views/AuthCallback.vue`: To remove token processing and simply redirect after login.
-   `sync-forge/src/App.vue` (or `main.ts`): To add the initial `/api/auth/me` call on application startup.
-   `sync-forge/src/main.ts`: To remove `authPlugin` import and usage.
-   `sync-forge/src/constants/apiEndpoints.ts`: To remove `AUTH_INTERNAL_REFRESH` and add `/api/auth/me` endpoint.
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

### Variables to Remove

| Variable | Services | Reason |
|----------|----------|--------|
| `JWT_SECRET` | `google-oauth-backend`, `collab-flow-api` | Replaced by two new secrets |
| `JWT_EXPIRES_IN` | `google-oauth-backend`, `collab-flow-api` | Session has `maxAge`; internal JWT has fixed short expiry |
| `shared.JWT_SECRET_LENGTH` | `config/config.json` | Replaced by new length configs |
| `shared.JWT_EXPIRES_IN` | `config/config.json` | Removed |

### New Variables

| Variable | Service(s) | Purpose |
|----------|------------|---------|
| `SESSION_SECRET` | `google-oauth-backend` | Sign session cookies |
| `SESSION_MAX_AGE` | `google-oauth-backend` | Session expiry (e.g., `7d`) |
| `INTERNAL_JWT_SECRET` | `google-oauth-backend`, `collab-flow-api` | Sign/verify internal JWTs |
| `INTERNAL_JWT_EXPIRES_IN` | `google-oauth-backend` | Internal JWT expiry (e.g., `5m`) |
| `GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY` | `google-oauth-backend` | Encrypt Google refresh token in session |

### Updated `config/config.json` Structure

```json
{
  "development": {
    "shared": {
      "SESSION_SECRET_LENGTH": 64,
      "INTERNAL_JWT_SECRET_LENGTH": 64,
      "SESSION_MAX_AGE": "7d",
      "INTERNAL_JWT_EXPIRES_IN": "5m",
      "ENCRYPTION_KEY_LENGTH": 32,
      "APP_TITLE": "CollabFlow"
    },
    "ports": {
      "collab_flow_api": 3002,
      "google_oauth_backend": 3001,
      "sync_forge": 5173
    },
    "secrets": {
      "GOOGLE_CLIENT_ID": "your-google-client-id.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "your-google-client-secret"
    }
  }
}
```

### Files to Update

-   `config/config.json`: Replace JWT config with session + internal JWT config.
-   `config/sync.ts`: Update `SharedConfig` interface, `ENV_KEYS`, and `generateEnvContents()`.
-   `config/__tests__/sync.spec.ts`: Update tests for new config shape.

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

  /** Optional: refresh session expiry without modifying data */
  touch(sid: string, session: session.SessionData, callback?: (err?: Error) => void): void {
    // For in-memory store, touch is effectively a no-op since we don't track expiry
    // A real implementation would update the expiry timestamp
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
import cookieParser from 'cookie-parser'
import { InMemorySessionStore } from './services/inMemorySession.store'
import { csrfMiddleware } from './middleware/csrf.middleware'

// Export for use in gateway routes
export const sessionStore = new InMemorySessionStore()

// MIDDLEWARE ORDER IS CRITICAL
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(session({
  store: sessionStore,
  secret: config.session.secret,
  name: `collabflow.sid`,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === `production`,
    sameSite: `lax`,  // 'lax' allows cookie on OAuth redirect
    maxAge: ms(config.session.maxAge) // e.g., 7 days
  }
}))

app.use(csrfMiddleware)

// Routes come AFTER middleware
app.use(`/api/auth`, authRoutes)
app.use(`/api`, gatewayRoutes)

// Error handler last
app.use(errorMiddleware)
```

### CSRF Protection (Double-Submit Cookie Pattern)

```typescript
// google-oauth-backend/src/middleware/csrf.middleware.ts
import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import config from '../config'

const CSRF_COOKIE_NAME = `collabflow.csrf`
const CSRF_HEADER_NAME = `x-csrf-token`

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate CSRF token if not present (on ANY request, including GET)
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString(`hex`)
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JS
      secure: config.nodeEnv === `production`,
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

### Require Session Middleware

```typescript
// google-oauth-backend/src/middleware/requireSession.middleware.ts
import type { Request, Response, NextFunction } from 'express'

export const requireSession = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session?.userId) {
    res.status(401).json({ error: `Not authenticated` })
    return
  }
  next()
}
```

### `/api/auth/me` Endpoint

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

### Gateway Middleware (Internal JWT Creation)

```typescript
// google-oauth-backend/src/middleware/gateway.middleware.ts (updated proxyReq handler)
import jwtService from '../services/jwt.service'

// In gatewayProxyOptions.on.proxyReq:
proxyReq: (proxyReq, req: http.IncomingMessage, _res: http.ServerResponse | net.Socket) => {
  const expressReq = req as Request

  // Create internal JWT from session data
  if (expressReq.session?.userId) {
    const internalToken = jwtService.sign({
      id: expressReq.session.userId,
      email: expressReq.session.email,
      name: expressReq.session.name
    })
    proxyReq.setHeader(`Authorization`, `Bearer ${internalToken}`)
  }

  // Remove session cookie - downstream services don't need it
  proxyReq.removeHeader(`cookie`)

  // ... rest of existing body forwarding logic ...
}
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
// Exception: /api/auth/me is expected to return 401 for unauthenticated users
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthMeEndpoint = error.config?.url?.includes(`/api/auth/me`)
    if (error.response?.status === 401 && !isAuthMeEndpoint) {
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

### Encryption Utility

```typescript
// google-oauth-backend/src/utils/encryption.ts
import crypto from 'crypto'

const ALGORITHM = `aes-256-gcm`
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

export const encrypt = (plaintext: string, key: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, `hex`), iv)

  let encrypted = cipher.update(plaintext, `utf8`, `hex`)
  encrypted += cipher.final(`hex`)

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString(`hex`)}:${authTag.toString(`hex`)}:${encrypted}`
}

export const decrypt = (ciphertext: string, key: string): string => {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(`:`)

  const iv = Buffer.from(ivHex, `hex`)
  const authTag = Buffer.from(authTagHex, `hex`)
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, `hex`), iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, `hex`, `utf8`)
  decrypted += decipher.final(`utf8`)

  return decrypted
}
```

---

## Implementation Order (Recommended)

To minimize risk and allow incremental testing:

### Step 1: Config System (no runtime changes)
1. Update `config/config.json` with new structure
2. Update `config/sync.ts` with new interfaces and generation logic
3. Update `config/__tests__/sync.spec.ts`
4. Run `npm run env:sync` to generate new `.env` files

### Step 2: Backend Foundation (new files, no breaking changes)
5. Create `inMemorySession.store.ts`
6. Create `csrf.middleware.ts`
7. Create `requireSession.middleware.ts`
8. Create `utils/encryption.ts`
9. Write tests for all new files

### Step 3: Backend Integration (breaking changes)
10. Update `config/index.ts` to use new env vars
11. Update `server.ts` with new middleware
12. Update `auth.controller.ts` for session-based login/logout
13. Add `/auth/me` endpoint
14. Update `gateway.middleware.ts` for internal JWT creation
15. Update `gateway.routes.ts` to use `requireSession`
16. Delete `tokenStore.service.ts` and `tokenValidation.middleware.ts`
17. Rewrite affected tests

### Step 4: collab-flow-api (minimal changes)
18. Update `config/index.ts` env var name
19. Update tests if needed

### Step 5: Frontend (after backend is stable)
20. Create `apiClient.ts`
21. Update `stores/auth.ts`
22. Update `router/index.ts`
23. Update `AuthCallback.vue`
24. Add startup logic to `App.vue` or `main.ts`
25. Update service files to use new client
26. Delete old client files and plugin
27. Rewrite affected tests

### Step 6: Cleanup
28. Remove old env vars from config
29. Update `AUTH_FLOW.md` documentation
30. Final integration testing




	modified:   config/__tests__/sync.spec.ts
	modified:   config/config.json
	modified:   config/sync.ts
	modified:   google-oauth-backend/package-lock.json
	modified:   google-oauth-backend/package.json
	modified:   google-oauth-backend/src/__tests__/controllers/auth.controller.spec.ts
	modified:   google-oauth-backend/src/__tests__/middleware/gateway.middleware.spec.ts
	deleted:    google-oauth-backend/src/__tests__/middleware/tokenValidation.middleware.spec.ts
	modified:   google-oauth-backend/src/__tests__/server.spec.ts
	modified:   google-oauth-backend/src/config/index.ts
	modified:   google-oauth-backend/src/constants/index.ts
	modified:   google-oauth-backend/src/controllers/auth.controller.ts
	modified:   google-oauth-backend/src/middleware/gateway.middleware.ts
	deleted:    google-oauth-backend/src/middleware/tokenValidation.middleware.ts
	modified:   google-oauth-backend/src/routes/auth.routes.ts
	modified:   google-oauth-backend/src/routes/gateway.routes.ts
	modified:   google-oauth-backend/src/server.ts
	modified:   google-oauth-backend/src/services/jwt.service.ts
	modified:   google-oauth-backend/src/types/index.ts

	google-oauth-backend/src/__tests__/middleware/requireSession.middleware.spec.ts
	google-oauth-backend/src/__tests__/utils/
	google-oauth-backend/src/middleware/requireSession.middleware.ts
	google-oauth-backend/src/services/sessionStore.service.ts
	google-oauth-backend/src/utils/encryption.ts
