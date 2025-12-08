import dotenv from 'dotenv'
import type { StringValue } from 'ms'

dotenv.config()

const requiredEnvVars = [
  `PORT`,
  `JWT_SECRET`,
  `JWT_EXPIRES_IN`,
  `GOOGLE_CLIENT_ID` // Added for consistency, though may not be used directly yet
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`)
  }
}

const config = {
  port: process.env.PORT!,
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN! as StringValue
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!
  }
}

export default config
