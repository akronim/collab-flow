# collab-flow-api

Resource API for CollabFlow. Handles projects, tasks, and users with a 3-tier architecture (controllers → services → repositories) using Drizzle ORM and PostgreSQL.

## Responsibilities

- Project CRUD operations with task counts
- Task management with status workflow (backlog → todo → inprogress → done)
- User management (create, read)
- Internal JWT validation (tokens issued by google-oauth-backend)
- Swagger/OpenAPI documentation

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

## Database Setup

### 1. Start PostgreSQL (Docker)

From the project root:

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container with:
- Port: 5432
- User: `collab`
- Password: `collab`
- Database: `collabflow`

### 2. Generate `.env` files

From the project root:

```bash
npm run env:sync
```

This generates `.env` files for all services, including `DATABASE_URL` for this API.

### 3. Install dependencies

```bash
cd collab-flow-api && npm install
```

### 4. Push schema to database

```bash
npm run db:push
```

This creates all tables defined in `src/db/schema.ts`.

### 5. Seed data (optional)

```bash
npm run db:seed
```

Populates the database with sample users, projects, and tasks.

### 6. Run the API

```bash
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3002` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://collab:collab@localhost:5432/collabflow` |
| `INTERNAL_JWT_SECRET` | Secret for validating internal JWTs | (from google-oauth-backend) |

## Architecture

### 3-Tier Pattern

```
HTTP Request
    ↓
Routes (src/routes/*.ts)
    ↓
Controllers (src/controllers/*.ts) - Request/Response handling
    ↓
Services (src/services/*.ts) - Business logic
    ↓
Repositories (src/repositories/*.ts) - Data access (Drizzle ORM)
    ↓
PostgreSQL Database
```

### Project Structure

```
src/
├── __tests__/              # Test suites mirroring src structure
│   ├── controllers/        # Controller unit tests
│   ├── repositories/       # Repository tests
│   ├── services/           # Service tests
│   ├── db/                 # Database connection tests
│   ├── middleware/         # Middleware tests
│   ├── server/             # Graceful shutdown tests
│   └── setup/              # Test infrastructure
│       ├── global-setup.ts # Creates per-worker test databases
│       ├── test-db.ts      # Test context factory
│       └── constants.ts    # Test configuration
├── config/
│   ├── index.ts            # Environment configuration
│   └── swagger.ts          # OpenAPI/Swagger setup
├── controllers/            # HTTP request handlers
│   ├── project.controller.ts
│   ├── task.controller.ts
│   └── user.controller.ts
├── db/
│   ├── index.ts            # Connection pooling & factory
│   ├── schema.ts           # Drizzle table definitions
│   ├── seed.ts             # Sample data
│   └── seed-guard.ts       # Production safety checks
├── middleware/
│   ├── auth.middleware.ts  # JWT validation
│   └── error.middleware.ts # Global error handler
├── repositories/           # Data access layer
│   ├── project.repository.ts
│   ├── task.repository.ts
│   └── user.repository.ts
├── routes/
│   ├── index.ts            # Main router with auth middleware
│   ├── project.routes.ts
│   ├── task.routes.ts
│   └── user.routes.ts
├── server/
│   └── graceful-shutdown.ts
├── services/               # Business logic
│   ├── project.service.ts
│   ├── task.service.ts
│   └── user.service.ts
├── types/
│   ├── express.d.ts        # Express type extensions
│   ├── project.ts
│   ├── task.ts
│   └── user.ts
├── utils/
│   ├── errors.ts           # Custom error classes
│   └── logger.ts           # Logging utility
└── server.ts               # Application entry point
```

## Database Schema

### Tables

#### users
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `email` | VARCHAR | Unique email |
| `googleUserId` | VARCHAR | Google OAuth ID (unique, nullable) |
| `name` | VARCHAR | Display name |
| `avatar` | VARCHAR | Avatar URL (nullable) |
| `role` | ENUM | `admin`, `member`, `guest` |
| `status` | ENUM | `active`, `inactive`, `suspended` |
| `title` | VARCHAR | Job title (nullable) |
| `organization` | VARCHAR | Organization (nullable) |
| `lastLogin` | TIMESTAMP | Last login time |
| `createdAt` | TIMESTAMP | Creation time |
| `updatedAt` | TIMESTAMP | Last update time |

#### projects
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Project name |
| `description` | TEXT | Project description |
| `createdAt` | TIMESTAMP | Creation time |
| `updatedAt` | TIMESTAMP | Last update time |

#### tasks
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `projectId` | UUID | FK → projects.id (CASCADE) |
| `assigneeId` | UUID | FK → users.id (SET NULL) |
| `title` | VARCHAR | Task title |
| `description` | TEXT | Task description |
| `status` | ENUM | `backlog`, `todo`, `inprogress`, `done` |
| `order` | INTEGER | Display order |
| `createdAt` | TIMESTAMP | Creation time |
| `updatedAt` | TIMESTAMP | Last update time |

#### sessions (for OAuth backend)
| Column | Type | Description |
|--------|------|-------------|
| `sid` | VARCHAR | Session ID (PK) |
| `userId` | UUID | FK → users.id (CASCADE) |
| `data` | TEXT | JSON session data |
| `expiresAt` | TIMESTAMP | Expiration time |

### Indexes
- `tasks.projectId` - Filter tasks by project
- `tasks.assigneeId` - Filter tasks by assignee
- `tasks.status` - Filter tasks by status
- `sessions.userId` - Find sessions by user
- `sessions.expiresAt` - Cleanup expired sessions

## API Endpoints

All endpoints require authentication via `Authorization: Bearer <internal-jwt>` header.

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create new user |

