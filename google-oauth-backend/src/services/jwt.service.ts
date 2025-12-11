import jwt, { type SignOptions } from 'jsonwebtoken'
import type { StringValue } from 'ms'
import config from '../config'

/**
 * Service for handling JSON Web Tokens (JWTs).
 *
 * This service encapsulates the logic for signing and verifying JWTs,
 * making it easy to manage tokens throughout the application.
 */
export class JwtService {
  private readonly secret: string
  private readonly expiresIn: StringValue | number

  /**
   * Creates an instance of JwtService.
   * @param secret The secret key used for signing and verifying tokens.
   * @param expiresIn The expiration time for the tokens (e.g., "15m", "1h", or seconds as a number).
   */
  constructor(secret: string, expiresIn: StringValue | number) {
    if (!secret) {
      throw new Error(`JWT secret is required.`)
    }
    this.secret = secret
    this.expiresIn = expiresIn
  }

  /**
   * Signs a payload to create a new JWT.
   * @param payload The payload to sign.
   * @returns The generated JWT string.
   */
  public sign(payload: object): string {
    const options: SignOptions = {
      expiresIn: this.expiresIn
    }
    return jwt.sign(payload, this.secret, options)
  }

  /**
   * Verifies a JWT.
   * @param token The JWT string to verify.
   * @returns The decoded payload if the token is valid.
   * @throws An error if the token is invalid or expired.
   */
  public verify<T>(token: string): T {
    return jwt.verify(token, this.secret) as T
  }
}

export default new JwtService(config.internalJwt.secret as string, config.internalJwt.expiresIn)
