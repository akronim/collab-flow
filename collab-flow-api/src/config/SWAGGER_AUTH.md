# How to Authenticate with Swagger

To use the protected endpoints in the Swagger UI, you need to obtain a JWT (JSON Web Token) by logging in through the web interface.

## 1. Run the Services

You need to have all three services running. Open three separate terminals and run the following commands:

**Terminal 1: Start the API**
```bash
cd collab-flow-api
npm run dev
```

**Terminal 2: Start the Auth Backend**
```bash
cd google-oauth-backend
npm run dev
```

**Terminal 3: Start the Frontend**
```bash
cd sync-forge
npm run dev
```

## 2. Log In and Get the Token

1.  Once all services are running, open your browser and go to the `sync-forge` application (usually at `http://localhost:5173`).
2.  Click the 'Sign in with Google' button and complete the login process.
3.  After you are redirected back to the application, open your browser's **Developer Tools** (usually by pressing F12 or Ctrl+Shift+I).
4.  Go to the **Network** tab.
5.  Look for a `POST` request to a URL that ends with `/api/auth/token` or `/api/auth/internal-refresh`.
6.  Click on that request, and in the **Response** or **Preview** tab, you will see a JSON object.
7.  Find the `internal_access_token` property and copy its value.

## 3. Use the Token in Swagger

1.  Go back to the Swagger UI for `collab-flow-api` (at `http://localhost:3002/api-docs`).
2.  Click the **Authorize** button.
3.  In the dialog, paste the `internal_access_token` you copied into the **Value** field.
4.  Click **Authorize**.

Now you should be able to successfully make requests to the protected API endpoints through the Swagger UI.