### Projects (`/api/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects (includes taskCount) |
| GET | `/api/projects/:id` | Get project by ID |
| POST | `/api/projects` | Create new project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Tasks (`/api/tasks`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks?projectId=...` | List tasks (optional projectId filter) |
| GET | `/api/tasks/:id?projectId=...` | Get task by ID (requires projectId) |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id?projectId=...` | Update task (requires projectId) |
| DELETE | `/api/tasks/:id?projectId=...` | Delete task (requires projectId) |

### Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api-docs` | Swagger UI |

## Authentication

### Internal JWT Validation

This API expects JWTs issued by `google-oauth-backend`. The gateway service:
1. Authenticates users via Google OAuth
2. Creates internal JWT with user info
3. Forwards requests with `Authorization: Bearer <jwt>` header

**Middleware**: `src/middleware/auth.middleware.ts`

```typescript
// JWT payload attached to req.user
interface JwtPayload {
  userId: string
  email: string
  name: string
}
```

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push schema changes directly to the database (development) |
| `npm run db:generate` | Generate SQL migration files from schema changes |
| `npm run db:migrate` | Run pending migrations (production) |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:studio` | Open Drizzle Studio - visual database browser at https://local.drizzle.studio |

### When to use `db:push` vs `db:migrate`

- **`db:push`**: Quick prototyping. Directly syncs schema to DB. Can cause data loss. Use in development.
- **`db:generate` + `db:migrate`**: Safe, versioned migrations. Use in staging/production.

## Database Connection

Uses `postgres.js` with connection pooling:

```typescript
{
  max: 20,              // Max connections
  idle_timeout: 30,     // Close idle after 30s
  connect_timeout: 10,  // Fail after 10s
  max_lifetime: 1800    // Rotate connections every 30min
}
```

Connection is lazy-initialized on first use and closed during graceful shutdown.

## Error Handling

### Error Classes (`src/utils/errors.ts`)

| Class | Status | Usage |
|-------|--------|-------|
| `AppError` | any | Base class |
| `BadRequestError` | 400 | Invalid input |
| `UnauthorizedError` | 401 | Missing/invalid auth |
| `NotFoundError` | 404 | Resource not found |

### Global Error Middleware

All errors are caught by `src/middleware/error.middleware.ts`:
- `AppError` instances return their status and message
- Unexpected errors return 500 with generic message
- All errors are logged

## Testing

```bash
# Run all tests
npm run test:unit

# Run once (CI mode)
npm run test:unit -- --run

# With coverage
npm run coverage

# Interactive UI
npm run vitest:ui

# Full check (typecheck + lint + tests)
npm run test-lint-typecheck
```

### Test Infrastructure

Tests run in parallel with isolated databases:

1. **Global Setup** (`src/__tests__/setup/global-setup.ts`)
   - Creates `collab_flow_test_1`, `collab_flow_test_2`, etc.
   - Pushes schema to each database
   - 4 parallel workers by default

2. **Test Context** (`src/__tests__/setup/test-db.ts`)
   ```typescript
   const ctx = await createTestContext()
   // ctx.db, ctx.projectRepository, ctx.resetDb(), ctx.close()
   ```

3. **Mocking Strategy**
   - Controllers: Mock services with `vi.mock()`
   - Services: Mock repositories
   - Repositories: Use real test database

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
| express | 5.1.0 | HTTP framework |
| drizzle-orm | 0.45.1 | ORM with type safety |
| postgres | 3.4.7 | PostgreSQL driver |
| helmet | 8.1.0 | Security headers |
| cors | 2.8.5 | CORS middleware |
| jsonwebtoken | 9.0.2 | JWT validation |
| swagger-ui-express | 5.0.1 | API documentation |

### Development

| Package | Purpose |
|---------|---------|
| typescript | 5.9.3 |
| vitest | 4.0.8 |
| drizzle-kit | 0.31.8 |
| eslint | 9.39.1 |
| esbuild | 0.27.0 |

## Security

### Implemented

- **Helmet.js** - Security headers (CSP, X-Frame-Options, etc.)
- **JWT Authentication** - Token validation on all routes
- **Drizzle ORM** - Parameterized queries (SQL injection prevention)
- **Graceful Shutdown** - Proper resource cleanup

### Not Implemented

| Feature | Risk | Recommendation |
|---------|------|----------------|
| Input validation | High | Add Zod schemas |
| RBAC authorization | High | Enforce role checks |
| Rate limiting | Medium | Add express-rate-limit |
| Structured logging | Medium | Migrate to Winston/Pino |

## Known Issues & Future Improvements

| Priority | Issue | Description |
|----------|-------|-------------|
| **Critical** | No input validation | Controllers accept req.body without validation |
| **Critical** | No RBAC enforcement | Roles defined in schema but not checked |
| **High** | Inconsistent error handling | Some controllers return 404 directly instead of throwing |
| **High** | No rate limiting | Vulnerable to DoS |
| **Medium** | Console-only logging | Should use Winston/Pino |
| **Medium** | Missing user endpoints | No UPDATE/DELETE for users |
| **Low** | Manual projectId validation | Should be middleware |
| **Low** | No pagination | List endpoints return all records |

## Graceful Shutdown

Handles `SIGTERM` and `SIGINT` signals:

1. Stop accepting new HTTP connections
2. Wait for existing requests to complete
3. Close database connection pool
4. Exit process

## Related Documentation

- [`../AUTH_FLOW_ANALYSIS.md`](../AUTH_FLOW_ANALYSIS.md) - Authentication flow details
- [`../SESSION_AUTH_DIAGRAMS.md`](../SESSION_AUTH_DIAGRAMS.md) - Architecture diagrams
- [`../google-oauth-backend/README.md`](../google-oauth-backend/README.md) - OAuth gateway documentation
