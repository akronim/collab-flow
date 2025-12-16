import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { csrfMiddleware } from '../../middleware/csrf.middleware'
import type TestAgent from 'supertest/lib/agent'
import { errorMiddleware } from '../../middleware/error.middleware'
import * as csrfTokenGeneration from "../../utils/csrfToken"
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../../constants'

const MOCKED_TOKEN = `mocked_csrf_token_value`

vi.mock(`../../config`, () => ({
  default: {
    nodeEnv: `test`
  }
}))

let generateTokenSpy: Mock

beforeEach(() => {
  generateTokenSpy = vi.spyOn(csrfTokenGeneration, `generateCsrfToken`).mockReturnValue(MOCKED_TOKEN)
})

afterEach(() => {
  generateTokenSpy.mockRestore()
  vi.clearAllMocks()
  vi.resetModules()
})

const createApp = (middleware: express.RequestHandler): express.Application => {
  const app = express()
  app.use(cookieParser())
  app.use(middleware)
  app.get(`/test-get`, (req, res) => res.status(200).send(`GET OK`))
  app.post(`/test-post`, (req, res) => res.status(200).send(`POST OK`))
  app.use(errorMiddleware)
  return app

}

describe(`csrfMiddleware`, () => {
  let app: express.Application

  let agent: TestAgent


  beforeEach(() => {
    app = createApp(csrfMiddleware)
    agent = request.agent(app)
  })

  it(`should generate and set a CSRF cookie if one is not present (on GET)`, async () => {
    const res = await agent.get(`/test-get`)

    expect(res.status).toBe(200)
    expect(generateTokenSpy).toHaveBeenCalled()
    expect(res.headers[`set-cookie`]).toEqual([`collabflow.csrf=mocked_csrf_token_value; Path=/; SameSite=Lax`])
  })

  it(`should not generate or reset the CSRF cookie if one is already present`, async () => {
    const firstRes = await agent.get(`/test-get`)
    expect(firstRes.status).toBe(200)
    expect(generateTokenSpy).toHaveBeenCalledTimes(1) // Called once to set the cookie

    generateTokenSpy.mockClear()

    const secondRes = await agent.get(`/test-get`)

    expect(secondRes.status).toBe(200)

    expect(secondRes.headers[`set-cookie`]).toBeUndefined()

    expect(generateTokenSpy).not.toHaveBeenCalled()
  })

  // --- Safe Method Tests (No Validation) ---

  it(`GET - (No Validation)`, async () => {
    const res = await request(app).get(`/test-get`)
    expect(res.status).toBe(200)
    expect(res.text).toEqual(`GET OK`)
  })

  it(`HEAD - (No Validation)`, async () => {
    const res = await request(app).head(`/test-get`)
    expect(res.status).toBe(200)
  })

  it(`OPTIONS - (No Validation)`, async () => {
    const res = await request(app).options(`/test-get`)
    expect(res.status).toBe(200)
    expect(res.text).toEqual(`GET, HEAD`)
  })

  // --- Unsafe Method Validation Tests ---

  it(`should pass a state-changing request (POST) when cookie and header tokens match`, async () => {
    const token = `a_valid_token_123`

    agent.jar.setCookie(`${CSRF_COOKIE_NAME}=${token}; Path=/`)

    const res = await agent
      .post(`/test-post`)
      .set(CSRF_HEADER_NAME, token) // Set the matching header

    expect(res.status).toBe(200)
    expect(res.text).toBe(`POST OK`)
  })

  it(`should fail a state-changing request (POST) when the CSRF header is missing`, async () => {
    const token = `a_valid_token_123`
    agent.jar.setCookie(`${CSRF_COOKIE_NAME}=${token}; Path=/`) // Cookie is present

    const res = await agent
      .post(`/test-post`) // Header is missing

    expect(res.status).toBe(403)
    expect(res.text).toBe(`{"error":"Invalid CSRF token","details":{}}`)
  })

  it(`should fail a state-changing request (POST) when the CSRF cookie is missing`, async () => {
    const headerToken = `a_valid_token_123`

    const res = await agent
      .post(`/test-post`)
      .set(CSRF_HEADER_NAME, headerToken)


    expect(res.status).toBe(403)
    expect(res.text).toBe(`{"error":"Invalid CSRF token","details":{}}`)
  })

  it(`should fail a state-changing request (POST) when cookie and header tokens do not match`, async () => {
    agent.jar.setCookie(`${CSRF_COOKIE_NAME}=wrong_token_456; Path=/`) // Set wrong cookie

    const res = await agent
      .post(`/test-post`)
      .set(CSRF_HEADER_NAME, `correct_token_123`) // Set different header

    expect(res.status).toBe(403)
    expect(res.text).toBe(`{"error":"Invalid CSRF token","details":{}}`)
  })

  // --- Production Environment Test (Secure Flag) ---

  it(`should set the 'Secure' flag on the cookie when nodeEnv is 'production'`, async () => {
    vi.resetModules()

    // Mock the config to simulate a production environment
    vi.doMock(`../../config`, () => ({
      default: { nodeEnv: `production` }
    }))

    // Mock the token generation utility itself
    vi.doMock(`../../utils/csrfToken`, () => ({
      generateCsrfToken: vi.fn().mockReturnValue(MOCKED_TOKEN)
    }))

    // Dynamically import the modules AFTER mocks are set
    const { csrfMiddleware: prodCsrfMiddleware } = await import(`../../middleware/csrf.middleware`)
    const csrfTokenModule = await import(`../../utils/csrfToken`)

    const prodApp = createApp(prodCsrfMiddleware)
    const prodAgent = request.agent(prodApp)

    const res = await prodAgent.get(`/test-get`)

    expect(res.status).toBe(200)

    // Assert that our mocked function was called
    expect(csrfTokenModule.generateCsrfToken).toHaveBeenCalled()

    const cookie = res.headers[`set-cookie`][0]
    expect(cookie).toContain(`Secure`)
    expect(cookie).toContain(MOCKED_TOKEN)
  })
})
