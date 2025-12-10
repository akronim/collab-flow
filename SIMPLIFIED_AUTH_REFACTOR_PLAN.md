# Simplified Auth Refactor Plan

This document outlines a minimal refactor to achieve three goals without switching to session-based authentication.

**Goals:**
1. "Logout from all devices" capability
2. Simpler frontend (remove refresh token logic)
3. Better Swagger experience (OAuth2 flow in any environment)

**Approach:** Keep JWT-based auth, but simplify by using longer-lived access tokens and adding token tracking for "logout everywhere".

---

## What Changes

| Current | After |
|---------|-------|
| 15-min access token + 30-day refresh token | 7-day access token, no refresh token |
| `tokenStore` maps internal ↔ Google refresh tokens | `tokenStore` tracks valid access tokens per user |
| Frontend has proactive refresh, interceptors, two API clients | Frontend has one simple API client, no refresh logic |
| Swagger requires copying token from browser Network tab | Swagger has its own OAuth2 "Authorize" button |

---

## Phase 1: Backend - Token Tracking (`google-oauth-backend`)

### Task 1.1: Update Token Store

Replace the current `tokenStore` (which maps internal refresh tokens to Google refresh tokens) with a store that tracks valid access tokens per user.

```typescript
// google-oauth-backend/src/services/tokenStore.service.ts
class TokenStore {
  // Maps tokenId -> { userId, googleRefreshToken, expiresAt }
  private tokens = new Map<string, TokenRecord>()
  // Maps userId -> Set of tokenIds (for "logout everywhere")
  private userTokens = new Map<string, Set<string>>()

  /** Store a new token, return the tokenId */
  store(userId: string, googleRefreshToken: string, expiresAt: number): string

  /** Check if token is valid (exists and not expired) */
  isValid(tokenId: string): boolean

  /** Get Google refresh token for a tokenId */
  getGoogleRefreshToken(tokenId: string): string | undefined

  /** Revoke all tokens for a user (logout everywhere) */
  revokeAllForUser(userId: string): void

  /** Revoke single token (normal logout) */
  revoke(tokenId: string): void
}
```

**Note:** This is still in-memory. For production persistence, this will later be replaced with PostgreSQL.

### Task 1.2: Update JWT Structure

Add a `tokenId` (jti claim) to the JWT so we can check if it's been revoked:

```typescript
// JWT payload
{
  id: string,        // Google user ID
  email: string,
  name: string,
  jti: string,       // Unique token ID (maps to tokenStore)
  iat: number,
  exp: number
}
```

### Task 1.3: Update Auth Controller

**Login (`/api/auth/token`):**
- Generate a unique `tokenId`
- Store in `tokenStore` with user info and Google refresh token
- Sign JWT with `tokenId` as `jti` claim
- Set expiry to 7 days
- Return only `{ access_token, expires_in }` (no refresh token)

**Logout (`/api/auth/logout`):**
- Extract `tokenId` from JWT
- Call `tokenStore.revokeAllForUser(userId)` to logout everywhere
- Optionally: add `?all=false` query param for single-device logout

**Remove:** `/api/auth/internal-refresh` endpoint (no longer needed)

### Task 1.4: Update Token Validation Middleware

Before proxying requests, check that the token's `jti` is still valid in the store:

```typescript
// middleware/tokenValidation.middleware.ts
const decoded = jwtService.verify(token)
if (!tokenStore.isValid(decoded.jti)) {
  return res.status(401).json({ error: 'Token revoked' })
}
```

### Task 1.5: Update Config

```typescript
// config/index.ts
jwt: {
  secret: process.env.JWT_SECRET,
  expiresIn: '7d'  // Changed from 15m
}
```

---

## Phase 2: Backend - Swagger OAuth2 (`collab-flow-api`)

### Task 2.1: Add Auth Routes

Create OAuth2 endpoints for Swagger authentication:

```typescript
// collab-flow-api/src/routes/auth.routes.ts
router.get('/auth/login', redirectToGoogle)
router.get('/auth/callback', handleGoogleCallback)
```

