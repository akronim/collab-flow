# Session-Based Authentication - Architecture Diagrams

---

## 1. High-Level Component Architecture

```mermaid
flowchart TB
    subgraph Browser
        FE[sync-forge<br/>Vue.js Frontend]
    end

    subgraph Backend Services
        GW[google-oauth-backend<br/>Gateway + Auth]
        API[collab-flow-api<br/>Resource API]
    end

    subgraph External
        Google[Google OAuth]
    end

    subgraph Storage
        SS[(Session Store<br/>In-Memory → PostgreSQL)]
    end

    FE <-->|Session Cookie<br/>+ CSRF Token| GW
    GW <-->|Internal JWT<br/>5-min expiry| API
    GW <--> Google
    GW <--> SS
```

---

## 2. Request Flow Architecture

```mermaid
flowchart LR
    subgraph Browser
        B[Browser]
    end

    subgraph google-oauth-backend
        direction TB
        CP[cookie-parser]
        ES[express-session]
        CSRF[CSRF Middleware]
        RS[requireSession]
        GWM[Gateway Middleware]
    end

    subgraph collab-flow-api
        AUTH[Auth Middleware]
        ROUTES[API Routes]
    end

    B -->|1. Request + Session Cookie| CP
    CP --> ES
    ES -->|2. Validate session<br/>populate req.session| CSRF
    CSRF -->|3. Validate CSRF token| RS
    RS -->|4. Check userId exists| GWM
    GWM -->|5. Create internal JWT<br/>from session data| AUTH
    AUTH -->|6. Verify JWT| ROUTES
    ROUTES -->|7. Response| B
```

---

## 3. Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as sync-forge
    participant GW as google-oauth-backend
    participant G as Google
    participant SS as Session Store

    U->>FE: Click "Sign in with Google"
    FE->>FE: Generate PKCE (verifier + challenge)
    FE->>FE: Store verifier in localStorage
    FE->>G: Redirect with challenge
    G->>U: Show consent screen
    U->>G: Approve
    G->>FE: Redirect to /auth/callback?code=xxx
    FE->>GW: POST /api/auth/token {code, codeVerifier}
    GW->>G: Exchange code (+ client_secret)
    G-->>GW: Google tokens
    GW->>G: Fetch user info
    G-->>GW: {id, email, name}
    GW->>GW: req.session.regenerate()
    GW->>GW: Encrypt Google refresh token
    GW->>SS: Store session {userId, email, name, encryptedToken}
    GW->>GW: Rotate CSRF token
    GW-->>FE: Set-Cookie: collabflow.sid (HttpOnly)<br/>Set-Cookie: collabflow.csrf
    FE->>FE: Clear PKCE verifier
    FE->>GW: GET /api/auth/me
    GW-->>FE: {id, email, name}
    FE->>FE: Store user in Pinia
    FE->>U: Redirect to dashboard
```

---

## 4. API Request Flow (State-Changing)

```mermaid
sequenceDiagram
    participant FE as sync-forge
    participant GW as google-oauth-backend
    participant SS as Session Store
    participant API as collab-flow-api

    FE->>GW: POST /api/projects<br/>Cookie: collabflow.sid<br/>X-CSRF-Token: xxx<br/>[req body]
    GW->>SS: Lookup session by sid
    SS-->>GW: {userId, email, name, ...}
    GW->>GW: Validate CSRF token<br/>(cookie vs header)
    GW->>GW: Create internal JWT (5min)<br/>{id, email, name}
    GW->>API: POST /api/projects<br/>Authorization: Bearer <internal-jwt><br/>[req body]
    API->>API: Verify JWT signature
    API->>API: Process request
    API-->>GW: [response]
    GW-->>FE: [response]
```

> **Note:** CSRF validation only occurs for state-changing methods (POST, PUT, PATCH, DELETE).
> GET, HEAD, and OPTIONS requests skip CSRF validation.

---

## 5. Logout Flow (All Devices)

```mermaid
sequenceDiagram
    participant FE as sync-forge
    participant GW as google-oauth-backend
    participant SS as Session Store

    FE->>GW: POST /api/auth/logout<br/>Cookie: collabflow.sid<br/>X-CSRF-Token: xxx
    GW->>SS: Get userId from session
    SS-->>GW: userId
    GW->>SS: destroyAllByUserId(userId)
    SS->>SS: Delete all sessions for user
    GW-->>FE: Set-Cookie: collabflow.sid (maxAge=0)
    FE->>FE: Clear Pinia state
    FE->>FE: Redirect to /login
```

---

## 6. Session Lifecycle State Diagram

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated

    Unauthenticated --> AuthInProgress: Click login
    AuthInProgress --> Unauthenticated: Cancel/Error
    AuthInProgress --> Authenticated: Google callback success

    Authenticated --> Authenticated: API requests
    Authenticated --> Authenticated: Session auto-extends
    Authenticated --> Unauthenticated: Logout (all devices)
    Authenticated --> Unauthenticated: Session expired
    Authenticated --> Unauthenticated: 401 from API

    note right of Authenticated
        Session cookie: 7 days
        Internal JWT: 5 min (per request)
    end note
```
