import dotenv from 'dotenv'
import type { StringValue } from 'ms'

dotenv.config()

const config = {
  nodeEnv: process.env.NODE_ENV || `development`,
  port: process.env.PORT || `3001`,
  collabFlowApiUrl: process.env.COLLAB_FLOW_API_URL || `http://localhost:3002`,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI || `http://localhost:5173/auth/callback`
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: (process.env.JWT_EXPIRES_IN || `15m`) as StringValue
  },
  cors: {
    origin: process.env.CORS_ORIGIN || `http://localhost:5173`
  }
}

if (!config.google.clientId || !config.google.clientSecret) {
  throw new Error(`Missing Google OAuth credentials. Please check your .env file.`)
}

if (!config.jwt.secret) {
  throw new Error(`Missing JWT_SECRET. Please check your .env file.`)
}

if (!config.collabFlowApiUrl) {
  throw new Error(`Missing COLLAB_FLOW_API_URL. Please check your .env file.`)
}

export default config
