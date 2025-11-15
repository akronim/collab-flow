import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: process.env.PORT || '3001',
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.REDIRECT_URI || 'http://localhost:5173/auth/callback',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    }
};

if (!config.google.clientId || !config.google.clientSecret) {
    throw new Error('Missing Google OAuth credentials. Please check your .env file.');
}

export default config;
