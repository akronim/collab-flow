# Collab-Flow Authentication Architecture

This document outlines the complete authentication flow for the Collab-Flow application suite, detailing the interactions between the frontend, the authentication backend, and the main resource API.

The system implements a secure Google OAuth 2.0 flow with PKCE (Proof Key for Code Exchange) to authenticate users, leveraging a dedicated backend to handle sensitive credentials.

## Key Components

1.  **`sync-forge` (Frontend - Vue.js Application)**: Manages the user interface, initiates the OAuth flow, handles redirects, stores tokens and user data client-side, and makes authenticated API requests.
2.  **`google-oauth-backend` (Auth Backend - Node.js/Express)**: Acts as a secure proxy (Backend-for-Frontend) for handling the exchange of authorization codes for tokens with Google, refreshing tokens, and validating access tokens. It is responsible for keeping the Google `client_secret` confidential.
3.  **`collab-flow-api` (Resource API - Node.js/Express)**: The main application backend. It exposes RESTful endpoints for managing resources (tasks, projects, etc.) and protects these endpoints by independently verifying JWTs issued by Google.
4.  **Google OAuth 2.0 Services**: Google's own authorization and resource servers, responsible for authenticating users, granting permissions, and issuing/validating tokens.

## Authentication Process Flow

A high-level sequence diagram of the login process:

```
+--------------+        +--------------------------+        +------------------+        +----------------------+
|  User's      |        |   sync-forge (Frontend)  |        | google-oauth-b...|        |   collab-flow-api    |
|  Browser     |        |                          |        | (Auth Backend)   |        |   (Resource API)     |
+--------------+        +--------------------------+        +------------------+        +----------------------+
       |                            |                               |                         |
       | 1. Click "Sign in"         |                               |                         |
       |--------------------------->|                               |                         |
       |                            | 2. Generate PKCE              |                         |
       |                            |    (verifier & challenge)     |                         |
       |                            | 3. Store verifier             |                         |
       |                            |                               |                         |
       | 4. Redirect to Google with challenge |                       |                         |
       |------------------------------------->|                       |                         |
       |                                      |                       |                         |
       |      (User authenticates with Google & grants consent)       |                         |
       |                                                              |                         |
       | 5. Google redirects back with auth code                      |                         |
       |<-------------------------------------------------------------|                         |
       |                            |                               |                         |
       |                            | 6. Send auth code & verifier  |                         |
       |                            |------------------------------>| 7. Exchange code for    |
       |                            |                               |    tokens with Google   |
       |                            |                               |    (using client_secret)|
       |                            |                               |                         |
       |                            | 8. Return tokens to frontend  |                         |
       |                            |<------------------------------|                         |
       |                            |                               |                         |
       |                            | 9. Store tokens               |                         |
       |                            | 10. Request user profile      |                         |
       |                            |------------------------------>| 11. Validate token with |
       |                            |                               |     Google, get info    |
       |                            |                               |                         |
       |                            | 12. Return user profile       |                         |
       |                            |<------------------------------|                         |
       |                            |                               |                         |
       |                            | 13. Store user profile,       |                         |
       |                            |     redirect to app           |                         |
       |                            |                               |                         |
       | (Later, making an API call) |                              |                         |
       |                            | 14. Make API call with token  |                         |
       |                            |-------------------------------------------------------->| 15. Independently      |
       |                            |                               |                         |   | verify token vs Google |
       |                            |                               |                         |   | (using JWKS)         |
       |                            |                               |                         |   |                      |
       |                            | 16. Return protected data     |                         |   |                      |
       |                            |<--------------------------------------------------------|                      |
```

### 1. Login Initiation (`sync-forge`)

