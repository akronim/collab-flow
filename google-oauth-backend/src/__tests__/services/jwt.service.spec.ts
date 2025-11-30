import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { JwtService } from '../../services/jwt.service'

describe(`JwtService`, () => {
  const secret = `test-secret`
  const expiresIn = `1s`
  const jwtService = new JwtService(secret, expiresIn)

  it(`should throw an error if instantiated without a secret`, () => {
    expect(() => new JwtService(undefined as any, `1h`)).toThrow(`JWT secret is required.`)
  })

  describe(`sign`, () => {
    it(`should sign a payload and return a JWT string`, () => {
      const payload = { userId: `123`, role: `admin` }
      const token = jwtService.sign(payload)

      expect(typeof token).toBe(`string`)

      const decoded = jwt.decode(token) as { [key: string]: any }
      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.role).toBe(payload.role)
      expect(decoded.exp).toBeDefined()
      expect(decoded.iat).toBeDefined()
    })
  })

  describe(`verify`, () => {
    it(`should verify a valid token and return the payload`, () => {
      const payload = { userId: `456` }
      const token = jwtService.sign(payload)
      const decoded = jwtService.verify<{ userId: string }>(token)

      expect(decoded.userId).toBe(payload.userId)
    })

    it(`should throw an error for a token signed with a different secret`, () => {
      const otherJwtService = new JwtService(`different-secret`, expiresIn)
      const payload = { userId: `789` }
      const token = otherJwtService.sign(payload)

      expect(() => jwtService.verify(token)).toThrow(/invalid signature/)
    })

    it(`should throw an error for an expired token`, async () => {
      const payload = { userId: `101` }
      const token = jwtService.sign(payload)

      // Wait for the token to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(() => jwtService.verify(token)).toThrow(/jwt expired/)
    })

    it(`should throw an error for a malformed token`, () => {
      const malformedToken = `this-is-not-a-valid-token`
      expect(() => jwtService.verify(malformedToken)).toThrow(/jwt malformed/)
    })
  })
})
