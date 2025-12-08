import dotenv from 'dotenv'
import type { StringValue } from 'ms'

dotenv.config()

const requiredEnvVars = [
  `NODE_ENV`,
  `PORT`,
  `COLLAB_FLOW_API_URL`,
  `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`,
  `REDIRECT_URI`,
  `JWT_SECRET`,
  `JWT_EXPIRES_IN`,
  `CORS_ORIGIN`
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`)
  }
}

const config = {
  nodeEnv: process.env.NODE_ENV!,
  port: process.env.PORT!,
  collabFlowApiUrl: process.env.COLLAB_FLOW_API_URL!,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.REDIRECT_URI!
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN! as StringValue
  },
  cors: {
    origin: process.env.CORS_ORIGIN!
  }
}

export default config