*   **User Action**: The user clicks "Sign in with Google" in `LoginView.vue`.
*   **PKCE Generation**: The frontend generates a `code_verifier` and a corresponding `code_challenge`.
*   **Storage**: The `code_verifier` is temporarily stored in the browser's `localStorage`.
*   **Redirect**: The browser is redirected to Google's authorization URL, passing parameters including the `client_id`, `redirect_uri`, `scope`, and the PKCE `code_challenge`. The `access_type=offline` parameter is included to request a refresh token.

### 2. User Authorization (Google)

*   **User Interaction**: The user logs into their Google account (if not already) and consents to the permissions requested by the application.
*   **Redirect with Code**: Google redirects the user back to the `redirect_uri` specified by `sync-forge` (`/auth-callback`), providing a temporary, single-use `authorization_code` in the URL.

### 3. Token Exchange (`sync-forge` -> `google-oauth-backend`)

*   **Callback Handling**: The `AuthCallback.vue` component in the frontend mounts, extracts the `authorization_code`, and retrieves the `code_verifier` from `localStorage`.
*   **Request to Auth Backend**: The frontend sends a `POST` request to the `google-oauth-backend`'s `/api/auth/token` endpoint, with the `code` and `code_verifier` in the body.
*   **Secure Exchange**: The `google-oauth-backend` receives the request. It then makes a server-to-server `POST` request to Google's token endpoint, securely sending the `code`, `code_verifier`, `client_id`, and the confidential `client_secret`.
*   **Response to Frontend**: Google validates the information and returns an `access_token`, `id_token` (which is a JWT), and a `refresh_token` to the `google-oauth-backend`. The backend then forwards these tokens to the `sync-forge` frontend.

### 4. Session Creation (`sync-forge`)

*   **Store Tokens**: The frontend receives the tokens and stores them securely in `localStorage` via the Pinia `authStore`. This includes the `access_token`, `refresh_token`, and an `expires_at` timestamp.
*   **Retrieve User Profile**: To get the user's identity, the frontend immediately makes a `GET` request to the `google-oauth-backend`'s `/api/auth/validate` endpoint. The `axios` interceptor automatically adds the new `access_token` to the `Authorization: Bearer <token>` header.
*   **Validate and Fetch**: The `google-oauth-backend` validates this token with Google's userinfo endpoint, retrieves the user's profile (name, email, picture), and returns it to the frontend.
*   **Finalize**: The frontend stores the user profile data, clears the temporary PKCE `code_verifier`, and redirects the user to the main application, completing the login process.

### 5. Authenticated API Calls (`sync-forge` -> `collab-flow-api`)

*   **Making Requests**: When the frontend needs to access protected resources (e.g., fetch tasks), it makes a request to the `collab-flow-api` (e.g., `GET /api/tasks`). The `axios` request interceptor automatically attaches the stored `id_token` to the `Authorization` header.
*   **Independent Verification**: The `collab-flow-api` receives the request. Its `checkJwt` middleware intercepts it and **independently verifies the token**. It does not trust the frontend; it trusts the token's cryptographic signature.
    *   It fetches Google's public keys from the JWKS URL.
    *   It verifies the token's signature.
    *   It confirms the token's `issuer` is Google and its `audience` matches the API's `client_id`.
*   **Access Granted**: If the token is valid, the decoded user information is attached to the request object (`req.auth`), and the request proceeds to the appropriate controller to be processed. If invalid, a `401 Unauthorized` error is returned.

### 6. Token Refresh

*   **Reactive Refresh**: If an API call to `collab-flow-api` fails with a `401 Unauthorized` error (indicating an expired token), the `axios` response interceptor in `sync-forge` catches it. It then automatically calls the `google-oauth-backend`'s `/api/auth/refresh` endpoint with the stored `refresh_token` to get a new `access_token`. The failed request is then retried seamlessly.
*   **Proactive Refresh**: The frontend also sets a timer to proactively refresh the token a few minutes *before* it expires, ensuring a smooth user experience.

### 7. Logout

*   The user initiates a logout from the frontend.
*   The `authStore.logout()` action is called, which clears all tokens and user data from `localStorage`.
*   Optionally, a request is sent to Google's revoke endpoint to invalidate the session on Google's side.
*   The user is redirected to the login page.

