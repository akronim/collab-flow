# Sync-Forge: Unauthenticated Startup Flow

This document details the specific flow of events when the `sync-forge` application starts and no user is authenticated.

**Assumed starting condition:** The user navigates to the root URL (`/`).

1. `main.ts` mounts app with Pinia and Router
2. Router `beforeEach` guard intercepts navigation to `/`
3. Guard calls `await auth.fetchUser()`
4. `fetchUser()` checks if `this.user` is null → yes, so calls `authApiService.getUser()` → `GET /api/auth/me`
   - `apiClient` sends request with `withCredentials: true` (cookies sent, but none exist yet)
   - CSRF interceptor skipped (only applies to POST/PUT/PATCH/DELETE)
5. Backend receives `GET /api/auth/me`
   - Middleware chain: helmet → cors → cookieParser → sessionMiddleware → csrfMiddleware
   - `sessionMiddleware`: no session cookie → `req.session` empty
   - `csrfMiddleware`:
     - No `collabflow.csrf` cookie in request → generates new CSRF token
     - Sets `collabflow.csrf` cookie in response (httpOnly: false, so frontend JS can read it)
     - GET method → skips CSRF validation
   - `handleGetCurrentUser`: checks `req.session.userId` → undefined → returns 401
6. Frontend receives 401 response
   - Browser stores `collabflow.csrf` cookie from response
   - `apiClient` response interceptor: 401 on `/api/auth/me` → no hard redirect (expected for unauthenticated)
   - Error propagated to `authApiService.getUser()` → returns `ApiCallResult.Fail(error)`
   - `fetchUser()` receives failed result → sets `this.user = null` → `isAuthenticated` = false
7. Router guard: route `/` has `requiresAuth: true` and `isAuthenticated` = false → redirect to `/login`
8. User sees the login page

---

## Login Flow (PKCE OAuth)

**Scenario:** User clicks "Sign in with Google" button.

1. User clicks button → `login()` called
2. Generate PKCE code verifier (random 32 bytes, base64url encoded)
3. Store verifier in localStorage via `authStore.setPkceCodeVerifier()`
4. Generate code challenge (SHA-256 hash of verifier, base64url encoded)
5. Build Google OAuth URL with params:
   - `client_id`, `redirect_uri`, `response_type=code`
   - `scope=openid email profile`
   - `code_challenge` and `code_challenge_method=S256`
   - `access_type=offline`, `prompt=consent` (for refresh token)
6. Redirect browser to Google OAuth
7. User authenticates with Google
8. Google redirects to `/auth/callback?code=...`

---

## OAuth Callback Flow

**Scenario:** Google redirects back to app with authorization code.

1. `main.ts` mounts app with Pinia and Router (full page load)
2. Router `beforeEach` guard intercepts navigation to `/auth/callback`
3. Guard calls `await auth.fetchUser()`
4. `fetchUser()` checks if `this.user` is null → yes, so calls `authApiService.getUser()` → `GET /api/auth/me`
   - `apiClient` sends request with `withCredentials: true` (has `collabflow.csrf` cookie from earlier)
   - CSRF interceptor skipped (GET request)
5. Backend receives `GET /api/auth/me`
   - `sessionMiddleware`: no session cookie → `req.session` empty
   - `csrfMiddleware`: has `collabflow.csrf` cookie → no new token generated, GET → skips validation
   - `handleGetCurrentUser`: `req.session.userId` undefined → returns 401
6. Frontend receives 401 response
   - `apiClient` response interceptor: 401 on `/api/auth/me` → no hard redirect
   - `fetchUser()` in `stores/auth.ts` sets `this.user = null` → `isAuthenticated` getter returns false
7. Router guard in `router/index.ts`: `/auth/callback` has no `requiresAuth` meta → `next()` called, navigation proceeds
8. `AuthCallback.vue` mounts
9. `onMounted` extracts `code` from `route.query.code`
10. Gets `codeVerifier` from localStorage via `authStore.getPkceCodeVerifier()`
11. If either missing → redirect to `/login`
12. Calls `authApiService.exchangeToken(code, codeVerifier)` → `POST /api/auth/token`
    - `apiClient` sends request with `withCredentials: true`
    - CSRF interceptor: POST request → reads `collabflow.csrf` cookie, attaches to `x-csrf-token` header
13. Backend receives `POST /api/auth/token`
    - Middleware chain: helmet → cors → cookieParser → sessionMiddleware → csrfMiddleware
    - `sessionMiddleware`: no session cookie → creates empty session
    - `csrfMiddleware`:
      - `collabflow.csrf` cookie exists in request (set during earlier GET /api/auth/me)
      - POST request → validates `x-csrf-token` header matches `collabflow.csrf` cookie value
      - Match → validation passes
    - `handleTokenRequest` controller:
      - Extracts `code` and `codeVerifier` from request body
      - Calls `exchangeCodeForToken(code, codeVerifier)` in `auth.service.ts`
        - POST to Google `https://oauth2.googleapis.com/token` with `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`, `code`, `code_verifier`
        - Google validates code + verifier, returns `{ access_token, refresh_token, ... }`
      - Calls `validateAccessToken(access_token)` in `auth.service.ts`
        - GET to Google `https://www.googleapis.com/oauth2/v3/userinfo` with Bearer token
        - Returns `{ id, email, name, ... }`
      - `req.session.regenerate()` - prevents session fixation attacks
      - Stores in session: `userId`, `email`, `name`
      - If `refresh_token` exists → encrypts with AES-256-GCM, stores as `encryptedGoogleRefreshToken` (for later refreshing Google access token without re-authentication)
      - `req.session.save()` - persists session to store
      - **CSRF Token Rotation:** A new `collabflow.csrf` cookie is generated and sent with the response.
      - Response: `res.status(200).json({ success: true })` (`auth.controller.ts:56`)
      - `express-session` automatically sets `Set-Cookie: collabflow.sid=...` header (configured in `session.middleware.ts:9`)
        - httpOnly: true (not accessible by JavaScript), secure in production, sameSite: lax
        - Used to identify user's session on subsequent requests
