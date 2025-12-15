# Sync-Forge: Unauthenticated Startup Flow

This document details the specific flow of events when the `sync-forge` application starts and no user is authenticated.

**Assumed starting condition:** The user navigates to the root URL (`/`).

1.  **`main.ts`:** The application's `main.ts` file is the entry point. It orchestrates the setup in this order:
    *   A Pinia instance (for state management) is created.
    *   The custom `authPlugin` is registered with Pinia (`pinia.use(authPlugin)`).
    *   The Vue Router instance is registered with the app (`app.use(router)`).
    *   The app is mounted to the DOM (`app.mount('#app')`), which triggers the initial routing.

2.  **`plugins/auth.ts`:** Because the `authPlugin` was registered, as soon as the `auth` store is needed, the plugin executes `store.fetchUser()`. This happens almost immediately and initiates an asynchronous API call.

3.  **`stores/auth.ts` & `services/apiClient.ts`:** The `fetchUser` action makes a `GET` request to `/api/auth/me` via the `apiClient`.
    *   Based on its configuration, `apiClient` automatically sends this request with the `withCredentials: true` option. This causes the browser to attach any existing session cookies, allowing the backend to check for a valid session.
    *   The `apiClient`'s CSRF token interceptor is skipped, as this is a `GET` request.
    *   While this background network request is in flight, the `user` state in the `auth` store remains `null`.

4.  **`router/index.ts`:** The router attempts its first navigation to the requested `/` route.
    *   The `router.beforeEach` navigation guard intercepts this attempt.
    *   It checks the condition: `if (to.meta.requiresAuth && !auth.isAuthenticated)`.
    *   For the `/` route, `to.meta.requiresAuth` is `true`.
    *   Because the API call from `fetchUser` has not returned yet, `auth.isAuthenticated` is `false` (since `user` is `null`).
    *   The condition is met (`true && true`), so the guard executes `next({ name: RouteNames.LOGIN })`. This cancels the navigation to `/` and starts a new navigation to the `/login` route.

5.  **`router/index.ts` (Again):** The `beforeEach` guard runs again for the new navigation to `/login`.
    *   It checks the same condition.
    *   For the `/login` route, `to.meta.requiresAuth` is `undefined` (falsy).
    *   The condition is not met, so the `else` block runs, executing `next()`. This permits the navigation. The `LoginView` component is rendered, and the user sees the login page.

6.  **`stores/auth.ts` & `services/apiClient.ts` (In the background):**
    *   The `/api/auth/me` request that was initiated in step 3 finally completes. Since there is no user session, the API returns a `401 Unauthorized` error.
    *   The `try...catch` block within the `fetchUser` action catches this error and sets `this.user = null`. The state remains unchanged but is now confirmed.
    *   The `apiClient`'s response interceptor also sees the 401 error but ignores it because it came from the `/api/auth/me` endpoint, preventing an unnecessary redirect.

**End Result:** The user is correctly shown the login page, and the application state accurately reflects that no user is authenticated.

---

## Backend Flow: `google-oauth-backend`

This section details how the backend processes the `GET /api/auth/me` request from an unauthenticated user.

1.  **Entry & Core Middleware (`server.ts`):** The request first passes through standard middleware, including `cors` (allowing the request from the frontend) and `cookieParser` (to parse cookies).

2.  **Session Middleware (`session.middleware.ts`):** The `express-session` middleware looks for a valid session cookie (`collabflow.sid`). Finding none, it creates a new, empty session object and attaches it to the request as `req.session`. Due to the `saveUninitialized: false` setting, this empty session will not be saved to the database.

3.  **CSRF Middleware (`csrf.middleware.ts`):** This middleware runs next. A CSRF (Cross-Site Request Forgery) token is a security measure; it's a secret value used to ensure that state-changing requests are genuinely from the application, not a malicious site. Because the current request method is `GET`, the middleware skips validation. It also generates a new CSRF token cookie to be sent back with the response, as one does not already exist.

4.  **Routing (`auth.routes.ts`):** The request is routed to the `handleGetCurrentUser` controller. This route is intentionally not protected by a global session check (the `requireSession` middleware is NOT used on this specific route), allowing the controller to perform its own logic.

5.  **Controller Logic (`auth.controller.ts`):** The `handleGetCurrentUser` function executes and immediately checks if `req.session.userId` exists. Since `req.session` is new and empty (does not have a `userId` property), this check fails.

6.  **Error Response:** Upon failing the check, the controller generates a new `AppError` with a `401 Unauthorized` status and passes it to the central `errorMiddleware`. This middleware then sends the final `401` JSON response back to the frontend.

---

## Frontend Response Handling

While the user is already viewing the login page (due to the router's initial, quick redirect), the `401 Unauthorized` response from the backend is processed in the background.

1.  **API Client Interceptor (`services/apiClient.ts`):** The `apiClient`'s response interceptor is the first to receive the `401` error. It is specifically designed to ignore `401`s that come from the `/api/auth/me` endpoint, so it does not trigger a redirect. Instead, it allows the error to propagate.

2.  **Auth Store Action (`stores/auth.ts`):** The `try...catch` block within the `fetchUser` action catches the propagated error. This sets the user state to `null`, confirming the unauthenticated status and preventing any uncaught errors in the console.

3.  **Browser Cookie Storage:** The browser receives the `Set-Cookie` header from the backend's response and stores the new `collabflow.csrf` token cookie.

### Final Idle State

The application is now stable and idle with the following conditions met:
*   The user is viewing the login page.
*   The global `auth` store correctly reflects that no user is authenticated.
*   The browser now holds the necessary CSRF token for the subsequent login request.

---

## Login Initiation: OAuth 2.0 Flow

When the user clicks the "Sign in with Google" button, the frontend initiates the OAuth 2.0 Authorization Code Flow with PKCE.

1.  **PKCE Code Generation:** The frontend script generates a random, secret `code_verifier` and a corresponding hashed `code_challenge`.

2.  **Store Verifier:** The secret `code_verifier` is saved in the browser's `localStorage` via the `auth` store. This is required for the final step of the login process.

3.  **Construct Authorization URL:** A URL to Google's authorization server is built. This URL includes parameters like the `client_id`, the `redirect_uri` (pointing back to the app's callback page), the `scope` of requested permissions, and the `code_challenge`.

4.  **Redirect to Google:** The script redirects the user's browser to the constructed Google URL. The user is now interacting directly with Google to approve the sign-in request.

---

## Finalizing Login: The Auth Callback

After the user approves the login with Google, they are redirected back to the `/auth/callback` route in the frontend application. This begins the final phase of the login process.

### TODO