## Security Summary

*   **PKCE**: Prevents authorization code interception attacks, as the secret `code_verifier` is required for the token exchange.
*   **Backend for Frontend**: The `google-oauth-backend` ensures the `client_secret` is never exposed to the public-facing frontend application.
*   **Independent Token Validation**: The `collab-flow-api` enforces a zero-trust policy by verifying every incoming token against the issuer (Google), ensuring all requests are from authenticated and authorized users.
*   **Short-Lived Access Tokens**: Using refresh tokens allows access tokens to have a short lifespan, minimizing the window of opportunity if one is compromised.




## google-oauth-backend - This backend serves as a secure proxy for Google OAuth, handling sensitive client_secret server-side.

-  Token Exchange (`/api/auth/token`): Frontend sends the authorization code and code_verifier to the backend. handleTokenRequest calls exchangeCodeForToken, which posts to Google's TOKEN_EXCHANGE
    endpoint with client_id, client_secret, redirect_uri, grant_type, code, and code_verifier. Google responds with access_token, refresh_token, id_token, and expires_in, which the backend returns
    to the frontend with an expires_at timestamp.

-  Token Refresh (`/api/auth/refresh`): Frontend sends refresh_token to /api/auth/refresh. handleTokenRefresh calls refreshAccessToken, which posts to Google's TOKEN_EXCHANGE endpoint with client_id,
    client_secret, grant_type, and refresh_token. Google returns a new access_token.

-  Token Validation/User Info (`/api/auth/validate`): Frontend/backend sends access_token in Authorization header to /api/auth/validate. handleTokenValidation calls validateAccessToken, which GET requests
    Google's USER_INFO endpoint with the access token. Google responds with user information.


## Frontend Authentication Flow Summary:

1. Login Initiation (`LoginView.vue`): User clicks "Sign in with Google," PKCE code_verifier and code_challenge are generated. code_verifier is stored in localStorage via authStore. User is redirected to Google with authorization parameters.
2. Google Authorization & Redirect: User authenticates, Google redirects back to AuthCallback.vue with an authorization code.
3. Callback Handling (`AuthCallback.vue`): The component extracts the code and retrieves the code_verifier from localStorage. It then sends these to the backend's `/api/auth/token` endpoint, which exchanges them for access_token, refresh_token, and expires_in. These tokens are stored in localStorage via authStore, and a request to `/api/auth/validate` fetches and stores the user's profile.
    Finally, the code_verifier is cleared, and the user is redirected to the home page.
4. Token Management (`stores/auth.ts` & `utils/api.ts`): authStore.init() registers authStore.refreshAccessToken with api.setRefreshTokenFn(). API calls automatically attach access_token. authStore proactively refreshes tokens before expiry. If a 401 occurs, the api.ts response interceptor triggers authStore.refreshAccessToken() to obtain a new token from the backend, and retries the failed request. authStore.logout() handles user logout by clearing data and revoking tokens.


## Authentication Mechanism/Process Flow in Collab-Flow

This system implements a secure Google OAuth 2.0 flow with PKCE (Proof Key for Code Exchange) to authenticate users in the sync-forge (frontend) application, leveraging google-oauth-backend as a
secure intermediary for handling sensitive client credentials and orchestrating token exchanges with Google.

Key Actors:

1. `sync-forge` (Frontend - Vue.js Application): Manages user interface, initiates the OAuth flow, handles redirects, stores tokens and user data client-side, and makes authenticated API requests.
2. `google-oauth-backend` (Backend - Node.js/Express Application): Acts as a secure proxy, handling the exchange of authorization codes for tokens with Google, refreshing tokens, and validating
    access tokens. It keeps the Google client_secret confidential.
3. Google OAuth 2.0 Services: Google's authorization server and resource server, responsible for authenticating users, granting permissions, and issuing/validating tokens.

