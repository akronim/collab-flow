# How to Authenticate with Swagger

To use the protected endpoints in the Swagger UI, you need a JWT (JSON Web Token) that is generated after you log in.

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
3.  After you are redirected back to the application, open a **new browser tab**.
4.  Navigate to the developer token endpoint provided by the auth backend: `http://localhost:3001/api/auth/internal-token`.
5.  You will see a JSON response like `{"token":"ey..."}`.
6.  Copy the long string value of the `token` property (without the quotes).

## 3. Use the Token in Swagger

1.  Go to the Swagger UI for `collab-flow-api` (usually at `http://localhost:3002/api-docs`).
2.  Click the **Authorize** button at the top right of the page.
3.  In the dialog that appears, paste the token you copied into the **Value** field for the `BearerAuth` security scheme.
4.  Click **Authorize** and then **Close**.

You should now be able to successfully make requests to the protected API endpoints through the Swagger UI.