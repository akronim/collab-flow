import express, { type Request, type Response, type NextFunction, type Application, type Handler } from 'express'
import supertest from 'supertest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import jwt from 'jsonwebtoken'
import { generateKeyPairSync } from 'crypto'
import { importSPKI, exportJWK } from 'jose'

import { createCheckJwt } from '../../middleware/auth.middleware'
import Logger from '../../utils/logger'

vi.mock(`../../utils/logger`, () => ({
  default: {
    log: vi.fn(),
    error: vi.fn()
  }
}))

const { publicKey, privateKey } = generateKeyPairSync(`rsa`, {
  modulusLength: 2048
})

const mswServer = setupServer()

let app: Application
let checkJwt: Handler

beforeAll(async () => {
  vi.stubEnv(`GOOGLE_CLIENT_ID`, `test-client-id.apps.googleusercontent.com`)

  checkJwt = createCheckJwt()
  app = express()
  app.use(express.json())

  app.get(`/test`, checkJwt, (req: any, res) => {
    res.json({
      message: `Success`,
      user: req.auth
    })
  })

  // Same error handler as your server.ts
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err.name === `UnauthorizedError`) {
      res.status(401).json({ message: `Invalid or missing token` })
    } else {
      Logger.error(err.stack)
      res.status(500).json({ message: `Internal Server Error` })
    }
  })


  const spkiPem = publicKey.export({ format: `pem`, type: `spki` }) as Buffer
  const publicJwk = await exportJWK(await importSPKI(spkiPem.toString(), `RS256`))

  publicJwk.kid = `test-kid-2025`
  publicJwk.alg = `RS256`
  publicJwk.use = `sig`

  mswServer.use(
    http.get(`https://www.googleapis.com/oauth2/v3/certs`, () => {
      return HttpResponse.json({
        keys: [publicJwk]
      })
    })
  )

  mswServer.listen({
    onUnhandledRequest(req) {
      const url = new URL(req.url)
      // Ignore all requests to 127.0.0.1 or localhost (from supertest)
      if (url.hostname === `127.0.0.1` || url.hostname === `localhost`) {
        return
      }
      // Only warn on real external unhandled requests
      // eslint-disable-next-line no-console
      console.warn(`[MSW] Unhandled request:`, req.method, req.url)
    }
  })
})

afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())

const signToken = (payload: any, kid = `test-kid-2025`): string =>
  jwt.sign(payload, privateKey, {
    algorithm: `RS256`,
    keyid: kid
  })