Authentication Process Flow:

The authentication process is divided into several stages:

1. Login Initiation (Frontend: LoginView.vue)

* User Action: The user clicks a "Sign in with Google" button on the sync-forge LoginView.vue.
* PKCE Generation (`utils/pkce.ts`):
    * The frontend generates a cryptographically random code_verifier.
    * It then generates a code_challenge by SHA256-hashing and base64url-encoding the code_verifier.
* Store `code_verifier` (`stores/auth.ts`): The code_verifier is temporarily stored in the browser's localStorage via the authStore (using setPkceCodeVerifier). This is crucial for PKCE validation
    later.
* Redirect to Google: LoginView.vue constructs a Google authorization URL with the following parameters:
    * client_id (publicly exposed, from environment variables)
    * redirect_uri (points to sync-forge/src/views/AuthCallback.vue)
    * response_type=code (requesting an authorization code)
    * scope (e.g., openid email profile)
    * code_challenge (the generated hash)
    * code_challenge_method=S256
    * access_type=offline (to obtain a refresh token)
    * prompt=consent
* The user's browser is then redirected to this Google authorization URL.

2. Google User Authorization

* User Interaction: Google prompts the user to log in (if not already) and grant the application the requested permissions.
* Redirect with Code: Upon successful authorization, Google redirects the user's browser back to the redirect_uri (AuthCallback.vue) provided by sync-forge, appending an authorization code as a
    query parameter.

3. Callback Handling and Token Exchange (Frontend: AuthCallback.vue -> Backend: /api/token)

* Frontend Takes Over (`AuthCallback.vue`):
    * AuthCallback.vue component loads.
    * It extracts the authorization code from the URL query parameters.
    * It retrieves the previously stored code_verifier from localStorage using authStore.getPkceCodeVerifier().
    * Interaction with Backend: AuthCallback.vue makes a POST request to the google-oauth-backend's /api/auth/token endpoint (via api.post(ApiEndpoints.AUTH_TOKEN)), sending both the authorization
        code and the code_verifier in the request body.
* Backend Exchanges Code for Tokens (`google-oauth-backend` - `auth.controller.ts` -> `auth.service.ts`):
    * The handleTokenRequest in auth.controller.ts receives the code and code_verifier.
    * It calls exchangeCodeForToken in auth.service.ts.
    * exchangeCodeForToken makes a POST request to Google's https://oauth2.googleapis.com/token endpoint. This request securely includes:
        * client_id
        * client_secret (kept secret on the backend)
        * redirect_uri
        * grant_type=authorization_code
        * The received code
        * The received code_verifier (Google validates this against the code_challenge it received earlier).
    * Google responds with access_token, refresh_token, id_token, and expires_in.
    * The google-oauth-backend sends this token data (along with a calculated expires_at timestamp) back to the sync-forge frontend.
* Cleanup (`AuthCallback.vue`): AuthCallback.vue calls authStore.clearPkceCodeVerifier() to remove the code_verifier from localStorage.

4. Token Storage and User Profile Retrieval (Frontend: AuthStore -> Backend: /api/validate)

* Store Tokens (`AuthCallback.vue` -> `stores/auth.ts`):
    * AuthCallback.vue receives the token data from the backend.
    * It dispatches authStore.setAuthTokens(), which saves the access_token, refresh_token, expires_in, and a isGoogleLogin flag into localStorage.
* Retrieve User Profile (`AuthCallback.vue` -> Backend: `/api/validate`):
    * AuthCallback.vue then makes a GET request to the google-oauth-backend's /api/auth/validate endpoint (via api.get(ApiEndpoints.AUTH_VALIDATE)).
    * Frontend API Interceptor (`utils/api.ts`): The axios request interceptor in utils/api.ts automatically adds the newly stored access_token to the Authorization: Bearer <token> header of this
        request.
    * Backend Validates Token (`google-oauth-backend` - `auth.controller.ts` -> `auth.service.ts`):
        * The handleTokenValidation in auth.controller.ts extracts the access_token.
        * It calls validateAccessToken in auth.service.ts, which makes a GET request to Google's USER_INFO endpoint (https://www.googleapis.com/oauth2/v3/userinfo) with the access_token.
        * Google returns the user's profile information.
        * The google-oauth-backend sends this user data back to sync-forge.
