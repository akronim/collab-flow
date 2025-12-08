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

This project uses a centralized configuration system managed in the `/config` directory. For a detailed explanation, see `config/README.md`.

**Initial Setup:**

1.  **Create Local Secrets File:**
    First, create your local secrets file by copying the example:
    ```bash
    cp config/config.local.json.example config/config.local.json
    ```
    Next, open `config/config.local.json` and fill in your actual `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. This file is git-ignored and will not be committed.

2.  **Generate Environment Files:**
    Run the synchronization script from the root of the project to generate the `.env` files for each service:
    ```bash
    npm run env:sync
    ```
    This script reads the configuration, merges your local secrets, generates a shared `JWT_SECRET`, and creates the final `.env` file in each service's directory. You should run this script once during initial setup or any time you change the configuration.

#### How This Scales

When you are ready for a production environment, you would:

1.  Add a `"production"` section to `config/config.json` with production-specific settings (like a different database URL, etc.).
2.  On your production server, you would **not** use a `config.local.json` file. Instead, your hosting provider (like Vercel, AWS, or Docker) would inject the production secrets directly as environment variables. The application is designed to prioritize these environment variables over the configuration files.

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