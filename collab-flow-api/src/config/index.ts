import dotenv from 'dotenv'

dotenv.config()

const isTest = process.env.NODE_ENV === `test`

// Tests only need DATABASE_URL - they don't start a real server or validate JWTs
const requiredEnvVars = isTest
  ? [`DATABASE_URL`]
  : [`PORT`, `INTERNAL_JWT_SECRET`, `DATABASE_URL`]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`)
  }
}

if (process.env.NODE_ENV === `test` && !process.env.DATABASE_URL!.includes(`test`)) {
  throw new Error(`DATABASE_URL must contain "test" when NODE_ENV is "test" to prevent accidental data loss.`)
}

const config = {
  port: parseInt(process.env.PORT || `0`, 10),
  jwt: {
    secret: process.env.INTERNAL_JWT_SECRET || ``
  },
  db: {
    url: process.env.DATABASE_URL!
  }
}

export default config