* Store User Data (`AuthCallback.vue` -> `stores/auth.ts`): AuthCallback.vue dispatches authStore.setUser() to save the user's profile data into localStorage and the authStore state.
* Redirect to Application: The user is finally redirected to the main application (/).

5. Token Refresh and Authenticated API Requests

* Authenticated API Requests (`utils/api.ts`): For all subsequent API calls made by sync-forge using the configured axios instances (authApi, collabFlowApi), the request interceptor in utils/api.ts
    automatically attaches the current access_token from localStorage to the Authorization header.
* Proactive Token Refresh (`stores/auth.ts`):
    * When tokens are initially set, authStore.scheduleProactiveRefresh() sets a timer to refresh the access_token shortly before it expires (e.g., 5 minutes prior).
    * When the timer fires, authStore.refreshAccessToken() is called.
* Reactive Token Refresh (API Interceptor -> `stores/auth.ts` -> Backend: `/api/refresh`):
    * If an outgoing API request (e.g., to collab-flow-api) receives a 401 Unauthorized status response, it indicates an expired access_token.
    * The axios response interceptor in utils/api.ts catches this 401 error.
    * It checks if refreshTokenFn is available (which was registered as authStore.refreshAccessToken during authStore.init()).
    * It calls authStore.refreshAccessToken().
    * authStore.refreshAccessToken() makes a POST request to the google-oauth-backend's /api/auth/refresh endpoint, sending the refresh_token from localStorage.
    * Backend Refreshes Token (`google-oauth-backend` - `auth.controller.ts` -> `auth.service.ts`):
        * The handleTokenRefresh in auth.controller.ts receives the refresh_token.
        * It calls refreshAccessToken in auth.service.ts, which makes a POST request to Google's https://oauth2.googleapis.com/token endpoint with client_id, client_secret,
            grant_type=refresh_token, and the refresh_token.
        * Google issues a new access_token (and optionally a new refresh_token).
        * The google-oauth-backend sends this new token data back to sync-forge.
    * Update Tokens (`stores/auth.ts`): authStore updates the access_token (and refresh_token if a new one was issued) in localStorage and reschedules proactive refresh.
    * Retry Failed Requests (`utils/api.ts`): The axios interceptor in utils/api.ts retries the original failed API request (and any others that queued up during the refresh) with the newly
        acquired access_token.
* Concurrency Handling (`utils/api.ts` & `stores/auth.ts`): The isRefreshing flag and failedQueue in utils/api.ts, combined with activeRefreshPromise in authStore, ensure that only one token
    refresh operation is active at a time, and all pending requests wait for the new token before retrying.

6. Logout (stores/auth.ts)
* User Action: The user initiates a logout action in sync-forge.
* `authStore.logout()`:
    * Clears access_token, refresh_token, token_expires_at, user data from localStorage.
    * Cancels any pending proactive refresh timers.
    * Optionally, it calls revokeGoogleToken() to inform Google that the token is no longer valid, enhancing security.
* The user is typically redirected back to the LoginView.vue.

Security Considerations:

* PKCE: The Proof Key for Code Exchange (PKCE) flow prevents authorization code interception attacks. Even if a malicious application intercepts the authorization code, it cannot exchange it for
    tokens without the code_verifier, which is kept secret by the legitimate client.
* Backend Proxy: By handling the client_secret on the google-oauth-backend, the frontend (sync-forge) never exposes this sensitive credential, which is a critical security measure for public
    clients.
