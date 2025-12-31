# google-oauth-backend

Authentication gateway for CollabFlow. Handles Google OAuth 2.0 with PKCE, PostgreSQL-backed session management, CSRF protection, and proxies authenticated requests to `collab-flow-api`.

## Responsibilities

- Google OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- PostgreSQL-backed session management
- CSRF protection (double-submit cookies)
- User creation/linking on first login (direct DB access)
- Gateway proxy to `collab-flow-api` (attaches internal JWT)
- Graceful shutdown handling

## Prerequisites

- Node.js 20+
- PostgreSQL (shared database with collab-flow-api)

## Setup

### 1. Generate `.env` file

From the project root:

```bash
npm run env:sync
```

### 2. Install dependencies

```bash
cd google-oauth-backend && npm install
```

### 3. Run the service

```bash
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/collabflow` |
| `COLLAB_FLOW_API_URL` | Downstream API URL | `http://localhost:3002` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | |
| `REDIRECT_URI` | OAuth callback URL | `http://localhost:5173/auth/callback` |
| `SESSION_SECRET` | Secret for signing session IDs | |
| `SESSION_MAX_AGE` | Session duration | `7d` |
| `INTERNAL_JWT_SECRET` | Secret for internal JWTs | |
| `INTERNAL_JWT_EXPIRES_IN` | Internal JWT expiration | `5m` |
| `GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## Architecture

### Project Structure

```
src/
├── __tests__/           # Test suites (unit, integration)
│   ├── controllers/     # Controller tests
│   ├── db/              # Database connection tests
│   ├── middleware/      # Middleware tests
│   ├── server/          # Graceful shutdown tests
│   ├── services/        # Service layer tests
│   └── server.spec.ts   # Integration tests
├── config/              # Configuration from environment
├── constants/           # API endpoints, error messages, cookie names
├── controllers/         # Auth endpoint handlers
├── db/                  # PostgreSQL connection (postgres.js)
├── middleware/          # Express middleware chain
│   ├── csrf.middleware.ts
│   ├── error.middleware.ts
│   ├── gateway.middleware.ts
│   ├── requireSession.middleware.ts
│   └── session.middleware.ts
├── routes/              # API route definitions
├── server/              # Graceful shutdown handler
├── services/            # Business logic
│   ├── auth.service.ts           # Google OAuth operations
│   ├── jwt.service.ts            # Internal JWT signing/verification
│   ├── postgresSessionStore.service.ts  # PostgreSQL session store
│   └── user.service.ts           # User find-or-create (direct DB)
├── types/               # TypeScript types
├── utils/               # Encryption, CSRF, logger, errors
└── server.ts            # Application entry point
```

### Middleware Chain

```
Request → Helmet → CORS → JSON Parser → Cookie Parser → Session → CSRF → Routes → Error Handler
```

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | Health check | No |
| `GET` | `/health` | Service status | No |
| `POST` | `/api/auth/token` | Exchange OAuth code for session | No (CSRF required) |
| `GET` | `/api/auth/me` | Get current user | Yes |
| `POST` | `/api/auth/logout` | Logout from all devices (returns 204) | No (CSRF required) |
| `GET` | `/api/auth/internal-token` | Get internal JWT | Yes |
| `*` | `/api/*` | Proxy to collab-flow-api | Yes |

## Authentication Flow

```
1. Frontend initiates OAuth
   └── Generate PKCE code_verifier + code_challenge
   └── Redirect to Google OAuth

2. Google authenticates user
   └── Redirects back with authorization code

3. Frontend exchanges code (POST /api/auth/token)
   └── Sends: { code, codeVerifier }

4. Backend processes login
   ├── Exchange code for tokens (Google API)
   ├── Validate access token → Get user info
   ├── Find or create user in database
   │   ├── Find by email
   │   ├── If exists: Update lastLogin, link Google ID if missing
   │   └── If not exists: Create new user with internal UUID
   ├── Regenerate session ID (prevent fixation)
   ├── Store session data in PostgreSQL
   └── Return success + set cookies

5. Frontend authenticated
   ├── Session cookie (httpOnly, secure)
   └── CSRF cookie (readable by JS)
```

### Session Data Structure

```typescript
{
  userId: "550e8400-e29b-41d4-a716-446655440000",  // Internal UUID (for DB relationships)
  email: "user@example.com",
  name: "User Name",
  encryptedGoogleRefreshToken: "iv:authTag:ciphertext"  // AES-256-GCM encrypted
}
```

### User ID Strategy

| ID Type | Purpose | Example |
|---------|---------|---------|
| Internal UUID | Database relationships (tasks.assigneeId, etc.) | `550e8400-...` |
| Google User ID | Stored for reference, OAuth operations | `117730574823847562031` |

The session stores the **internal UUID** as `userId`. All downstream services receive this UUID in the internal JWT.

## Session Management

### PostgreSQL Session Store

Sessions are stored in PostgreSQL using the `sessions` table:

```sql
CREATE TABLE sessions (
  sid VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

Features:
- **On-read cleanup**: Expired sessions deleted when accessed
- **UPSERT**: Atomic insert/update for session data
- **User tracking**: `user_id` column enables `destroyAllByUserId()`
- **Logout all devices**: Delete all sessions for a user

### Session Configuration

```typescript
{
  name: "collabflow.sid",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,           // In production
    sameSite: "lax",
    maxAge: 604800000       // 7 days
  }
}
```

## Security

### Helmet.js

Security headers middleware providing:
- Content Security Policy (CSP)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing prevention)
- Strict-Transport-Security (HSTS)

### CSRF Protection

- Double-submit cookie pattern
- Token generated with `crypto.randomBytes(32)` (256 bits)
- Token validated on state-changing requests (POST, PUT, PATCH, DELETE)
- Skipped for safe methods (GET, HEAD, OPTIONS)
- Must include `x-csrf-token` header matching cookie value

### Encryption

- Google refresh tokens encrypted with AES-256-GCM
- Random IV per encryption
- Authentication tag for integrity verification

### Cookie Security

| Cookie | httpOnly | secure | sameSite |
|--------|----------|--------|----------|
| `collabflow.sid` | Yes | Yes (prod) | lax |
| `collabflow.csrf` | No | Yes (prod) | lax |

## Gateway Proxy

Requests to `/api/*` (except auth routes) are proxied to `collab-flow-api`:

1. Create internal JWT from session data
2. Attach as `Authorization: Bearer {jwt}` header
3. Forward request to downstream service
4. Return response to client

## Database Connection

Uses `postgres.js` library with connection pooling:

```typescript
{
  max: 10,              // Pool size
  idle_timeout: 30,     // Seconds
  connect_timeout: 10,  // Seconds
  max_lifetime: 1800    // 30 minutes
}
```

Connection is lazy-initialized on first use and closed during graceful shutdown.

## Graceful Shutdown

Handles `SIGTERM` and `SIGINT` signals:

1. Stop accepting new HTTP connections
2. Wait for existing requests to complete
3. Close database connection pool
4. Exit process

## Testing

```bash
# Run all tests
npm run test:unit

# Run with coverage
npm run coverage

# Interactive UI
npm run vitest:ui

# Full check (typecheck + lint + tests)
npm run test-lint-typecheck
```

### Test Structure

```
__tests__/
├── controllers/         # Auth endpoint tests
├── db/                  # Database connection tests
├── middleware/          # Middleware tests
├── server/              # Graceful shutdown tests
├── services/            # Service layer tests
├── utils/               # Utility tests
└── server.spec.ts       # Integration tests
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development mode with nodemon |
| `npm run build` | TypeScript compilation |
| `npm run build:prod` | Production bundle with esbuild (minified) |
| `npm run start` | Build and run |
| `npm run start:prod` | Production build and run |
| `npm run test:unit` | Run tests with Vitest |
| `npm run coverage` | Generate coverage report |
| `npm run vitest:ui` | Interactive test UI |
| `npm run lint` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript type checking |
| `npm run test-lint-typecheck` | Full validation suite |

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.1.0 | HTTP server framework |
| postgres | 3.4.7 | PostgreSQL client (type-safe) |
| express-session | 1.18.2 | Session management |
| helmet | 8.1.0 | Security headers |
| cors | 2.8.5 | CORS middleware |
| jsonwebtoken | 9.0.2 | JWT signing/verification |
| axios | 1.13.1 | HTTP client for Google APIs |
| http-proxy-middleware | 3.0.5 | API gateway proxy |
| ms | 2.1.3 | Time duration parsing |

### Development

| Package | Purpose |
|---------|---------|
| typescript | 5.9.3 |
| vitest | 4.0.8 |
| eslint | 9.39.1 |
| supertest | 7.1.4 |
| esbuild | 0.27.0 |

## Known Issues & Future Improvements

| Priority | Issue | Description |
|----------|-------|-------------|
| High | No rate limiting | Auth endpoints vulnerable to brute force |
| High | No input validation | Missing zod/joi schema validation |
| Medium | Console logging | Should migrate to Winston/Pino for structured logging |
| Medium | No token refresh endpoint | No way to refresh expired Google access tokens |
| Low | Single CORS origin | Config only supports one origin |
| Low | No request timeouts | Default Node.js 120s timeout |

## Related Documentation

- [`../AUTH_FLOW_ANALYSIS.md`](../AUTH_FLOW_ANALYSIS.md) - Detailed auth flow walkthrough
- [`../SESSION_AUTH_DIAGRAMS.md`](../SESSION_AUTH_DIAGRAMS.md) - Mermaid diagrams of the architecture
