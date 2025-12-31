# sync-forge

Vue.js frontend for CollabFlow. A modern task management application featuring Google OAuth authentication, Kanban boards, and real-time collaboration.

## Features

- Google OAuth 2.0 with PKCE authentication
- Project management with CRUD operations
- Kanban board with drag-and-drop task management
- Rich text editor (Jodit) for task descriptions
- Toast notifications for user feedback
- Responsive design with Tailwind CSS
- XSS prevention with DOMPurify
- CSRF protection for API calls

## Prerequisites

- Node.js 20+ (^20.19.0 or >=22.12.0)
- Backend services running:
  - `google-oauth-backend` (OAuth gateway)
  - `collab-flow-api` (Resource API)

## Quick Start

### 1. Generate `.env` file

From the project root:

```bash
npm run env:sync
```

### 2. Install dependencies

```bash
cd sync-forge && npm install
```

### 3. Start development server

```bash
npm run dev
```

The app runs at `http://localhost:5173`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_TITLE` | Application title | `CollabFlow` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `VITE_AUTH_API_URL` | OAuth API URL | `http://localhost:3001` |
| `VITE_GATEWAY_API_URL` | Gateway/proxy URL | `http://localhost:3001` |
| `VITE_RESOURCE_API_URL` | Resource API URL | `http://localhost:3002` |

## Architecture

### Application Flow

```
main.ts (Bootstrap: Vue + Pinia + Router)
    ↓
App.vue (Root: RouterView + ToastNotification)
    ↓
Router (beforeEach guard → fetchUser())
    ↓
Views (Pages) → Components → Composables
    ↓
Stores (Pinia) → Services → apiClient (Axios)
    ↓
Backend API (google-oauth-backend gateway)
```

### Project Structure

```
src/
├── __tests__/              # 32 test files
│   ├── components/         # Component tests
│   ├── composables/        # Composable tests
│   ├── http/               # API client tests
│   ├── stores/             # Store tests
│   ├── utils/              # Utility tests
│   ├── views/              # View tests
│   └── setup.ts            # Test configuration
├── assets/
│   └── main.css            # Tailwind CSS import
├── components/
│   ├── editors/            # Rich text editor
│   │   └── jodit/          # Jodit wrapper + loader
│   ├── kanban/             # Kanban board components
│   │   ├── KanbanBoard.vue
│   │   ├── KanbanColumn.vue
│   │   └── KanbanCard.vue
│   ├── layouts/            # Page layouts
│   │   ├── DefaultLayout.vue
│   │   └── AppHeader.vue
│   ├── projects/           # Project components
│   │   └── ProjectForm.vue
│   ├── shared/             # Shared components
│   │   ├── ToastNotification.vue
│   │   └── DeleteWithConfirmation.vue
│   ├── tasks/              # Task components
│   │   └── TaskForm.vue
│   └── ui/                 # Design system
│       ├── SfButton.vue
│       ├── SfInput.vue
│       ├── SfTextarea.vue
│       ├── SfCard.vue
│       ├── SfModal.vue
│       ├── SfBadge.vue
│       ├── SfLoadingState.vue
│       └── index.ts
├── composables/
│   └── useTaskForm.ts      # Task form logic
├── constants/
│   ├── apiEndpoints.ts     # API route definitions
│   ├── routes.ts           # Route name constants
│   ├── localStorageKeys.ts # Storage key constants
│   ├── notificationMessages.ts
│   ├── shared.ts
│   └── htmlCodes.ts        # Test IDs
├── http/
│   └── apiClient.ts        # Axios instance + interceptors
├── router/
│   └── index.ts            # Vue Router + guards
├── services/
│   ├── authService.ts      # Auth API calls
│   ├── project.service.ts  # Project API calls
│   └── task.service.ts     # Task API calls
├── stores/
│   ├── auth.ts             # Authentication state
│   ├── projects.ts         # Projects CRUD state
│   ├── projectTasks.ts     # Tasks state
│   └── notification.ts     # Toast notifications
├── types/
│   ├── auth.ts             # User, GoogleProfile
│   ├── project.ts          # Project, ProjectFormData
│   └── task.ts             # Task, TaskStatus, TaskFormData
├── utils/
│   ├── apiCallResult.ts    # Result wrapper class
│   ├── sanitize.ts         # XSS prevention
│   ├── pkce.ts             # OAuth PKCE utilities
│   ├── date.ts             # Date formatting (Luxon)
│   ├── logger.ts           # Logging utility
│   ├── errorMessage.ts     # Error extraction
│   └── notificationHelper.ts
├── views/
│   ├── LoginView.vue       # OAuth login page
│   ├── AuthCallback.vue    # OAuth callback handler
│   ├── HomeView.vue        # Dashboard
│   ├── ProjectsView.vue    # Projects list
│   ├── ProjectBoardView.vue # Kanban board
│   └── TaskFormView.vue    # Task create/edit
├── App.vue                 # Root component
└── main.ts                 # Application entry point
```