* Refresh Tokens: Using refresh_tokens allows for obtaining new access_tokens without requiring the user to re-authenticate frequently, while keeping the lifespan of access_tokens short, reducing
    their exposure.
* Proactive/Reactive Refresh: A robust token refresh strategy ensures a continuous authenticated experience while maintaining security.

This architecture provides a secure, efficient, and user-friendly authentication experience by leveraging Google OAuth 2.0 with PKCE and a dedicated backend service.



## Collab-Flow-API Authentication and Request Flow

The collab-flow-api is a Node.js/Express.js application that serves as the backend for the collaboration features. It exposes RESTful API endpoints for managing resources like tasks, projects, and
users. A key aspect of this API is its robust authentication mechanism, which relies on JWTs (ID Tokens) issued by Google and validated using express-jwt and Google's JWKS.

Key Components:

* `server.ts`: The entry point of the application. It sets up the Express server, configures global middleware (JSON parsing, CORS, Helmet), defines the base /api route, and implements a global
    error-handling middleware.
* `middleware/auth.middleware.ts` (`checkJwt`): This critical middleware is responsible for validating incoming JSON Web Tokens (JWTs). It uses Google's public keys (fetched via JWKS) to verify the
    token's signature and checks its audience and issuer.
* `routes/index.ts`: The main API router. It applies the checkJwt authentication middleware to all sub-routes, ensuring that all subsequent API endpoints require a valid JWT for access. It then
    mounts sub-routers for specific resources (tasks, projects, users).
* `routes/*.routes.ts` (e.g., `task.routes.ts`): Defines specific endpoints for a resource (e.g., GET /, GET /:id, POST / for tasks) and delegates handling to the respective controller.
* `controllers/*.controller.ts` (e.g., `task.controller.ts`): Receives requests from the router, extracts data from the request (body, params, query), and delegates the business logic to the
    service layer. It handles sending back appropriate HTTP responses.
* `services/*.service.ts` (e.g., `task.service.ts`): Contains the core business logic for a resource. It orchestrates operations, applies validations, and delegates data persistence to the
    repository layer.
* `repositories/*.repository.ts` (e.g., `task.repository.ts`): Handles direct interaction with the database or data storage, abstracting away the specifics of data access.
* `utils/logger.ts`: Provides logging capabilities for the application.

Request Flow - General Overview:

