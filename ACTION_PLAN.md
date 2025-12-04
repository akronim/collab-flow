# Action Plan for Authentication System Refactor

This document outlines the steps required to fix the critical flaws identified in the `TEST_JWT.md` analysis. The steps are prioritized to address the most severe, application-breaking issues first, followed by security hardening and reliability improvements.

---

### Step 1: Make Login Functional (Fix the Infinite Loop)

*   **Goal:** Allow a user to successfully log in and view a protected route. This is the absolute first priority to make the application usable.
*   **Problem Addressed:** Flaw #1 (Missing `setUser` Call).
*   **Files to Modify:**
    *   `sync-forge/src/views/AuthCallback.vue`
    *   `sync-forge/src/stores/auth.ts`

*   **Actions:**
    1.  **Decode the Token:** In `AuthCallback.vue`, after receiving the `internal_access_token`, decode the JWT to extract the user's profile information (e.g., ID, email, name). A lightweight library like `jwt-decode` can be added for this purpose.
    2.  **Set the User:** Immediately after decoding, call the `authStore.setUser()` action and pass the extracted user profile object. This will populate the application's state and cause `auth.isAuthenticated` to return `true`.

---

### Step 2: Implement Secure Token Transmission and Storage

*   **Goal:** Eliminate the use of `localStorage` for tokens and follow security best practices to protect against XSS attacks.
*   **Problems Addressed:** Flaw #2 (Ignored Refresh Token), Flaw #3 (XSS Vulnerability), Flaw #4 (Insecure JSON Response).
*   **Files to Modify:**
    *   `google-oauth-backend/src/controllers/auth.controller.ts`
    *   `sync-forge/src/views/AuthCallback.vue`
    *   `sync-forge/src/stores/auth.ts`
    *   `sync-forge/src/utils/api.gateway.ts`

*   **Actions:**
    1.  **Backend (`auth.controller.ts`):**
        *   Modify the `handleTokenRequest` and `handleInternalTokenRefresh` functions. Instead of sending the `internal_refresh_token` in the JSON body, send it in a **secure, `HttpOnly`, `SameSite=Strict` cookie**. The `accessToken` remains in the JSON body.
        *   Update `handleInternalTokenRefresh` to read the refresh token from the request's cookies instead of its body.
    2.  **Frontend (`auth.ts`):**
        *   Remove all logic for saving and retrieving the `internal_refresh_token` from `localStorage`.
        *   Change the `refreshAccessToken` function to send its `POST` request to `/api/auth/internal_refresh` without a body. The browser will automatically attach the `HttpOnly` cookie.
        *   Change the `setAuthTokens` function to store the `accessToken` in an **in-memory variable** within the store, not in `localStorage`.
    3.  **Frontend (`api.gateway.ts`):**
        *   Update the request interceptor to read the `accessToken` from the in-memory variable in the auth store instead of from `localStorage`.

---

### Step 3: Implement Persistent Backend Session Storage

*   **Goal:** Make the backend reliable and ensure user sessions survive a server restart.
*   **Problem Addressed:** Flaw #5 (Data Loss in Memory).
*   **Files to Modify:**
    *   `google-oauth-backend/src/services/tokenStore.service.ts`

*   **Actions:**
    1.  **Choose a Database:** Select a persistent key-value store. **Redis** is the industry standard for this type of session/token storage due to its speed.
    2.  **Replace `InMemoryTokenStore`:** Rewrite the `tokenStore.service.ts` file. Instead of using a `new Map()`, instantiate a client for your chosen database (e.g., `redis`).
    3.  **Rewrite Methods:** Update the `generateAndStore`, `getGoogleRefreshToken`, and `deleteToken` methods to perform their respective `SET`, `GET`, and `DEL` operations against the database.

---

### Step 4: Refactor API Client Architecture

*   **Goal:** Clean up the frontend architecture for better clarity, maintainability, and separation of concerns.
*   **Problem Addressed:** Flaw #6 (Misuse of API Client Factory).
*   **Files to Modify:**
    *   `sync-forge/src/utils/api.gateway.ts`
    *   `sync-forge/src/views/AuthCallback.vue` (and any other files that use the `authApi`).

*   **Actions:**
    1.  **Create Simple Auth Client:** Create a new file (`sync-forge/src/services/authApiClient.ts`) that exports a plain, simple Axios instance configured with the `VITE_AUTH_API_URL`. It should not have any special interceptors.
    2.  **Refactor Gateway:** Rename or repurpose `api.gateway.ts` to be specifically for the main API (`collabFlowApi`). It will continue to export the "smart" client with the token-refresh interceptors.
    3.  **Update Imports:** Go to all files that make authentication-related calls (like `AuthCallback.vue`) and change the import to use the new, simple `authApiClient`. All other API calls should use the `collabFlowApiClient`.
