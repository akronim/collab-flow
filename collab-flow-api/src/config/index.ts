import dotenv from 'dotenv'
import type { StringValue } from 'ms'

dotenv.config()

const config = {
  port: process.env.PORT || `3002`,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: (process.env.JWT_EXPIRES_IN || `15m`) as StringValue
  }
}

if (!config.jwt.secret) {
  throw new Error(`Missing JWT_SECRET. Please check your .env file.`)
}

export default config