1. Request Reception: An incoming HTTP request (e.g., POST /api/tasks) hits the Express server (server.ts).
2. Global Middleware: The request passes through global middleware (express.json(), cors(), helmet()).
3. API Router (`routes/index.ts`): The request is routed to the main API router due to the /api prefix.
4. Authentication (`middleware/auth.middleware.ts` - `checkJwt`): The checkJwt middleware intercepts the request. It extracts the JWT (ID Token) from the Authorization: Bearer <token> header. It
    then validates this JWT's signature, audience (GOOGLE_CLIENT_ID), and issuer (https://accounts.google.com) against Google's public keys (obtained from
    https://www.googleapis.com/oauth2/v3/certs).
    * If valid: The request proceeds to the next middleware/route handler. The decoded JWT payload (containing user information like sub, email, etc.) is typically attached to the req.auth object
        by express-jwt.
    * If invalid/missing: The middleware throws an UnauthorizedError, which is caught by the global error handler in server.ts, returning a 401 Unauthorized response to the client.
5. Resource Router (`routes/*.routes.ts`): If authenticated, the request is then passed to the appropriate resource-specific router (e.g., task.routes.ts).
6. Controller (`controllers/*.controller.ts`): The relevant controller method (e.g., taskController.createTask) is invoked. It extracts necessary data from the request.
7. Service (`services/*.service.ts`): The controller calls a method on the corresponding service (e.g., taskService.createTask), passing the extracted data. The service applies business logic.
8. Repository (`repositories/*.repository.ts`): The service calls a method on the repository (e.g., taskRepository.create) to interact with the database.
9. Response: The result from the repository propagates back through the service and controller. The controller then crafts an appropriate HTTP response (e.g., 201 Created with the new task data)
    and sends it back to the client.

Authentication Specifics:

The collab-flow-api is designed to work with the google-oauth-backend service. The sync-forge frontend, after obtaining an ID Token from Google (via the google-oauth-backend's token exchange), sends
this ID Token to collab-flow-api in the Authorization header for protected endpoints. The collab-flow-api independently verifies the authenticity and integrity of this ID Token.

Example: Creating a Task (POST /api/tasks)

1. Frontend (`sync-forge`): Makes a POST request to https://collab-flow-api.example.com/api/tasks with a task payload in the body and an Authorization: Bearer <ID_TOKEN> header.
2. `collab-flow-api/src/server.ts`: Receives the request.
3. `collab-flow-api/src/routes/index.ts`: Routes the request to its internal handler.
4. `collab-flow-api/src/middleware/auth.middleware.ts`: The checkJwt middleware verifies the <ID_TOKEN> against Google's JWKS. If valid, the decoded payload (containing user ID from Google, etc.)
    is available in req.auth.
5. `collab-flow-api/src/routes/task.routes.ts`: Matches POST /tasks and invokes taskController.createTask.
6. `collab-flow-api/src/controllers/task.controller.ts`: Extracts req.body (the task data) and potentially user ID from req.auth. Calls taskService.createTask(req.body).
7. `collab-flow-api/src/services/task.service.ts`: Receives task data. (If there were business rules, they'd apply here). Calls taskRepository.create(taskData).
8. `collab-flow-api/src/repositories/task.repository.ts`: Inserts the task data into the database.
9. Response: The newly created task object is returned through the service and controller. taskController.createTask sends a 201 Created HTTP response with the new task object in the body back to
    the frontend.

Error Handling:

The server.ts includes a global error handler that catches errors. Specifically, UnauthorizedError (thrown by express-jwt if token validation fails) is caught and transformed into a 401 Unauthorized
response. Other unhandled errors result in a 500 Internal Server Error.

This layered architecture with JWT authentication provides a secure and scalable foundation for the collab-flow-api.



## TODO improvements
1. Implement an Authorization Layer in collab-flow-api

This is the most critical missing piece.

* Current State: The system is excellent at Authentication (verifying who a user is via their Google token).
* The Gap: It appears to lack Authorization (determining what a user is allowed to do). Right now, any authenticated user could potentially access or modify any project or task, because the API
  only checks if the token is valid, not if the user associated with that token has rights to the specific resource being requested.
* Proposed Change:
    1. Introduce concepts of resource ownership and membership (e.g., a user "owns" a project, or is a "member" of a project).
    2. In the collab-flow-api's service layer (e.g., project.service.ts), before performing any action, add checks to ensure the user ID from the token (req.auth.sub) has the necessary permissions
       for the resource they are trying to access.
    3. This would prevent users from seeing or editing projects and tasks that don't belong to them, which is a fundamental requirement for a collaboration application.

2. Simplify the Login Flow by Removing /api/auth/validate

* Current State: After the frontend gets tokens from google-oauth-backend, it makes a second call to the /api/auth/validate endpoint just to get the user's profile information.
* The Inefficiency: The id_token that the frontend receives is a JWT that already contains the user's profile information (name, email, picture, etc.) right inside it. The second API call is
  redundant.
* Proposed Change:
    1. In google-oauth-backend, remove the /api/auth/validate endpoint and its corresponding controller/service logic.
    2. In the sync-forge frontend (AuthCallback.vue), instead of making the second API call, use a JWT decoding library (like jwt-decode) to decode the id_token directly in the browser.
    3. This gives you the user profile instantly, eliminating an entire network round-trip, making the login feel faster, and reducing the surface area of the authentication backend.

These are the two most significant architectural improvements I would suggest. Implementing the authorization layer is crucial for the application to be viable, while simplifying the login flow is a
valuable optimization.