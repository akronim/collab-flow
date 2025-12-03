# Authentication Flow

## Overview

This document describes the authentication flow for CollabFlow. The system uses Google OAuth 2.0 with PKCE for secure authentication.

**Key security features:**
- Access token stored in memory (not localStorage)
- Refresh token stored in HttpOnly cookie (browser handles it automatically)
- PKCE prevents authorization code interception
- Backend keeps Google `client_secret` confidential

## Components

| Component | Purpose |
|-----------|---------|
| `sync-forge` | Vue.js frontend |
| `google-oauth-backend` | Auth backend - exchanges codes, issues internal JWTs |
| `collab-flow-api` | Resource API - verifies internal JWTs, serves data |

## Token Architecture

```
Google tokens (handled by backend only):
├── google_access_token  → Used to fetch user info from Google
└── google_refresh_token → Stored in tokenStore, mapped to internal_refresh_token

Internal tokens (used by frontend):
├── internal_access_token → JWT with user info, stored in memory, expires in 15min
└── internal_refresh_token → HttpOnly cookie, expires in 30 days
```

---

## Flow 1: Login

```
User          Frontend                    Backend                      Google
 │               │                           │                            │
 │ click login   │                           │                            │
 │──────────────>│                           │                            │
 │               │                           │                            │
 │               │ generate PKCE             │                            │
 │               │ (verifier + challenge)    │                            │
 │               │ store verifier in         │                            │
 │               │ localStorage              │                            │
 │               │                           │                            │
 │<──────────────│ redirect to Google        │                            │
 │               │ with challenge            │                            │
 │               │                           │                            │
 │───────────────────────────────────────────────────────────────────────>│
 │               │                           │              user consents │
 │<───────────────────────────────────────────────────────────────────────│
 │               │ redirect to /auth/callback│                            │
 │               │ with ?code=xxx            │                            │
 │               │                           │                            │
 │──────────────>│                           │                            │
 │               │ POST /api/auth/token      │                            │
 │               │ { code, codeVerifier }    │                            │
 │               │──────────────────────────>│                            │
 │               │                           │ exchange code with Google  │
 │               │                           │ (includes client_secret)   │
 │               │                           │───────────────────────────>│
 │               │                           │<───────────────────────────│
 │               │                           │ google tokens received     │
 │               │                           │                            │
 │               │                           │ fetch user info from Google│
 │               │                           │───────────────────────────>│
 │               │                           │<───────────────────────────│
 │               │                           │                            │
 │               │                           │ store google_refresh_token │
 │               │                           │ in tokenStore              │
 │               │                           │                            │
 │               │                           │ generate internal JWT      │
 │               │                           │ (contains user id, email,  │
 │               │                           │  name)                     │
 │               │                           │                            │
 │               │<──────────────────────────│                            │
 │               │ response:                 │                            │
 │               │ - body: internal_access_token, expires_in              │
 │               │ - cookie: internal_refresh_token (HttpOnly)            │
 │               │                           │                            │
 │               │ decode JWT to get user    │                            │
 │               │ store token in memory     │                            │
 │               │ schedule proactive refresh│                            │
 │               │ clear PKCE verifier       │                            │
 │               │ redirect to /             │                            │
 │<──────────────│                           │                            │
```

### Step-by-step

1. **LoginView.vue** - User clicks "Sign in with Google"
   - Generate PKCE `code_verifier` (random string) and `code_challenge` (SHA256 hash)
   - Store `code_verifier` in localStorage
   - Redirect to Google with `code_challenge`

2. **Google** - User authenticates and consents
   - Redirects back to `/auth/callback?code=xxx`

3. **AuthCallback.vue** - Handle the callback
   - Extract `code` from URL
   - Get `code_verifier` from localStorage
   - POST to `/api/auth/token` with both

4. **Backend handleTokenRequest** - Exchange code for tokens
   - Send `code`, `code_verifier`, `client_secret` to Google
   - Receive `google_access_token` and `google_refresh_token`
   - Fetch user info from Google using `google_access_token`
   - Store `google_refresh_token` in tokenStore (maps to new UUID)
   - Generate internal JWT containing `{ id, email, name }`
   - Return `internal_access_token` in response body
   - Set `internal_refresh_token` as HttpOnly cookie

5. **AuthCallback.vue** - Store auth data
   - Call `authStore.setAuthData(token, expiresIn)`
   - Decode JWT to extract user info (no second API call needed)
   - Store token in memory
   - Schedule proactive refresh
   - Clear PKCE verifier from localStorage
   - Redirect to home

---

## Flow 2: Page Refresh / Return Visit

When user refreshes the page or returns later, the in-memory token is lost. The router guard attempts silent refresh.

```
User          Frontend                    Backend
 │               │                           │
 │ navigate to   │                           │
 │ protected     │                           │
 │ route         │                           │
 │──────────────>│                           │
 │               │                           │
 │               │ router guard checks       │
 │               │ auth.isAuthenticated      │
 │               │ (false - no token in      │
 │               │  memory)                  │
 │               │                           │
 │               │ POST /api/auth/internal-refresh
 │               │ (empty body, browser sends│
 │               │  HttpOnly cookie)         │
 │               │──────────────────────────>│
 │               │                           │ read cookie
 │               │                           │ lookup google_refresh_token
 │               │                           │ refresh with Google
 │               │                           │ generate new internal JWT
 │               │<──────────────────────────│
 │               │ new token received        │
 │               │                           │
 │               │ store in memory           │
 │               │ allow navigation          │
 │<──────────────│                           │
```

