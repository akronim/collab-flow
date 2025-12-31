import dotenv from 'dotenv'
import type { StringValue } from 'ms'

dotenv.config()

const isTest = process.env.NODE_ENV === `test`

// In test mode, most tests mock config, so only check basic vars
// In production/development, require all vars
const requiredEnvVars = isTest
  ? [] // Tests mock config directly
  : [
    `NODE_ENV`,
    `PORT`,
    `COLLAB_FLOW_API_URL`,
    `DATABASE_URL`,
    `GOOGLE_CLIENT_ID`,
    `GOOGLE_CLIENT_SECRET`,
    `REDIRECT_URI`,
    `SESSION_SECRET`,
    `SESSION_MAX_AGE`,
    `INTERNAL_JWT_SECRET`,
    `INTERNAL_JWT_EXPIRES_IN`,
    `GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY`,
    `CORS_ORIGIN`
  ]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`)
  }
}

const config = {
  nodeEnv: process.env.NODE_ENV ?? `test`,
  port: process.env.PORT ?? `3001`,
  collabFlowApiUrl: process.env.COLLAB_FLOW_API_URL ?? ``,
  db: {
    url: process.env.DATABASE_URL ?? ``
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? ``,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ``,
    redirectUri: process.env.REDIRECT_URI ?? ``
  },
  session: {
    secret: process.env.SESSION_SECRET ?? `test-secret`,
    maxAge: (process.env.SESSION_MAX_AGE ?? `1d`) as StringValue
  },
  internalJwt: {
    secret: process.env.INTERNAL_JWT_SECRET ?? `test-jwt-secret`,
    expiresIn: (process.env.INTERNAL_JWT_EXPIRES_IN ?? `5m`) as StringValue
  },
  encryption: {
    key: process.env.GOOGLE_REFRESH_TOKEN_ENCRYPTION_KEY ?? ``
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? ``
  }
}

export default config