**`/auth/login`:**
- Generate PKCE verifier/challenge
- Store verifier in a short-lived cache (or signed cookie)
- Redirect to Google OAuth with callback URL pointing to `/auth/callback`

**`/auth/callback`:**
- Exchange code for Google tokens
- Fetch user info
- Generate internal JWT (same format as gateway)
- Return HTML page that stores token and closes the popup

### Task 2.2: Update Swagger Config

```typescript
// collab-flow-api/src/config/swagger.ts
components: {
  securitySchemes: {
    oauth2: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: '/api/auth/login',
          tokenUrl: '/api/auth/callback',
          scopes: {}
        }
      }
    }
  }
}
```

### Task 2.3: Update Environment Variables

Add to `collab-flow-api`:
- `GOOGLE_CLIENT_SECRET` (already has `GOOGLE_CLIENT_ID`)
- `SWAGGER_OAUTH_REDIRECT_URI`

### Task 2.4: Update SWAGGER_AUTH.md

```markdown
# How to Authenticate with Swagger

1. Open Swagger UI at `http://localhost:3002/api-docs`
2. Click the **Authorize** button
3. Click **Authorize** in the OAuth2 dialog
4. Log in with Google in the popup
5. You're now authenticated - make API requests
```

---

## Phase 3: Frontend Simplification (`sync-forge`)

### Task 3.1: Simplify Auth Store

Remove:
- `expiresAt` tracking
- `proactiveRefreshTimer`
- `scheduleProactiveRefresh()`
- `refreshAccessToken()`
- `isTokenFreshEnough()`
- `activeRefreshPromise`

Keep:
- `user`
- `accessToken`
- `isAuthenticated`
- `setAuthData(token)` - just decode and store
- `logout()`
- PKCE methods (still needed for login flow)

```typescript
// stores/auth.ts (simplified)
interface AuthState {
  user: User | null
  accessToken: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user
  },

  actions: {
    setAuthData(accessToken: string) {
      this.accessToken = accessToken
      this.user = jwtDecode<User>(accessToken)
    },

    async logout() {
      try {
        await apiClient.post('/api/auth/logout')
      } finally {
        this.user = null
        this.accessToken = null
      }
    },

    // PKCE methods unchanged
    setPkceCodeVerifier(verifier: string): void { ... }
    getPkceCodeVerifier(): string | null { ... }
    clearPkceCodeVerifier(): void { ... }
  }
})
```

### Task 3.2: Merge API Clients

Combine `simpleApiClient.ts` and `authApiClient.ts` into single `apiClient.ts`:

```typescript
// services/apiClient.ts
import axios from 'axios'
import { useAuthStore } from '@/stores'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_API_URL,
  timeout: 10000
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

// 401 = token invalid/revoked, redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore()
      auth.user = null
      auth.accessToken = null
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Task 3.3: Update AuthCallback

Remove refresh token handling - just store the access token:

```typescript
// views/AuthCallback.vue
const { access_token } = tokenResp.data
authStore.setAuthData(access_token)
await router.replace('/')
```

### Task 3.4: Simplify Router Guard

No more refresh attempts - just check if authenticated:

```typescript
// router/index.ts
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})
```

### Task 3.5: Remove Files

- `sync-forge/src/services/simpleApiClient.ts`
- `sync-forge/src/services/authApiClient.ts`
- `sync-forge/src/plugins/auth.ts`

### Task 3.6: Update Imports

Update all files that import the old clients:
- `project.service.ts` → use `apiClient`
- `task.service.ts` → use `apiClient`

---

## Summary of Changes

### `google-oauth-backend`

| Action | File |
|--------|------|
| Modify | `services/tokenStore.service.ts` - track tokens per user |
| Modify | `services/jwt.service.ts` - add `jti` claim |
| Modify | `controllers/auth.controller.ts` - remove refresh, add logout-all |
| Modify | `middleware/tokenValidation.middleware.ts` - check token not revoked |
| Modify | `routes/auth.routes.ts` - remove `/internal-refresh` |
| Modify | `config/index.ts` - change JWT expiry to 7d |
| Modify | `constants/index.ts` - remove `INTERNAL_REFRESH` |

