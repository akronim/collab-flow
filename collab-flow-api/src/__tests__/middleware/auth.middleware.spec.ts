import express, { type Request, type Response, type NextFunction } from 'express'
import supertest from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { generateKeyPairSync } from 'crypto'
import jwt from 'jsonwebtoken'
import { expressjwt, type GetVerificationKey } from 'express-jwt'
import Logger from '@/utils/logger'

const GOOGLE_CLIENT_ID = `test-client-id.apps.googleusercontent.com`
const GOOGLE_ISSUER = `https://accounts.google.com`

const { privateKey, publicKey } = generateKeyPairSync(`rsa`, {
  modulusLength: 2048,
  publicKeyEncoding: { type: `spki`, format: `pem` },
  privateKeyEncoding: { type: `pkcs8`, format: `pem` }
})

const createTestToken = (payload: object, opts?: { keyid?: string }): string => {
  return jwt.sign(payload, privateKey, {
    algorithm: `RS256`,
    ...(opts?.keyid ? { keyid: opts.keyid } : {})
  })
}

export const checkJwtLocal = expressjwt({
  secret: publicKey as unknown as GetVerificationKey, // ok for tests
  audience: GOOGLE_CLIENT_ID,
  issuer: GOOGLE_ISSUER,
  algorithms: [`RS256`]
})

const buildApp = (): ReturnType<typeof express> => {
  const app = express()
  app.use(express.json())

  app.get(`/protected`, checkJwtLocal, (req: Request, res: Response) => {
    res.status(200).json({ message: `success`, auth: (req as any).auth })
  })

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err.name === `UnauthorizedError`) {
      res.status(401).json({ message: `Invalid or missing token` })
    } else {
      Logger.error(err.stack)
      res.status(500).json({ message: `Internal Server Error` })
    }
  })

  return app
}

describe(`auth.middleware (local test)`, () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(() => {
    vi.stubEnv(`GOOGLE_CLIENT_ID`, GOOGLE_CLIENT_ID)
    app = buildApp()
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it(`should return 401 if no token is provided`, async () => {
    const res = await supertest(app).get(`/protected`)
    expect(res.status).toBe(401)
    expect(res.body.message).toBeDefined()
  })

  it(`should return 401 if token is malformed`, async () => {
    const res = await supertest(app)
      .get(`/protected`)
      .set(`Authorization`, `Bearer not-a-jwt`)

    expect(res.status).toBe(401)
    expect(res.body.message).toBeDefined()
  })

  it(`should return 401 for wrong issuer`, async () => {
    const token = createTestToken({
      iss: `https://wrong-issuer.example`,
      aud: GOOGLE_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    })

    const res = await supertest(app)
      .get(`/protected`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toBeDefined()
  })

  it(`should return 401 for wrong audience`, async () => {
    const token = createTestToken({
      iss: GOOGLE_ISSUER,
      aud: `some-other-audience`,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    })

    const res = await supertest(app)
      .get(`/protected`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toBeDefined()
  })

  it(`should pass with a valid token`, async () => {
    const token = createTestToken({
      iss: GOOGLE_ISSUER,
      aud: GOOGLE_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      sub: `test-subject`
    })

    const res = await supertest(app)
      .get(`/protected`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe(`success`)
    expect(res.body.auth.sub).toBe(`test-subject`)
  })

  it(`should return 401 for a token signed with a different private key`, async () => {
    const { privateKey: otherPrivate } = generateKeyPairSync(`rsa`, {
      modulusLength: 2048,
      publicKeyEncoding: { type: `spki`, format: `pem` },
      privateKeyEncoding: { type: `pkcs8`, format: `pem` }
    })

    const token = jwt.sign({
      iss: GOOGLE_ISSUER,
      aud: GOOGLE_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      sub: `test-subject`
    }, otherPrivate, { algorithm: `RS256` })

    const res = await supertest(app)
      .get(`/protected`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toBeDefined()
  })
})