### Code path

1. **router/index.ts** - beforeEach guard
   ```typescript
   if (to.meta.requiresAuth && !auth.isAuthenticated) {
     await auth.refreshAccessToken()
   }
   ```

2. **auth.ts** - refreshAccessToken
   - POST to `/api/auth/internal-refresh` with empty body
   - Browser automatically sends HttpOnly cookie
   - On success: call `setAuthData()` with new token

3. **Backend handleInternalTokenRefresh**
   - Read `internal_refresh_token` from cookie
   - Lookup corresponding `google_refresh_token` in tokenStore
   - Refresh with Google to get new `google_access_token`
   - Generate new internal JWT
   - Rotate refresh token (delete old, create new)
   - Return new tokens

---

## Flow 3: API Calls to collab-flow-api

Protected API calls go through the gateway (google-oauth-backend proxies to collab-flow-api).

```
Frontend                    Backend (gateway)              collab-flow-api
 │                           │                              │
 │ GET /api/projects         │                              │
 │ Authorization: Bearer xxx │                              │
 │──────────────────────────>│                              │
 │                           │ verify internal JWT          │
 │                           │ (tokenSwap middleware)       │
 │                           │                              │
 │                           │ proxy request                │
 │                           │ X-User-Id: 123               │
 │                           │ X-User-Email: foo@bar.com    │
 │                           │─────────────────────────────>│
 │                           │                              │ handle request
 │                           │<─────────────────────────────│
 │<──────────────────────────│                              │
```

### authApiClient.ts behavior

- Request interceptor: attaches `Authorization: Bearer <token>` header
- Response interceptor: on 401, triggers `refreshAccessToken()` and retries

---

## Flow 4: Proactive Token Refresh

Tokens are refreshed 5 minutes before expiry to prevent interruptions.

```typescript
// auth.ts
scheduleProactiveRefresh(expiresInSeconds: number) {
  const BUFFER_TIME_MS = 5 * 60 * 1000  // 5 minutes
  const timeoutMs = (expiresInSeconds * 1000) - BUFFER_TIME_MS

  setTimeout(() => {
    this.refreshAccessToken()
  }, timeoutMs)
}
```

---

## Flow 5: Logout

```
Frontend                    Backend
 │                           │
 │ POST /api/auth/logout     │
 │ (cookie sent by browser)  │
 │──────────────────────────>│
 │                           │ delete token from tokenStore
 │                           │ clear cookie (maxAge: 0)
 │<──────────────────────────│
 │                           │
 │ clear in-memory state     │
 │ redirect to /login        │
```

---

## Token Storage Summary

| Token | Storage | Why |
|-------|---------|-----|
| `code_verifier` | localStorage | Must survive redirect to Google and back |
| `internal_access_token` | In-memory | XSS protection - not accessible via JS injection |
| `internal_refresh_token` | HttpOnly cookie | XSS protection - browser handles it, JS can't read it |
| `google_refresh_token` | Backend tokenStore | Never exposed to frontend |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/token` | POST | Exchange auth code for tokens |
| `/api/auth/internal-refresh` | POST | Refresh access token (uses cookie) |
| `/api/auth/logout` | POST | Clear session |

---

## Files Reference

### Frontend (sync-forge)

| File | Purpose |
|------|---------|
| `views/LoginView.vue` | Initiates OAuth flow with PKCE |
| `views/AuthCallback.vue` | Handles redirect, exchanges code |
| `stores/auth.ts` | Token state, refresh logic, user data |
| `router/index.ts` | Route guard, silent refresh |
| `services/simpleApiClient.ts` | Auth API calls (withCredentials: true) |
| `services/authApiClient.ts` | Resource API calls (Bearer token) |

### Backend (google-oauth-backend)

| File | Purpose |
|------|---------|
| `controllers/auth.controller.ts` | Token exchange, refresh, logout handlers |
| `services/auth.service.ts` | Google API calls |
| `services/jwt.service.ts` | Internal JWT signing/verification |
| `services/tokenStore.service.ts` | Maps internal ↔ Google refresh tokens |
| `middleware/tokenSwap.middleware.ts` | Verifies internal JWT for gateway |
| `middleware/gateway.middleware.ts` | Proxies to collab-flow-api |

---

## Potential Improvements

These are not critical but worth considering for production:

1. **tokenStore is in-memory**
   - Server restart logs everyone out
   - TODO: Move to PostgreSQL when database is added

2. **No CSRF protection on logout**
   - `/api/auth/logout` uses cookie, malicious site could trigger logout via CSRF
   - Low severity (just logs user out, no data leak)
   - Fix: add CSRF token or check `Origin` header

3. **Refresh token lives 30 days**
   - If stolen (e.g., via browser exploit), attacker has long access window
   - Consider shorter lifetime or refresh token rotation with reuse detection

4. **No logout on all devices**
   - User can only log out current session
   - No "log out everywhere" mechanism
   - Would need to track all refresh tokens per user in database