## State Management (Pinia)

### Auth Store (`src/stores/auth.ts`)

| State | Type | Description |
|-------|------|-------------|
| `user` | `User \| null` | Current authenticated user |

| Action | Description |
|--------|-------------|
| `fetchUser()` | Load current user from API |
| `logout()` | Clear user and redirect to login |
| `setPkceCodeVerifier()` | Store PKCE verifier in localStorage |
| `getPkceCodeVerifier()` | Retrieve PKCE verifier |
| `clearPkceCodeVerifier()` | Remove PKCE verifier |

### Projects Store (`src/stores/projects.ts`)

| State | Type | Description |
|-------|------|-------------|
| `projects` | `Project[]` | All projects |

| Action | Description |
|--------|-------------|
| `fetchProjects()` | Load all projects |
| `fetchProjectById(id)` | Load single project |
| `addProject(project)` | Create new project |
| `updateProject(id, project)` | Update project |
| `deleteProject(id)` | Delete project |

### ProjectTasks Store (`src/stores/projectTasks.ts`)

| State | Type | Description |
|-------|------|-------------|
| `tasks` | `Task[]` | Tasks for current project |

| Getter | Description |
|--------|-------------|
| `all` | All tasks sorted by order |
| `byStatus(status)` | Tasks filtered by status |

| Action | Description |
|--------|-------------|
| `fetchTasksByProjectId(projectId)` | Load tasks for project |
| `getTaskById(projectId, taskId)` | Get single task |
| `addTask(task)` | Create new task |
| `updateTask(projectId, id, updates)` | Update task |
| `deleteTask(projectId, id)` | Delete task |
| `moveTask(projectId, taskId, newStatus, newOrder)` | Move task (drag-drop) |

### Notification Store (`src/stores/notification.ts`)

| State | Type | Description |
|-------|------|-------------|
| `message` | `string` | Notification message |
| `type` | `'success' \| 'error' \| 'info'` | Notification type |
| `visible` | `boolean` | Visibility state |

| Action | Description |
|--------|-------------|
| `show(notification, duration?)` | Show notification (auto-dismiss) |
| `hide()` | Hide notification |

## Routing

### Routes

| Path | View | Auth | Description |
|------|------|------|-------------|
| `/login` | LoginView | Public | OAuth login |
| `/auth/callback` | AuthCallback | Public | OAuth callback |
| `/` | HomeView | Protected | Dashboard |
| `/projects` | ProjectsView | Protected | Projects list |
| `/project/:projectId/board` | ProjectBoardView | Protected | Kanban board |
| `/project/:projectId/task/new` | TaskFormView | Protected | Create task |
| `/project/:projectId/task/:taskId/edit` | TaskFormView | Protected | Edit task |

### Route Guard

The `beforeEach` guard in `src/router/index.ts`:
1. Calls `authStore.fetchUser()` on every navigation
2. Checks `route.meta.requiresAuth` flag
3. Redirects to `/login` if unauthenticated

## API Layer

### HTTP Client (`src/http/apiClient.ts`)

| Feature | Implementation |
|---------|----------------|
| Base URL | `VITE_GATEWAY_API_URL` environment variable |
| Credentials | `withCredentials: true` (sends cookies) |
| CSRF Token | Read from `collabflow.csrf` cookie |
| CSRF Header | `x-csrf-token` on POST/PUT/PATCH/DELETE |
| 401 Handling | Auto-redirect to `/login` |

### Error Handling

All API calls use `ApiCallResult<T>` wrapper (`src/utils/apiCallResult.ts`):

```typescript
const result = await projectApiService.getProjects()
if (result.isSuccess()) {
  // result.data is typed as Project[]
} else {
  // result.error contains error details
}
```

## Authentication Flow

### OAuth 2.0 with PKCE

```
1. LoginView
   └── Generate PKCE code_verifier (32 bytes random)
   └── Generate code_challenge (SHA-256 hash)
   └── Store verifier in localStorage
   └── Redirect to Google OAuth

2. Google authenticates user
   └── Redirects to /auth/callback?code=...

3. AuthCallback
   └── Extract code from URL
   └── Retrieve verifier from localStorage
   └── POST /api/auth/token { code, codeVerifier }
   └── Server sets session cookie
   └── fetchUser() loads user data
   └── Redirect to /

4. Subsequent requests
   └── Session cookie sent automatically
   └── CSRF token attached to mutations
```

## UI Components

### Design System (`src/components/ui/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `SfButton` | `variant`, `size`, `disabled`, `loading` | Button with variants: primary, secondary, danger, ghost, outline |
| `SfInput` | `modelValue`, `label`, `error`, `placeholder` | Text input with validation |
| `SfTextarea` | `modelValue`, `label`, `error`, `rows` | Multi-line input |
| `SfCard` | `title` | Container with header/footer slots |
| `SfModal` | `modelValue`, `title` | Dialog with backdrop |
| `SfBadge` | `variant` | Status badge |
| `SfLoadingState` | `message` | Loading spinner |