14. sync-forge's `AuthCallback.vue` receives 200 response
    - Browser stores `collabflow.sid` session cookie and the **new** `collabflow.csrf` cookie.
    - `authApiService.exchangeToken()` returns `ApiCallResult.Success`
15. `result.isSuccess()` → calls `authStore.fetchUser()`
16. `fetchUser()` calls `GET /api/auth/me`
    - `apiClient` sends request with `withCredentials: true`
    - Cookies sent: `collabflow.sid` (session), `collabflow.csrf` (CSRF token)
17. Backend receives `GET /api/auth/me`
    - `sessionMiddleware`: has `collabflow.sid` cookie → extracts session ID from the cookie, loads session data from store → populates `req.session` with `userId`, `email`, `name`, etc.
    - `csrfMiddleware`: GET → skips validation
    - `handleGetCurrentUser`: `req.session.userId` exists → returns `{ id, email, name }`
18. `fetchUser()` receives success → sets `this.user = { id, email, name }` → `isAuthenticated` = true
19. `AuthCallback.vue`: `router.replace('/')` → navigates to home
20. `finally` block: `authStore.clearPkceCodeVerifier()` → clears verifier from localStorage
21. Router `beforeEach` guard intercepts navigation to `/`
22. Guard calls `auth.fetchUser()` → `this.user` already exists → skips API call
23. Route `/` has `requiresAuth: true`, `isAuthenticated` = true → `next()` called, navigation proceeds
24. User sees the home page (authenticated)

---

## Authenticated Request Flow - Getting Projects

**Scenario:** User on `ProjectsView.vue`, `onMounted` calls `projectStore.fetchProjects()`

1. `ProjectsView.vue` `onMounted` calls `projectStore.fetchProjects()`
2. `fetchProjects()` calls `projectApiService.getAllProjects()` → `GET /api/projects`
   - `apiClient` sends request with `withCredentials: true`
   - Cookies sent: `collabflow.sid` (session), `collabflow.csrf` (CSRF token)
   - CSRF interceptor skipped (GET request)
3. `google-oauth-backend` receives `GET /api/projects`
   - Middleware chain: helmet → cors → cookieParser → sessionMiddleware → csrfMiddleware
   - `sessionMiddleware`: has `collabflow.sid` cookie → loads session data
   - `csrfMiddleware`: GET → skips validation
   - Routes: `authRoutes` don't match → falls through to `gatewayRouter`
   - `gatewayRouter`: `requireSession` middleware → checks `req.session.userId` exists → passes
   - `gatewayProxy` middleware:
     - Creates internal JWT from session data (`userId`, `email`, `name`)
     - Sets `Authorization: Bearer <jwt>` header
     - Removes `cookie` header (downstream doesn't need it)
     - Proxies to `collab-flow-api` at `/api/projects`
4. `collab-flow-api` receives `GET /api/projects`
   - Middleware: `authGatewayMiddleware` → extracts JWT from `Authorization` header → verifies → attaches `req.user`
   - Route: `/api/projects` → `projectController.getProjects`
   - Returns projects array
5. Response flows back: `collab-flow-api` → `google-oauth-backend` (gateway) → `sync-forge`
6. `fetchProjects()` receives success → sets `this.projects = result.data`

---

## Logout Flow

*TODO*

---

## Session Expiry Handling

*TODO*

---

## Potential Issues / Improvements

### 1. `fetchUser()` Called on Every Navigation
In `router/index.ts:54`, `await auth.fetchUser()` is called on every route change. While there's an early return if `this.user` exists, this means:
- If user is already loaded → no API call (good)
- But if something clears `this.user` → API call every navigation

This is probably fine, but could be more explicit about intent.

### 2. No Token Refresh Logic on Frontend
The backend stores `encryptedGoogleRefreshToken` and has `refreshAccessToken()` in `auth.service.ts`, but it's not used anywhere. The Google access token will expire, but there's no mechanism to refresh it.

### 3. Internal JWT Expiry
The gateway creates JWTs for downstream services. Need to verify in `jwt.service.ts` if these have short expiry times. If they're long-lived, a compromised internal network could be problematic.

### 4. `requireSession` vs Route-Level Protection
The gateway uses `requireSession` middleware for all proxied routes. This is good, but it means ALL downstream routes require auth. If you ever need a public API endpoint, you'd need to restructure.

