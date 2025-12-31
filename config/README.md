# Configuration Management

Centralized environment configuration system for the CollabFlow monorepo. Generates service-specific `.env` files from a single source of truth with automatic secret generation.

## Overview

| File | Purpose | Git Status |
|------|---------|------------|
| `sync.ts` | Main synchronization script | Committed |
| `config.json` | Base configuration (ports, shared settings) | Committed |
| `config.local.json` | Real secrets (Google OAuth credentials) | **Git-ignored** |
| `config.local.json.example` | Template for developers | Committed |
| `__tests__/sync.spec.ts` | Test suite (225 lines) | Committed |

## Quick Start

```bash
# 1. Copy the example config
cp config/config.local.json.example config/config.local.json

# 2. Edit with your Google OAuth credentials
# Get credentials from: https://console.cloud.google.com/apis/credentials

# 3. Generate .env files for all services
npm run env:sync
```

## The Strategy

This setup separates three distinct types of configuration:

1. **Base/Shared Config:** Structure, default values, non-sensitive information. Safe to commit.
2. **Environment-Specific Config:** Settings that change between `development`, `staging`, `production`.
3. **Secrets/Local Overrides:** Sensitive data (API keys, secrets) that should **never** be committed.

## File Roles

### `config.json`

**Purpose:** Base and environment-specific configuration file.

**Contents:** Defines complete configuration shape for all environments with non-sensitive information and **placeholders** for secrets.

**Structure:**
```json
{
  "development": {
    "shared": {
      "SESSION_SECRET_LENGTH": 64,
      "SESSION_MAX_AGE": "7d",
      "INTERNAL_JWT_SECRET_LENGTH": 64,
      "INTERNAL_JWT_EXPIRES_IN": "5m",
      "ENCRYPTION_KEY_LENGTH": 32,
      "APP_TITLE": "CollabFlow"
    },
    "ports": {
      "collab_flow_api": 3002,
      "google_oauth_backend": 3001,
      "sync_forge": 5173
    },
    "database": {
      "host": "localhost",
      "port": 5432,
      "user": "collab",
      "password": "collab",
      "name": "collabflow"
    },
    "secrets": {
      "GOOGLE_CLIENT_ID": "placeholder.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "placeholder"
    }
  }
}
```

### `config.local.json`

**Purpose:** Local secrets and overrides file. For your machine only.

**Contents:** Real, sensitive values merged over base configuration at runtime.

**Example:**
```json
{
  "development": {
    "secrets": {
      "GOOGLE_CLIENT_ID": "your-real-id.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "your-real-secret"
    },
    "database": {
      "host": "external-db.example.com",
      "password": "production-password"
    }
  }
}
```

**Git Status:** **NEVER committed**. Listed in root `.gitignore`.

### `config.local.json.example`

**Purpose:** Template showing developers what `config.local.json` should contain.

**Git Status:** Committed.

## How It Works

```
npm run env:sync [--env=environment]
        ↓
┌─────────────────────────────────────┐
│  1. Read config.json (base)         │
│  2. Merge config.local.json         │
│     - secrets override              │
│     - database override (optional)  │
│  3. Validate Google OAuth format    │
│  4. Generate cryptographic secrets  │
│  5. Write .env to each service      │
└─────────────────────────────────────┘
        ↓
collab-flow-api/.env
google-oauth-backend/.env
sync-forge/.env
```

## Generated Environment Variables

### collab-flow-api

| Variable | Source | Example |
|----------|--------|---------|
| `PORT` | `ports.collab_flow_api` | `3002` |
| `NODE_ENV` | Environment name | `development` |
| `DATABASE_URL` | Constructed from database config | `postgresql://collab:collab@localhost:5432/collabflow` |
| `GOOGLE_CLIENT_ID` | `secrets` (for future use) | `xxx.apps.googleusercontent.com` |
| `INTERNAL_JWT_SECRET` | Generated (64 bytes) | `627d6cca...` (128 hex chars) |

### google-oauth-backend

| Variable | Source | Example |
|----------|--------|---------|
| `PORT` | `ports.google_oauth_backend` | `3001` |
| `NODE_ENV` | Environment name | `development` |
| `CORS_ORIGIN` | Constructed from sync_forge port | `http://localhost:5173` |
| `COLLAB_FLOW_API_URL` | Constructed from collab_flow_api port | `http://localhost:3002` |
| `DATABASE_URL` | Constructed from database config | `postgresql://...` |
| `GOOGLE_CLIENT_ID` | `secrets` | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `secrets` | `GOCSPX-...` |
| `REDIRECT_URI` | Constructed from sync_forge port | `http://localhost:5173/auth/callback` |
| `SESSION_SECRET` | Generated (64 bytes) | `8c23d7b8...` (128 hex chars) |
| `SESSION_MAX_AGE` | `shared.SESSION_MAX_AGE` | `7d` |
| `INTERNAL_JWT_SECRET` | Generated (64 bytes) | `627d6cca...` (128 hex chars) |
| `INTERNAL_JWT_EXPIRES_IN` | `shared.INTERNAL_JWT_EXPIRES_IN` | `5m` |
| `GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY` | Generated (32 bytes) | `9e5fae7d...` (64 hex chars) |

### sync-forge (Frontend)

| Variable | Source | Example |
|----------|--------|---------|
| `VITE_APP_TITLE` | `shared.APP_TITLE` | `CollabFlow` |
| `VITE_GOOGLE_CLIENT_ID` | `secrets` | `xxx.apps.googleusercontent.com` |
| `VITE_AUTH_API_URL` | Constructed from google_oauth_backend port | `http://localhost:3001` |
| `VITE_GATEWAY_API_URL` | Constructed from google_oauth_backend port | `http://localhost:3001` |
| `VITE_RESOURCE_API_URL` | Constructed from collab_flow_api port | `http://localhost:3002` |