### `collab-flow-api`

| Action | File |
|--------|------|
| Create | `routes/auth.routes.ts` - OAuth2 for Swagger |
| Create | `controllers/auth.controller.ts` - login/callback handlers |
| Modify | `config/swagger.ts` - OAuth2 security scheme |
| Modify | `config/index.ts` - add Google client secret |
| Modify | `routes/index.ts` - register auth routes |
| Modify | `config/SWAGGER_AUTH.md` - simpler instructions |

### `sync-forge`

| Action | File |
|--------|------|
| Create | `services/apiClient.ts` - single merged client |
| Modify | `stores/auth.ts` - remove all refresh logic |
| Modify | `views/AuthCallback.vue` - simpler token handling |
| Modify | `router/index.ts` - simpler guard |
| Modify | `services/project.service.ts` - update import |
| Modify | `services/task.service.ts` - update import |
| Modify | `main.ts` - remove authPlugin |
| Delete | `services/simpleApiClient.ts` |
| Delete | `services/authApiClient.ts` |
| Delete | `plugins/auth.ts` |

### `config/`

| Action | File |
|--------|------|
| Modify | `config.json` - change `JWT_EXPIRES_IN` to `7d` |
| Modify | `sync.ts` - add `GOOGLE_CLIENT_SECRET` to collab-flow-api |

---

## Test Impact

### `google-oauth-backend`
- Rewrite: `tokenStore.service.ts` tests
- Rewrite: `auth.controller.spec.ts` (remove refresh tests, add logout-all)
- Modify: `tokenValidation.middleware.spec.ts` (add revocation check)
- Delete: tests for `/internal-refresh` endpoint

### `collab-flow-api`
- Create: `auth.controller.spec.ts`
- Create: `auth.routes.spec.ts`

### `sync-forge`
- Rewrite: `stores/auth.test.ts` (much simpler)
- Rewrite: `views/AuthCallback.test.ts`
- Create: `services/apiClient.test.ts`
- Delete: `services/simpleApiClient.test.ts`
- Delete: `services/authApiClient.test.ts`
- Delete: `plugins/auth.test.ts`
- Modify: `router/index.ts` tests
- Modify: `main.test.ts`

---

## Implementation Order

### Step 1: Config
1. Update `config/config.json` - change JWT expiry
2. Update `config/sync.ts` - add Google secret to collab-flow-api
3. Run `npm run env:sync`

### Step 2: Backend Token Store
4. Rewrite `tokenStore.service.ts` with new interface
5. Update `jwt.service.ts` to include `jti` claim
6. Update `tokenValidation.middleware.ts` to check revocation
7. Write tests

### Step 3: Backend Auth Flow
8. Update `auth.controller.ts` - login returns only access_token, logout revokes all
9. Remove `/internal-refresh` from routes
10. Update tests

### Step 4: Swagger OAuth2
11. Create `collab-flow-api/src/routes/auth.routes.ts`
12. Create `collab-flow-api/src/controllers/auth.controller.ts`
13. Update `swagger.ts` with OAuth2 config
14. Update `SWAGGER_AUTH.md`
15. Write tests

### Step 5: Frontend
16. Create `apiClient.ts`
17. Simplify `auth.ts` store
18. Update `AuthCallback.vue`
19. Update `router/index.ts`
20. Update service imports
21. Delete old files
22. Update/rewrite tests

---

## Security Considerations

1. **Token stored in memory** - Still secure against XSS localStorage attacks
2. **7-day expiry** - Acceptable for first-party app with proper XSS protection (DOMPurify)
3. **Revocation** - "Logout everywhere" immediately invalidates all tokens
4. **Google refresh token** - Still stored in backend tokenStore, used if we ever need to call Google APIs on behalf of user

---

## What This Doesn't Change

- PKCE flow for initial login (still secure)
- Google OAuth integration
- Gateway proxy pattern
- `collab-flow-api` JWT validation (just checks signature, now also needs revocation check if calling directly)
- HttpOnly cookies are NOT used (tokens stay in memory)
