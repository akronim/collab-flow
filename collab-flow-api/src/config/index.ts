import dotenv from 'dotenv'

dotenv.config()

const requiredEnvVars = [
  `PORT`,
  `INTERNAL_JWT_SECRET`
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`)
  }
}

const config = {
  port: process.env.PORT!,
  jwt: {
    secret: process.env.INTERNAL_JWT_SECRET!
  }
}

export default config
