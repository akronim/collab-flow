# Configuration Management

This directory contains the centralized configuration setup for this monorepo.

## The Strategy

The goal of this setup is to separate three distinct types of configuration:

1.  **Base/Shared Config:** The structure of the configuration, default values, and non-sensitive information. This is safe to commit to Git.
2.  **Environment-Specific Config:** Settings that change between `development`, `staging`, and `production`.
3.  **Secrets/Local Overrides:** Sensitive data (API keys, secrets) that should **never** be committed to Git.

## File Roles

### `config.json`
-   **Purpose:** This is the **base and environment-specific configuration file**.
-   **Contents:** It defines the complete shape of the configuration for all environments (`development`, `staging`, etc.). It contains all non-sensitive information and **placeholders** for any secret values.
-   **Git Status:** **Committed** to Git.

### `config.local.json`
-   **Purpose:** This is your **local secrets and overrides file**. It is for your machine only.
-   **Contents:** It holds the **real, sensitive values** for the secrets defined as placeholders in `config.json`. The script merges this file's contents over the base configuration at runtime.
-   **Database Overrides:** You can also override the default database connection settings here (e.g., if you are using a non-Docker database or connecting to an external server).
-   **Git Status:** **NEVER committed** to Git. This file is listed in the root `.gitignore`.

### `config.local.json.example`
-   **Purpose:** This is a **template for other developers**.
-   **Contents:** It shows a new developer what `config.local.json` should look like and what secrets they need to provide.
-   **Git Status:** **Committed** to Git.

## How it Works

The `npm run env:sync` command executes the `config/sync.ts` script. This script:
1.  Reads `config.json` for the specified environment (defaults to `development`).
2.  Looks for `config.local.json` and merges its `secrets` on top of the base configuration.
3.  Validates that no placeholder values for secrets are left.
4.  Generates the appropriate `.env` file for each service (`sync-forge`, `collab-flow-api`, etc.), containing only the variables that service needs.

This provides a secure, centralized, and scalable way to manage configuration across the project.

## Adding a New Environment (e.g., Production)

Here is the step-by-step process you would follow to configure and run a new "production" environment.

### Step 1: Define the "Production" Environment

First, define the new environment in `config/config.json`. You can copy the `development` block and change any values as needed (e.g., app title, ports).

```json
{
  "development": {
    "shared": { ... },
    "ports": { ... },
    "secrets": { ... }
  },
  "production": {
    "shared": {
      "JWT_SECRET_LENGTH": 64,
      "JWT_EXPIRES_IN": "1h",
      "APP_TITLE": "CollabFlow"
    },
    "ports": {
      "collab_flow_api": 8080,
      "google_oauth_backend": 8081,
      "sync_forge": 80
    },
    "secrets": {
      "GOOGLE_CLIENT_ID": "your-PROD-google-client-id.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "your-PROD-google-client-secret"
    }
  }
}
```

### Step 2: Provide Production Secrets

Next, provide the *actual* secrets for your production environment in `config/config.local.json`. You would likely have a separate Google OAuth Client for your production URL.

```json
{
  "development": {
    "secrets": { ... }
  },
  "production": {
    "secrets": {
      "GOOGLE_CLIENT_ID": "paste-your-PROD-client-id-here",
      "GOOGLE_CLIENT_SECRET": "paste-your-PROD-secret-here"
    }
  }
}
```

### Step 3: Generate the Production `.env` Files

Run the `env:sync` script, telling it to use the `production` configuration by passing the `--env` flag:

```bash
npm run env:sync -- --env=production
```
This will generate new `.env` files in each service directory with the correct production settings.

### Step 4: Run the Apps in Production Mode

Now that the `.env` files are configured for production:

-   The backend services (`collab-flow-api`, `google-oauth-backend`) will automatically pick up the `NODE_ENV=production` setting. You can start them using their production start commands (e.g., `npm run start:prod`).
-   For the frontend (`sync-forge`), you would build for production and then serve the built files:
    ```bash
    # In the sync-forge directory
    npm run build
    npm run preview
    ```
This same process can be used for any environment you wish to create (e.g., `staging`, `testing`).