describe(`Auth Middleware (checkJwt)`, () => {
  let basePayload: object

  beforeEach(() => {
    basePayload = {
      iss: `https://accounts.google.com`,
      aud: process.env.GOOGLE_CLIENT_ID,
      sub: `test-user-123`,
      email: `test@example.com`,
      email_verified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    }
  })

  it(`should allow access with a valid, verifiable token`, async () => {
    const token = signToken(basePayload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.message).toBe(`Success`)
    expect(response.body.user.sub).toBe(`test-user-123`)
    expect(response.body.user.email).toBe(`test@example.com`)
  })

  it(`should deny access if no token is provided`, async () => {
    const response = await supertest(app).get(`/test`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(`Invalid or missing token`)
  })

  it(`should deny access if token is malformed`, async () => {
    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer this.is.not.a.jwt`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(`Invalid or missing token`)
  })

  it(`should deny access if token is expired`, async () => {
    const payload = { ...basePayload, exp: Math.floor(Date.now() / 1000) - 100 }
    const token = signToken(payload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(`Invalid or missing token`)
  })

  it(`should deny access if Audience (aud) does not match`, async () => {
    const payload = { ...basePayload, aud: `wrong-client-id.apps.googleusercontent.com` }
    const token = signToken(payload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(`Invalid or missing token`)
  })

  it(`should deny access if Issuer (iss) does not match`, async () => {
    const payload = { ...basePayload, iss: `https://evil-hacker.com` }
    const token = signToken(payload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(`Invalid or missing token`)
  })

  it(`should deny access if token is signed with a key unknown to the JWKS endpoint`, async () => {
    const { privateKey: rogueKey } = generateKeyPairSync(`rsa`, { modulusLength: 2048 })

    const token = jwt.sign(basePayload, rogueKey, {
      algorithm: `RS256`,
      keyid: `rogue-kid-never-seen-before`
    })

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(`Invalid or missing token`)
  })
})

describe(`Additional Edge Cases`, () => {
  let basePayload: object

  beforeEach(() => {
    basePayload = {
      iss: `https://accounts.google.com`,
      aud: process.env.GOOGLE_CLIENT_ID,
      sub: `test-user-456`,
      email: `user@example.com`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    }
  })

  it(`should reject token without Bearer prefix`, async () => {
    const token = signToken(basePayload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, token) // Missing "Bearer " prefix

    expect(response.status).toBe(401)
  })

  it(`should decode custom payload fields correctly`, async () => {
    const customPayload = {
      ...basePayload,
      name: `Test User`,
      role: `admin`,
      custom_claim: `custom_value`
    }
    const token = signToken(customPayload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.user.name).toBe(`Test User`)
    expect(response.body.user.role).toBe(`admin`)
    expect(response.body.user.custom_claim).toBe(`custom_value`)
  })

  it(`should handle token without kid in header`, async () => {
    // Sign token without keyid
    const token = jwt.sign(basePayload, privateKey, {
      algorithm: `RS256`
    })

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    // Without a kid, jwks-rsa won't be able to find the signing key
    expect(response.status).toBe(401)
  })

  it(`should reject token with mismatched signature`, async () => {
    // Create a different key pair
    const { privateKey: wrongKey } = generateKeyPairSync(`rsa`, { modulusLength: 2048 })

    // Sign with wrong key but use the correct kid
    const token = jwt.sign(basePayload, wrongKey, {
      algorithm: `RS256`,
      keyid: `test-kid-2025` // Same kid but different key
    })

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    // Signature verification should fail
    expect(response.status).toBe(401)
  })
})

describe(`Router Integration`, () => {
  let basePayload: object

  beforeEach(() => {
    basePayload = {
      iss: `https://accounts.google.com`,
      aud: process.env.GOOGLE_CLIENT_ID,
      sub: `test-user-789`,
      email: `router@example.com`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    }
  })

  it(`should protect multiple routes with the same middleware`, async () => {
    const routerApp = express()
    routerApp.use(express.json())

    const router = express.Router()
    router.use(checkJwt)

    router.get(`/tasks`, (req, res) => res.json({ tasks: [`task1`, `task2`] }))
    router.get(`/projects`, (req, res) => res.json({ projects: [`project1`] }))
    router.get(`/users`, (req, res) => res.json({ users: [`user1`, `user2`] }))

    routerApp.use(`/api`, router)

    routerApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err.name === `UnauthorizedError`) {
        return res.status(401).json({ message: `Invalid or missing token` })
      }
      return res.status(500).json({ message: `Internal Server Error` })
    })

    const token = signToken(basePayload)

    // Test routes are protected without token
    const noTokenTasks = await supertest(routerApp).get(`/api/tasks`)
    expect(noTokenTasks.status).toBe(401)

    const noTokenProjects = await supertest(routerApp).get(`/api/projects`)
    expect(noTokenProjects.status).toBe(401)

    // Test routes allow valid tokens
    const withTokenTasks = await supertest(routerApp)
      .get(`/api/tasks`)
      .set(`Authorization`, `Bearer ${token}`)
    expect(withTokenTasks.status).toBe(200)
    expect(withTokenTasks.body.tasks).toHaveLength(2)

    const withTokenProjects = await supertest(routerApp)
      .get(`/api/projects`)
      .set(`Authorization`, `Bearer ${token}`)
    expect(withTokenProjects.status).toBe(200)
    expect(withTokenProjects.body.projects).toHaveLength(1)
  })

  it(`should include user info in request for authenticated routes`, async () => {
    const profileApp = express()
    profileApp.use(express.json())

    const router = express.Router()
    router.use(checkJwt)

    router.get(`/profile`, (req: any, res) => {
      res.json({
        profile: {
          sub: req.auth?.sub,
          email: req.auth?.email,
          iss: req.auth?.iss
        }
      })
    })

    profileApp.use(`/api`, router)

    profileApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err.name === `UnauthorizedError`) {
        return res.status(401).json({ message: `Invalid or missing token` })
      }
      return res.status(500).json({ message: `Internal Server Error` })
    })

    const token = signToken(basePayload)

    const response = await supertest(profileApp)
      .get(`/api/profile`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.profile.sub).toBe(`test-user-789`)
    expect(response.body.profile.email).toBe(`router@example.com`)
    expect(response.body.profile.iss).toBe(`https://accounts.google.com`)
  })
})

describe(`Error Handler Coverage`, () => {
  it(`should handle UnauthorizedError with proper message`, async () => {
    const response = await supertest(app).get(`/test`)

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ message: `Invalid or missing token` })
  })

  it(`should handle malformed Authorization header`, async () => {
    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `InvalidFormat token123`)

    expect(response.status).toBe(401)
    expect(response.body.message).toBe(`Invalid or missing token`)
  })
})

describe(`Performance and Edge Cases`, () => {
  let basePayload: object

  beforeEach(() => {
    basePayload = {
      iss: `https://accounts.google.com`,
      aud: process.env.GOOGLE_CLIENT_ID,
      sub: `perf-test-user`,
      email: `perf@example.com`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    }
  })

  it(`should handle rapid successive requests with same token`, async () => {
    const token = signToken(basePayload)

    const requests = Array(5).fill(0).map(() =>
      supertest(app)
        .get(`/test`)
        .set(`Authorization`, `Bearer ${token}`)
        .expect(200)
    )

    const responses = await Promise.all(requests)
    responses.forEach(response => {
      expect(response.body.user.sub).toBe(`perf-test-user`)
    })
  })

  it(`should handle token with special characters in claims`, async () => {
    const payload = {
      ...basePayload,
      name: `Test User 🚀`,
      email: `test+special@example.com`,
      custom_field: `value with spaces and @ symbols!`
    }
    const token = signToken(payload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.user.name).toBe(`Test User 🚀`)
    expect(response.body.user.email).toBe(`test+special@example.com`)
  })

  it(`should handle very long tokens gracefully`, async () => {
    const longCustomData = `x`.repeat(1000)
    const payload = {
      ...basePayload,
      long_field: longCustomData,
      another_long_field: `y`.repeat(500)
    }
    const token = signToken(payload)

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(200)
    // The middleware should handle long tokens without issues
  })
})

describe(`Security Edge Cases`, () => {
  it(`should reject tokens with none algorithm`, async () => {
    // This is a security test - "none" algorithm should never be accepted
    const token = jwt.sign(
      {
        iss: `https://accounts.google.com`,
        aud: process.env.GOOGLE_CLIENT_ID,
        sub: `test-user`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      ``, // empty secret for none algorithm
      { algorithm: `none` as any }
    )

    const response = await supertest(app)
      .get(`/test`)
      .set(`Authorization`, `Bearer ${token}`)

    expect(response.status).toBe(401)
  })

})
