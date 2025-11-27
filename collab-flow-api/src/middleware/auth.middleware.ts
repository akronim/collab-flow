import { expressjwt, type GetVerificationKey } from 'express-jwt'
import jwksRsa from 'jwks-rsa'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error(`Missing GOOGLE_CLIENT_ID environment variable.`)
}

export const checkJwt = expressjwt({
  // Dynamically provide a signing key based on the kid in the header
  // and the signing keys provided by Google's JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://www.googleapis.com/oauth2/v3/certs`
  }) as GetVerificationKey,

  // Validate the audience and the issuer.
  audience: process.env.GOOGLE_CLIENT_ID,
  issuer: `https://accounts.google.com`,
  algorithms: [`RS256`]
})
