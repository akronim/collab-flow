  Executive Summary

  The authentication system is currently non-functional. A series of compounding flaws—ranging from critical logic errors on the frontend to significant security and reliability issues on the backend—prevents a user from successfully logging in and using
  the application. After a successful authentication with Google, the user is immediately trapped in an infinite redirect loop, making the application completely unusable.

  ---

  Detailed Step-by-Step Analysis of the Failure

  This is a granular walkthrough of the user journey from login attempt to system failure.

  Phase 1: Login Initiation
   1. A user navigates to the LoginView.vue component.
   2. They click the "Login with Google" button.
   3. The frontend client (sync-forge) correctly generates a PKCE code_verifier and code_challenge. The code_verifier is stored in localStorage.
   4. The user is redirected to Google's OAuth consent screen with the appropriate parameters, including the code_challenge.

  Phase 2: External Authentication and Callback
   1. The user successfully authenticates with their Google account and grants the application permission.
   2. Google redirects the user back to the application at the predefined callback URL: /auth/callback.
   3. This route loads the AuthCallback.vue component. The URL contains a temporary, single-use authorization_code from Google.

  Phase 3: Backend Token Exchange
   1. The onMounted hook inside AuthCallback.vue executes.
   2. It retrieves the authorization_code from the URL and the code_verifier from localStorage.
   3. It makes a POST request to the google-oauth-backend at /api/auth/token, sending the code and code_verifier.
   4. The backend (auth.controller.ts) correctly processes this request:
       * It validates the request and exchanges the code with Google for a Google access_token and refresh_token.
       * It generates a short-lived internal_access_token (JWT) for use with the application's main API.
       * It generates a long-lived internal_refresh_token (UUID).
       * It stores the mapping between the internal and Google refresh tokens in an in-memory `Map`.
       * It sends a 200 OK response with a JSON body containing both internal tokens:

   1         {
   2           "internal_access_token": "your.jwt.access.token",
   3           "internal_refresh_token": "a-long-uuid-refresh-token",
   4           "expires_in": 3600
   5         }

  Phase 4: Critical Frontend Handling Failure
   1. The try block inside AuthCallback.vue receives the successful response from the backend.
   2. First error: The component destructures the response, but only extracts `internal_access_token` and `expires_in`. The internal_refresh_token from the response payload is ignored and immediately lost.
       * File: sync-forge/src/views/AuthCallback.vue, line 42:
   1         const { internal_access_token, expires_in } = tokenResp.data
   3. The component then calls the setAuthTokens action from the auth.ts store. Due to the previous error, it only provides the access token. The refresh token is never saved to localStorage.
   4. Second and fatal error: No call is ever made to the authStore.setUser() action. The internal_access_token, which contains the user's details in its payload (e.g., ID, email), is never decoded, and the user's identity is never loaded into the
      application's state.
   5. State at this moment:
       * localStorage contains an internal_access_token.
       * localStorage does not contain an internal_refresh_token.
       * The Pinia store's state.user property is null.
       * Therefore, the auth.isAuthenticated getter returns false.

  Phase 5: The Infinite Redirect Loop
   1. The try block in AuthCallback.vue completes, and its final action is to navigate the user to the application's root (router.replace('/')).
   2. The root path (/) is protected by the meta: { requiresAuth: true } flag.
   3. The router.beforeEach navigation guard in sync-forge/src/router/index.ts intercepts this navigation attempt.
   4. The guard executes its primary security check:
       * File: sync-forge/src/router/index.ts, line 70:
   1         if (to.meta.requiresAuth && !auth.isAuthenticated) {
   2           next(`/login`)
   3         }
   5. The condition is evaluated:
       * to.meta.requiresAuth is true.
       * !auth.isAuthenticated is true (because state.user is null).
   6. The condition passes, and the next('/login') function is called.
   7. Outcome: The user is immediately redirected back to the /login page. This concludes the failure loop. The user has successfully authenticated with Google only to be rejected by the application's own security guard, which is unaware of the successful
      login.

  ---

  Final, Consolidated List of Flaws

   1. Critical Failure (Application Unusable): Missing `setUser` Call
       * Problem: The user's identity is never loaded into the application state after login.
       * Impact: Causes auth.isAuthenticated to always be false, leading to an infinite redirect loop that makes all protected parts of the application inaccessible.

   2. Critical Logic Flaw (Session Non-Renewable): Ignored Refresh Token
       * Problem: The internal_refresh_token is received from the backend but never saved by the frontend.
       * Impact: Even if Flaw #1 were fixed, the user's session could not be renewed. They would be logged out as soon as the short-lived access token expired.

   3. Critical Security Flaw (XSS Vulnerability): Token Storage in `localStorage`
       * Problem: The application is designed to store sensitive tokens in localStorage, which is accessible to any client-side script.
       * Impact: Makes the application vulnerable to session hijacking via Cross-Site Scripting (XSS). An attacker could steal the refresh token and gain persistent access to the user's account.

   4. Critical Security Flaw (Insecure by Design): Refresh Token in JSON Response
       * Problem: The backend API sends the long-lived refresh token in a standard JSON body.
       * Impact: This practice facilitates the XSS vulnerability (Flaw #3). Secure applications deliver this token in a server-set, HttpOnly cookie to shield it from JavaScript.

   5. Major Reliability Flaw (Data Loss): In-Memory Backend Store
       * Problem: The backend's refresh token database is not persistent.
       * Impact: A simple server restart will wipe all session data, effectively logging out every user of the application.
   
   6. Design Flaw (Confusing and Brittle): Misuse of API Client Factory
       * Problem: A single factory function, `createApiClient` in `api.gateway.ts`, is used to create two API clients (`authApi` and `collabFlowApi`) that have different authentication needs. The factory applies complex token-refresh interceptors to both.
       * Impact: This is incorrect because the `authApi` client (which talks to the auth server) should not have these interceptors. Its endpoints (like `/token`) do not use bearer tokens and applying this logic can lead to errors or infinite refresh loops. It makes the code confusing and brittle.

  ---
  
  ### Architectural Recommendation: API Client Separation

  In light of Flaw #6 (Misuse of API Client Factory), the following architectural change is recommended for clarity, maintainability, and proper separation of concerns.

  Instead of creating both API clients in one file with a shared factory, they should be split into two distinct files, each with a single responsibility.

  **1. A simple client for the Authentication Server:**
  This client would be responsible only for communicating with the `google-oauth-backend`. It should be a plain Axios instance without the complex token-refresh interceptors.

  *   **Example File:** `sync-forge/src/services/authApiClient.ts`
      ```typescript
      import axios from 'axios';

      const authApiUrl = import.meta.env.VITE_AUTH_API_URL;

      export const authApiClient = axios.create({
        baseURL: authApiUrl,
        timeout: 10000
      });
      ```

  **2. A "smart" client for the Main Application API:**
  This client would be responsible for all communication with the `collab-flow-api`. This is the client that requires the interceptor logic to handle attaching bearer tokens and automatically refreshing them on `401` errors. The existing `createApiClient` factory is well-suited for this.

  *   **Example File:** `sync-forge/src/services/collabFlowApiClient.ts`
      ```typescript
      // ... all the imports and the createApiClient factory function ...

      const gatewayApiUrl = import.meta.env.VITE_GATEWAY_API_URL;

      export const collabFlowApiClient = createApiClient(gatewayApiUrl, INTERNAL_ACCESS_TOKEN_KEY);
      ```

  This separation ensures that each client has only the logic it needs and makes the overall frontend architecture cleaner and easier to reason about.
  
  ---
















  Trace Analysis of the Failed Authentication Flow

  ---

  Pre-condition: The user is on the /login page. The application state is fresh.
   * localStorage is empty of auth tokens.
   * The auth store state has user: null, so isAuthenticated is false.

  ---

  STEP 1: User Initiates Login
   * WHO: The User.
   * ACTION: Clicks the "Login with Google" button.
   * WHERE: The login method in sync-forge/src/views/LoginView.vue.
   * INTERNAL ACTIONS:
       1. generateCodeVerifier() is called to create a secret string (codeVerifier).
       2. authStore.setPkceCodeVerifier() is called.
           * ARGS: The codeVerifier string.
           * EFFECT: localStorage.setItem('code_verifier', '...the verifier...') is executed.
       3. generateCodeChallenge() is called with the codeVerifier.
       4. The browser's window.location.href is programmatically changed.
   * HTTP REQUEST:
       * CALLER: The user's Browser.
       * TARGET: https://accounts.google.com/o/oauth2/v2/auth
       * METHOD: GET
       * HEADERS: Standard browser GET request headers.
       * BODY: (None for a GET request).
       * QUERY PARAMS:
           * client_id: (your google client id)
           * redirect_uri: http://localhost:5173/auth/callback
           * response_type: code
           * scope: openid email profile
           * code_challenge: (the hashed code verifier)
           * code_challenge_method: S256

  ---

  STEP 2: Google Authenticates and Redirects Back
   * PRE-CONDITION: The user successfully logs into their Google account.
   * WHO: Google's OAuth Server.
   * ACTION: Responds to the browser's request from Step 1 with a redirect.
   * HTTP RESPONSE:
       * STATUS: 302 Found
       * RESPONSE HEADERS:
           * Location: http://localhost:5173/auth/callback?code=GOOGLE_AUTHORIZATION_CODE&scope=...
   * BROWSER ACTION: The browser follows the Location header and navigates to the callback URL, loading the AuthCallback.vue component.

  ---

  STEP 3: Frontend Exchanges Authorization Code for Tokens
   * WHO: The onMounted hook in sync-forge/src/views/AuthCallback.vue.
   * ACTION: It calls api.post() to send the code to the application's backend.
   * HTTP REQUEST:
       * CALLER: Axios (from sync-forge/src/utils/api.gateway.ts).
       * TARGET: http://localhost:3000/api/auth/token (the google-oauth-backend server).
       * METHOD: POST
       * HEADERS:
           * Content-Type: application/json
       * BODY:

   1         {
   2           "code": "GOOGLE_AUTHORIZATION_CODE",
   3           "codeVerifier": "(the verifier retrieved from localStorage)"
   4         }

  ---

  STEP 4: Backend Responds with Application Tokens
   * WHO: The handleTokenRequest function in google-oauth-backend/src/controllers/auth.controller.ts.
   * ACTION: It receives the request from Step 3, validates it with Google, generates internal tokens, and sends a JSON response.
   * HTTP RESPONSE:
       * STATUS: 200 OK
       * RESPONSE HEADERS:
           * Content-Type: application/json
       * RESPONSE BODY:

   1         {
   2           "internal_access_token": "your.jwt.access.token",
   3           "internal_refresh_token": "a-long-uuid-refresh-token",
   4           "expires_in": 3600,
   5           "expires_at": 1733306400000
   6         }

  ---

  STEP 5: Frontend Critically Fails to Process the Response
   * WHO: The try block in sync-forge/src/views/AuthCallback.vue.
   * ACTION: It receives the successful response body from Step 4.
   * INTERNAL ACTIONS (THE FLAWS):
       1. It destructures the response data but discards the `internal_refresh_token`.
           * const { internal_access_token, expires_in } = tokenResp.data;
       2. It calls authStore.setAuthTokens().
           * ARGS: An object { internalAccessToken: 'your.jwt.access.token', expiresIn: 3600 }.
           * EFFECT: The access token is saved to localStorage. The refresh token is not.
       3. FATAL FLAW: It never calls `authStore.setUser()`. The JWT is never decoded, and the user's identity is never loaded into the application's state.
   * STATE OF THE APP:
       * localStorage has an internal_access_token.
       * state.user in the auth store is still null.
       * The auth.isAuthenticated getter still returns false.

  ---

  STEP 6: The Infinite Redirect Loop
   * WHO: sync-forge/src/views/AuthCallback.vue.
   * ACTION: Having completed its "work," it calls router.replace('/') to send the user to the main application page.
   * INTERCEPTOR:
       * WHO: The router.beforeEach guard in sync-forge/src/router/index.ts.
       * ACTION: It intercepts the navigation attempt to /.
       * EVALUATION: It checks the condition if (to.meta.requiresAuth && !auth.isAuthenticated).
           * to.meta.requiresAuth is true.
           * !auth.isAuthenticated is true.
           * The entire condition is `true`.
   * FINAL ACTION:
       * WHO: The router.beforeEach guard.
       * ACTION: It calls next('/login').
   * RESULT: The user is immediately navigated back to the /login page. The application has successfully logged them in and then immediately rejected them, creating a loop.





  Standard Backend Handling of Google's Tokens

  Regarding your backend's interaction with Google, the more standard and efficient practice is to reduce external API calls.

   1. Store Google's Tokens: On initial login, the backend should securely store the google_refresh_token, the google_access_token, and the google_access_token's expiration time.
   2. Check Before Refreshing: When your backend needs to issue a new internal_access_token (because the frontend requested a refresh), it should first check if its stored google_access_token is still valid.
   3. Conditional Refresh:
       * If the google_access_token has not expired, the backend uses it to get the user's profile and issues a new internal token. No call to Google's refresh endpoint is made.
       * Only if the google_access_token has expired does the backend use the google_refresh_token to get a new one from Google.

  This "caching" strategy is more efficient and performant, reducing latency and reliance on the external Google API. It avoids refreshing the Google token every 10 minutes.


```ts
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig, type AxiosInstance } from 'axios'
import Logger from '@/utils/logger'

export interface AxConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

export type TokenRefreshFn = () => Promise<string | null>
export type TokenGetFn = () => string | null


export interface AuthApiClient extends AxiosInstance {
  setRefreshTokenFn: (fn: TokenRefreshFn) => void;
  setGetTokenFn: (fn: TokenGetFn) => void;
}

let refreshTokenFn: TokenRefreshFn | undefined
let getTokenFn: TokenGetFn | undefined
let isRefreshing = false
let failedQueue: QueueItem[] = []

const processQueue = (error: unknown = null, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else if (token) {
      resolve(token)
    } else {
      reject(new Error(`Token refresh failed`))
    }
  })
  failedQueue = []
}

/**
 * Factory function to create an Axios client for the main application API.
 * It includes interceptors to handle token attachment and refreshing.
 * @param baseURL The base URL for the main application API.
 * @returns A "smart" Axios instance with interceptors.
 */
// eslint-disable-next-line max-lines-per-function
export const createAuthApiClient = (baseURL: string): AuthApiClient => {
  if (!baseURL) {
    throw new Error(`Cannot create API client without a baseURL`)
  }

  const api = axios.create({
    baseURL,
    timeout: 10000
  }) as AuthApiClient

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (getTokenFn) {
      const token = getTokenFn()
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  })

  // eslint-disable-next-line max-lines-per-function
  const errRespInterceptor = async (err: AxiosError): Promise<unknown> => {
    const config = err.config as AxConfig

    if (err.response?.status !== 401 || !config || !refreshTokenFn) {
      return Promise.reject(err)
    }

    if (config._retry) {
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        config._retry = true
        failedQueue.push({ resolve, reject })
      })
        .then(token => {
          const retryConfig = {
            ...config,
            headers: { ...config.headers, Authorization: `Bearer ${token}` }
          }
          return api.request(retryConfig)
        })
        .catch(queueError => {
          const error = queueError instanceof Error ? queueError : new Error(String(queueError))
          return Promise.reject(error)
        })
    }

    isRefreshing = true
    config._retry = true

    try {
      const newToken = await refreshTokenFn()

      if (!newToken) {
        const refreshError = new Error(`Token refresh failed`)
        processQueue(refreshError)
        return Promise.reject(refreshError)
      }

      processQueue(null, newToken)

      const retryConfig = {
        ...config,
        headers: { ...config.headers, Authorization: `Bearer ${newToken}` }
      }
      return api.request(retryConfig)
    } catch (refreshError) {
      Logger.error(`Token refresh error:`, refreshError)
      processQueue(refreshError)
      const error = refreshError instanceof Error ? refreshError : new Error(String(refreshError))
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }

  api.interceptors.response.use((res: AxiosResponse) => res, errRespInterceptor)

  api.setRefreshTokenFn = (fn: TokenRefreshFn): void => {
    refreshTokenFn = fn
  }

  api.setGetTokenFn = (fn: TokenGetFn): void => {
    getTokenFn = fn
  }

  return api
}

const gatewayApiUrl = import.meta.env.VITE_GATEWAY_API_URL

if (!gatewayApiUrl) {
  throw new Error(`VITE_GATEWAY_API_URL is not defined. Please check your .env file.`)
}

/**
 * Singleton instance of the "smart" API client for the application to use.
 */
export const authApiClient = createAuthApiClient(gatewayApiUrl)
```



-----------
```ts
import axios, { type AxiosInstance } from 'axios'

/**
 * Factory function to create a simple Axios instance.
 * Exported for testability.
 * @param baseURL The base URL for the authentication API.
 * @returns A simple Axios instance.
 */
export const createSimpleApiClient = (baseURL: string): AxiosInstance => {
  if (!baseURL) {
    throw new Error(`Cannot create API client without a baseURL`)
  }

  const api = axios.create({
    baseURL,
    timeout: 10000,
    withCredentials: true
  })

  // This client intentionally has NO interceptors for token refreshing,
  // as it is used for the authentication calls themselves (e.g., /token, /refresh).

  return api
}

const authApiUrl = import.meta.env.VITE_AUTH_API_URL

if (!authApiUrl) {
  throw new Error(`VITE_AUTH_API_URL is not defined. Please check your .env file.`)
}

/**
 * Singleton instance of the auth API client for the application to use.
 */
export const simpleApiClient = createSimpleApiClient(authApiUrl)
```

-------------------

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      <p class="mt-4 text-lg font-medium text-gray-700">
        Signing you in…
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { simpleApiClient } from '@/services/simpleApiClient'
import axios from 'axios'
import Logger from '@/utils/logger'
import { RouteNames } from '@/constants/routes'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import { jwtDecode } from 'jwt-decode'
import type { User } from '@/types/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const code = route.query.code as string | undefined
  const codeVerifier = authStore.getPkceCodeVerifier()

  if (!code || !codeVerifier) {
    await router.replace({ name: RouteNames.LOGIN })
    return
  }

  try {
    const tokenResp = await simpleApiClient.post(ApiEndpoints.AUTH_TOKEN, { code, codeVerifier })

    const { internal_access_token, expires_in } = tokenResp.data

    if (!internal_access_token) {
      throw new Error(`Missing internal_access_token in auth response`)
    }

    const user = jwtDecode<User>(internal_access_token)

    authStore.setUser({ user })

    authStore.setAuthTokens({
      internalAccessToken: internal_access_token,
      expiresIn: expires_in
    })

    await router.replace(`/`)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      Logger.error(`Auth failed:`, err.response?.data ?? err.message)
    } else {
      Logger.error(`Auth failed:`, err)
    }
    await router.replace({ name: RouteNames.LOGIN })
  } finally {
    authStore.clearPkceCodeVerifier()
  }
})
</script>