### Kanban Components

| Component | Description |
|-----------|-------------|
| `KanbanBoard` | Main board orchestrator |
| `KanbanColumn` | Status column with drag-drop zone |
| `KanbanCard` | Task card with edit/delete actions |

**Drag-Drop**: Native HTML5 drag-drop API with visual feedback.

### Rich Text Editor

| Component | Description |
|-----------|-------------|
| `JoditEditor` | Wrapper around Jodit library |
| `joditLoader.ts` | Dynamic import with caching |

**Features**: Bold, italic, lists, links, source view, HTML beautification.

## Security

### Implemented

| Measure | Implementation |
|---------|----------------|
| **XSS Prevention** | DOMPurify sanitization for `v-html` |
| **CSRF Protection** | Token from cookie → `x-csrf-token` header |
| **OAuth Security** | PKCE (SHA-256 code challenge) |
| **Session Storage** | httpOnly cookies (server-managed) |
| **Input Sanitization** | `sanitizeHtml()` and `sanitizeInput()` utilities |
| **Vue Auto-Escaping** | Mustache interpolation escapes HTML |

### Utilities (`src/utils/sanitize.ts`)

```typescript
// Safe HTML rendering (for rich text)
sanitizeHtml(dirty: string): string  // Uses DOMPurify

// Escape all HTML (for user input)
sanitizeInput(input: string): string  // Uses textContent
```

## Testing

### Run Tests

```bash
# Run unit tests
npm run test:unit

# Run once (CI mode)
npm run test:unit -- --run

# With coverage
npm run coverage

# Interactive UI
npm run vitest:ui

# E2E tests (Playwright)
npm run test:e2e
```

### Test Structure

| Category | Files | Coverage |
|----------|-------|----------|
| Stores | 4 | auth, projects, projectTasks, notification |
| Views | 5 | Login, AuthCallback, Projects, ProjectBoard, TaskForm |
| Components | 7 | UI components, Kanban, forms |
| Utils | 6 | date, logger, sanitize, apiCallResult, pkce, etc. |
| Composables | 1 | useTaskForm |
| HTTP | 1 | apiClient |

**Framework**: Vitest + happy-dom + @vue/test-utils

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server (Vite) |
| `npm run build` | Production build (typecheck + bundle) |
| `npm run build:watch` | Watch mode build |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint with auto-fix |
| `npm run test:unit` | Run unit tests |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run coverage` | Generate coverage report |

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| vue | 3.5.22 | Frontend framework |
| pinia | 3.0.3 | State management |
| vue-router | 4.6.3 | Client-side routing |
| axios | 1.13.1 | HTTP client |
| tailwindcss | 4.1.16 | CSS framework |
| jodit | 4.7.9 | Rich text editor |
| dompurify | 3.3.0 | XSS prevention |
| luxon | 3.7.2 | Date/timezone handling |
| lucide-vue-next | 0.554.0 | Icon library |
| uuid | 13.0.0 | Unique ID generation |

### Development

| Package | Purpose |
|---------|---------|
| vite | 7.1.11 |
| typescript | 5.8.3 |
| vitest | 3.2.4 |
| @vue/test-utils | 2.4.6 |
| @playwright/test | 1.56.1 |
| eslint | 9.28.0 |
| happy-dom | 18.0.1 |

## Known Issues & Future Improvements

| Priority | Issue | Description |
|----------|-------|-------------|
| **Critical** | No service layer tests | `src/services/*.ts` have zero tests |
| **High** | No form validation | Missing Zod/Yup schema validation |
| **High** | Empty E2E tests | Playwright configured but no tests |
| **Medium** | Unused dependencies | i18next, jwt-decode, msw installed but unused |
| **Medium** | Hardcoded timezone | `Europe/Zagreb` should be user preference |
| **Medium** | No error boundary | Unhandled component errors |
| **Low** | No route code splitting | Static imports for all views |
| **Low** | Coverage thresholds disabled | Should enforce 80% minimum |

## IDE Setup

### VS Code

Install [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension (disable Vetur).

### Browser DevTools

- **Chrome/Edge**: [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- **Firefox**: [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

Enable Custom Object Formatters for better debugging.

## Related Documentation

- [`../google-oauth-backend/README.md`](../google-oauth-backend/README.md) - OAuth gateway
- [`../collab-flow-api/README.md`](../collab-flow-api/README.md) - Resource API
- [`../AUTH_FLOW_ANALYSIS.md`](../AUTH_FLOW_ANALYSIS.md) - Authentication flow details
- [`../SESSION_AUTH_DIAGRAMS.md`](../SESSION_AUTH_DIAGRAMS.md) - Architecture diagrams
