# CollabFlow

This project is a full-stack application demonstrating Google OAuth 2.0 authentication with a Vue.js frontend and a Node.js backend.

## Overview

The project is divided into two main parts:

*   **`sync-forge`**: A Vue.js single-page application that handles the user interface and all client-side authentication logic.
*   **`google-oauth-backend`**: A Node.js (Express) server that securely handles the server-side aspects of the OAuth 2.0 flow, such as token exchange and validation.

## Features

*   Secure Google OAuth 2.0 implementation using the Authorization Code Flow with PKCE.
*   Automatic token refresh mechanism to keep users logged in.
*   Decoupled frontend and backend for better separation of concerns.
*   Protected routes on the frontend.

## Setup and Running the Application

### Prerequisites

*   Node.js (version specified in `sync-forge/package.json`)
*   A Google Cloud project with OAuth 2.0 credentials (`client_id` and `client_secret`).

### Backend Setup (`google-oauth-backend`)

1.  Navigate to the `google-oauth-backend` directory:
    ```bash
    cd google-oauth-backend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file by copying the example:
    ```bash
    cp .env.example .env
    ```
4.  Edit the `.env` file and add your Google OAuth credentials:
    ```
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    REDIRECT_URI=http://localhost:5173/auth/callback
    ```
5.  Start the backend server in development mode:
    ```bash
    npm run dev
    ```
    The server will be running on `http://localhost:3001`.

### Frontend Setup (`sync-forge`)

1.  Navigate to the `sync-forge` directory:
    ```bash
    cd ../sync-forge
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and add your Google Client ID:
    ```
    VITE_GOOGLE_CLIENT_ID=your_google_client_id
    VITE_BACKEND_URL=http://localhost:3001
    ```
4.  Start the frontend development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Authentication Flow

The authentication process is designed to be secure and robust, following modern best practices.

1.  **Initiation (Frontend):**
    *   The user clicks the "Sign in with Google" button.
    *   The frontend generates a `code_verifier` and a `code_challenge`.
    *   The user is redirected to Google's authorization server with the `code_challenge`.

2.  **User Consent (Google):**
    *   The user grants the application access to their Google account.
    *   Google redirects the user back to the frontend at `/auth/callback` with an `authorization_code`.

3.  **Token Exchange (Backend):**
    *   The frontend sends the `authorization_code` and `code_verifier` to the backend's `/api/auth/token` endpoint.
    *   The backend securely exchanges these with Google for an `access_token` and `refresh_token`.
    *   The tokens are returned to the frontend.

4.  **Authenticated Session (Frontend):**
    *   The frontend stores the tokens and uses the `access_token` to call the backend's `/api/auth/validate` endpoint to fetch user profile information.
    *   The user is now logged in.

5.  **Token Refresh:**
    *   When the `access_token` expires, the frontend's Axios interceptor automatically calls the backend's `/api/auth/refresh` endpoint with the `refresh_token` to get a new `access_token`.

## Backend API Endpoints



*   `POST /api/auth/token`: Exchanges an authorization code for tokens.

*   `POST /api/auth/refresh`: Refreshes an access token.

*   `GET /api/auth/validate`: Validates an access token and returns the user's profile.



## Frontend Utilities



### `getToken()`



The `useAuth()` composable provides a `getToken()` function that safely retrieves a valid access token. It automatically refreshes the token if it's about to expire.



While the main `api` client handles this automatically, `getToken()` is useful for authenticated actions that happen outside of the client, such as establishing a WebSocket connection or making manual `fetch` requests.