## Cryptographic Secrets

Generated fresh on each `npm run env:sync` using `crypto.randomBytes()`:

| Secret | Length | Bits | Purpose |
|--------|--------|------|---------|
| `SESSION_SECRET` | 64 bytes | 512-bit | Express session signing |
| `INTERNAL_JWT_SECRET` | 64 bytes | 512-bit | Internal JWT signing |
| `GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY` | 32 bytes | 256-bit | AES-256-GCM encryption |

**Note:** Regenerating secrets invalidates existing sessions and tokens.

## sync.ts Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| `validateSecrets()` | 92-99 | Validate Google OAuth credential format |
| `mergeSecrets()` | 101-109 | Merge local secrets over base |
| `mergeDatabase()` | 111-119 | Merge local database config |
| `generateSecret()` | 162-164 | Generate cryptographic random hex |
| `generateEnvContents()` | 121-160 | Build service-specific .env content |
| `writeEnvFile()` | 166-170 | Write .env to service directory |
| `run()` | 172-236 | Main orchestrator |

## Validation

The script validates secrets before generating .env files:

```typescript
// GOOGLE_CLIENT_ID must end with .apps.googleusercontent.com
// GOOGLE_CLIENT_SECRET must be at least 10 characters
```

If validation fails, the script throws an error with a descriptive message.

## Adding a New Environment

### Step 1: Define Environment in config.json

```json
{
  "development": { ... },
  "production": {
    "shared": {
      "SESSION_SECRET_LENGTH": 64,
      "SESSION_MAX_AGE": "1d",
      "INTERNAL_JWT_SECRET_LENGTH": 64,
      "INTERNAL_JWT_EXPIRES_IN": "15m",
      "ENCRYPTION_KEY_LENGTH": 32,
      "APP_TITLE": "CollabFlow"
    },
    "ports": {
      "collab_flow_api": 8080,
      "google_oauth_backend": 8081,
      "sync_forge": 443
    },
    "database": {
      "host": "db.example.com",
      "port": 5432,
      "user": "collabflow_prod",
      "password": "placeholder",
      "name": "collabflow_prod"
    },
    "secrets": {
      "GOOGLE_CLIENT_ID": "prod-id.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "placeholder"
    }
  }
}
```

### Step 2: Provide Production Secrets

Add real secrets to `config.local.json`:

```json
{
  "development": { ... },
  "production": {
    "database": {
      "password": "real-production-password"
    },
    "secrets": {
      "GOOGLE_CLIENT_ID": "real-prod-id.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "real-prod-secret"
    }
  }
}
```

### Step 3: Generate Production .env Files

```bash
npm run env:sync -- --env=production
```

### Step 4: Run in Production Mode

```bash
# Backend services
cd collab-flow-api && npm run start:prod
cd google-oauth-backend && npm run start:prod

# Frontend
cd sync-forge && npm run build && npm run preview
```

## Security Considerations

### Implemented

| Measure | Description |
|---------|-------------|
| **Secrets separation** | `config.local.json` git-ignored |
| **Cryptographic generation** | `crypto.randomBytes()` for all secrets |
| **Validation** | Google OAuth format checked before generation |
| **VITE_ prefix** | Prevents backend secrets from leaking to frontend |
| **Encryption** | Refresh tokens encrypted with AES-256-GCM |

### Production Recommendations

| Concern | Recommendation |
|---------|----------------|
| **Secret storage** | Use vault system (HashiCorp Vault, AWS Secrets Manager) |
| **Key rotation** | Implement gradual rotation without invalidating sessions |
| **Database auth** | Use connection pooler with socket auth instead of password in URL |
| **Encryption keys** | Store in HSM or cloud KMS |

### Potential Risks

| Risk | Mitigation |
|------|------------|
| `.gitignore` failure | Pre-commit hook to check for secrets |
| .env file exposure | Restrict file permissions (600) |
| Secret in logs | Script logs "generated" without values |

## Testing

```bash
# Run config tests
cd config && npx vitest run

# Or from root
npm run test:unit -- config/__tests__/sync.spec.ts
```

### Test Coverage

| Suite | Tests |
|-------|-------|
| `validateSecrets` | Valid/invalid credentials, empty strings |
| `mergeSecrets` | Partial/full overrides, undefined handling |
| `mergeDatabase` | Deep merge behavior |
| `generateEnvContents` | All 3 services, URL construction, newlines |

## Troubleshooting

### "Missing required secret" Error

```
Error: GOOGLE_CLIENT_ID must end with '.apps.googleusercontent.com'
```

**Solution:** Ensure `config.local.json` has valid Google OAuth credentials.

### "Cannot find config.local.json"

The script will use placeholders from `config.json` which will fail validation.

**Solution:** Copy the example file:
```bash
cp config/config.local.json.example config/config.local.json
```

### Sessions Invalid After env:sync

Each run generates new cryptographic secrets, invalidating existing sessions.

**Solution:** This is expected behavior. Users will need to re-authenticate.

### Environment Not Found

```
Error: Configuration for 'staging' not found in config.json
```

**Solution:** Add the environment block to `config.json` first.

## Related Documentation

- [`../google-oauth-backend/README.md`](../google-oauth-backend/README.md) - OAuth gateway (consumes most env vars)
- [`../collab-flow-api/README.md`](../collab-flow-api/README.md) - Resource API
- [`../sync-forge/README.md`](../sync-forge/README.md) - Frontend (uses VITE_* vars)
