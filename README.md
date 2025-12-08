# CollabFlow

CollabFlow is a real-time collaborative project and task management tool, inspired by Jira, Asana, and Google Docs. This project is a demonstration of a full-stack application with a microservices architecture.

## Architecture

The application is composed of three main services:

*   **`sync-forge` (Frontend):** A Vue.js 3 single-page application that provides the user interface.
*   **`google-oauth-backend` (Backend):** An Express.js service that acts as an OAuth 2.0 client for Google authentication and as an API Gateway.
*   **`collab-flow-api` (Backend):** An Express.js service that provides the core API for managing projects, tasks, and users.

Here is a diagram of the architecture:

```
[User] -> [sync-forge (Vue.js)] -> [google-oauth-backend (Express.js)] -> [collab-flow-api (Express.js)]
   |                                    ^
   |                                    | (OAuth 2.0)
   +------------------------------------v
                                     [Google]
```

### Authentication Flow

1.  The user initiates the login process in the `sync-forge` frontend.
2.  The frontend redirects the user to Google for authentication.
3.  After successful authentication, Google redirects the user back to the frontend with an authorization code.
4.  The frontend sends the authorization code to the `google-oauth-backend`.
5.  The `google-oauth-backend` exchanges the authorization code for a Google access token and refresh token.
6.  The `google-oauth-backend` creates an internal JWT and an internal refresh token (stored in a secure, httpOnly cookie) and sends them to the frontend.
7.  For subsequent requests to the `collab-flow-api`, the frontend sends the internal JWT to the `google-oauth-backend`.
8.  The `google-oauth-backend` validates the internal JWT and proxies the request to the `collab-flow-api`.

## Features

*   Multi-project task management with Kanban boards and list views.
*   Real-time collaboration (not yet implemented).
*   Rich text editor for task descriptions (not yet implemented).
*   Advanced filtering and search.
*   Team management with role-based access control (not yet implemented).
*   Authentication via Google OAuth 2.0.

## Tech Stack

### `sync-forge` (Frontend)

*   **Framework:** Vue.js 3 with Vite
*   **State Management:** Pinia
*   **Routing:** Vue Router
*   **API Communication:** Axios
*   **Styling:** Tailwind CSS
*   **Testing:** Vitest, Playwright

### `collab-flow-api` (Backend)

*   **Framework:** Express.js
*   **Architecture:** Controller/Service/Repository
*   **Data Persistence:** In-memory mock data
*   **Authentication:** JWT
*   **Testing:** Vitest

### `google-oauth-backend` (Backend)

*   **Framework:** Express.js
*   **Authentication:** Google OAuth 2.0, JWT
*   **API Gateway:** http-proxy-middleware
*   **Testing:** Vitest

## Getting Started

### Prerequisites

*   Node.js (v20 or higher)
*   npm

### Installation

1.  Clone the repository.
2.  Install the dependencies for each service:

    ```bash
    cd sync-forge
    npm install
    cd ../collab-flow-api
    npm install
    cd ../google-oauth-backend
    npm install
    cd ..
    ```

### Configuration

You will need to create `.env` files for each service, based on the `.env.example` files.

**1. `google-oauth-backend/.env`**

You will need to create a Google OAuth 2.0 client ID and secret from the [Google API Console](https://console.developers.google.com/).

```
PORT=3001
CORS_ORIGIN=http://localhost:5173
COLLAB_FLOW_API_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
JWT_SECRET=a-very-secret-key
JWT_EXPIRES_IN=15m
```

**2. `collab-flow-api/.env`**

```
PORT=3000
JWT_SECRET=a-very-secret-key
```

**3. `sync-forge/.env`**

```
VITE_GATEWAY_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Running the Application

You will need to run all three services concurrently in separate terminals.

**Terminal 1: `collab-flow-api`**

```bash
cd collab-flow-api
npm run dev
```

**Terminal 2: `google-oauth-backend`**

```bash
cd google-oauth-backend
npm run dev
```

**Terminal 3: `sync-forge`**

```bash
cd sync-forge
npm run dev
```

The application will be available at http://localhost:5173.

## Running Tests

You can run the tests for each service separately.

**`sync-forge`**

```bash
cd sync-forge
npm run test:unit
npm run test:e2e
```

**`collab-flow-api`**

```bash
cd collab-flow-api
npm run test:unit
```

**`google-oauth-backend`**

```bash
cd google-oauth-backend
npm run test:unit
```