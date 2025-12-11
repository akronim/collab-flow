import { describe, it, expect, vi, beforeEach } from 'vitest'
import http from 'http'
import type * as net from 'net'
import { gatewayProxyOptions } from '../../middleware/gateway.middleware'
import config from '../../config'
import Logger from '../../utils/logger'
import jwtService from '../../services/jwt.service'

vi.mock(`../../config`, () => ({
  default: {
    nodeEnv: `test`,
    port: `3001`,
    collabFlowApiUrl: `http://mock-api.com`,
    google: {
      clientId: `test_client_id`,
      clientSecret: `test_client_secret`,
      redirectUri: `http://localhost:5173/auth/callback`
    },
    session: {
      secret: `test-session-secret`,
      maxAge: `7d`
    },
    internalJwt: {
      secret: `test-internal-jwt-secret`,
      expiresIn: `5m`
    },
    encryption: {
      key: `f1d2d2f924e986ac86fdf7b36c94bcdfadd2de1c89559c48c809e21824425429`
    },
    cors: {
      origin: `http://localhost:5173`
    }
  }
}))

vi.mock(`../../utils/logger`, () => ({
  default: {
    log: vi.fn(),
    error: vi.fn()
  }
}))

describe(`gatewayProxyOptions`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`should have the correct target and changeOrigin`, () => {
    expect(gatewayProxyOptions.target).toBe(config.collabFlowApiUrl)
    expect(gatewayProxyOptions.changeOrigin).toBe(true)
  })

  describe(`pathRewrite`, () => {
    // Cast the pathRewrite property to a function for testing its behavior
    const rewriteFn = gatewayProxyOptions.pathRewrite as (path: string) => string

    it(`should prepend /api/ to paths that do not start with /api/`, () => {
      expect(rewriteFn(`/projects`)).toBe(`/api/projects`)
      expect(rewriteFn(`/tasks/123`)).toBe(`/api/tasks/123`)
      expect(rewriteFn(`/users`)).toBe(`/api/users`)
    })

    it(`should not prepend /api/ to paths that already start with /api/`, () => {
      expect(rewriteFn(`/api/projects`)).toBe(`/api/projects`)
      expect(rewriteFn(`/api/tasks/123`)).toBe(`/api/tasks/123`)
      expect(rewriteFn(`/api/users`)).toBe(`/api/users`)
      expect(rewriteFn(`/api`)).toBe(`/api`) // Ensure it handles just /api
    })

    it(`should handle root path correctly by prepending /api/`, () => {
      expect(rewriteFn(`/`)).toBe(`/api/`)
    })
  })

  describe(`on.proxyReq`, () => {
    let proxyReqHandler: (
      proxyReq: http.ClientRequest, 
      req: http.IncomingMessage, 
      res: http.ServerResponse | net.Socket
    ) => void
    
    beforeEach(() => {
      // This just extracts the function once for cleaner tests
      proxyReqHandler = gatewayProxyOptions.on?.proxyReq as any
      vi.spyOn(jwtService, `sign`).mockReturnValue(`mock-internal-jwt`)
    })
  
    it(`should create and set Authorization header if session exists`, () => {
      const mockProxyReq = { setHeader: vi.fn(), removeHeader: vi.fn() } as any
      const mockReq = {
        session: { userId: `123`, email: `test@test.com`, name: `Test User` },
        originalUrl: `/projects`
      } as any
  
      proxyReqHandler(mockProxyReq, mockReq, {} as any)
  
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: `123`,
        email: `test@test.com`,
        name: `Test User`
      })
      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(`Authorization`, `Bearer mock-internal-jwt`)
    })
  
    it(`should NOT set Authorization header if session does not exist`, () => {
      const mockProxyReq = { setHeader: vi.fn(), removeHeader: vi.fn() } as any
      const mockReq = { session: {}, originalUrl: `/projects` } as any
  
      proxyReqHandler(mockProxyReq, mockReq, {} as any)
  
      expect(jwtService.sign).not.toHaveBeenCalled()
      expect(mockProxyReq.setHeader).not.toHaveBeenCalledWith(`Authorization`, expect.any(String))
    })
  
    it(`should always remove the cookie header`, () => {
      const mockProxyReq = { setHeader: vi.fn(), removeHeader: vi.fn() } as any
      const mockReqWithCookie = { session: { userId: `123` }, headers: { cookie: `collabflow.sid=abc` } } as any
      const mockReqWithoutCookie = { session: {} } as any
  
      proxyReqHandler(mockProxyReq, mockReqWithCookie, {} as any)
      expect(mockProxyReq.removeHeader).toHaveBeenCalledWith(`cookie`)
  
      proxyReqHandler(mockProxyReq, mockReqWithoutCookie, {} as any)
      expect(mockProxyReq.removeHeader).toHaveBeenCalledWith(`cookie`)
    })
  
    it(`should still forward the request body if present and method is POST/PUT/PATCH`, () => {
      const mockProxyReq = { setHeader: vi.fn(), removeHeader: vi.fn(), write: vi.fn() } as any
      const mockBody = { name: `New Project` }
      const mockReq = {
        session: { userId: `123` },
        method: `POST`,
        body: mockBody,
        originalUrl: `/projects`
      } as any
  
      proxyReqHandler(mockProxyReq, mockReq, {} as any)
  
      const bodyData = JSON.stringify(mockBody)
      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(`Content-Type`, `application/json`)
      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(`Content-Length`, Buffer.byteLength(bodyData))
      expect(mockProxyReq.write).toHaveBeenCalledWith(bodyData)
    })
  
    it(`should not forward request body if expressReq.body is empty`, () => {
      const mockProxyReq = { setHeader: vi.fn(), removeHeader: vi.fn(), write: vi.fn() } as any
      const mockReq = {
        session: { userId: `123` },
        method: `POST`,
        body: {}, // Empty body
        originalUrl: `/projects`
      } as any
  
      proxyReqHandler(mockProxyReq, mockReq, {} as any)
  
      expect(mockProxyReq.write).not.toHaveBeenCalled()
      expect(mockProxyReq.setHeader).not.toHaveBeenCalledWith(`Content-Type`, expect.any(String))
      expect(mockProxyReq.setHeader).not.toHaveBeenCalledWith(`Content-Length`, expect.any(Number))
    })
  
    it(`should not forward request body for GET/HEAD/DELETE requests even if body present`, () => {
      const mockProxyReq = { setHeader: vi.fn(), removeHeader: vi.fn(), write: vi.fn() } as any
      const mockBody = { someData: `this should not be sent` }
      const mockReq = {
        session: { userId: `123` },
        method: `GET`, // Or HEAD, DELETE
        body: mockBody,
        originalUrl: `/projects`
      } as any
  
      proxyReqHandler(mockProxyReq, mockReq, {} as any)
  
      expect(mockProxyReq.write).not.toHaveBeenCalled()
      expect(mockProxyReq.setHeader).not.toHaveBeenCalledWith(`Content-Type`, expect.any(String))
      expect(mockProxyReq.setHeader).not.toHaveBeenCalledWith(`Content-Length`, expect.any(Number))
    })
  })

  describe(`on.error`, () => {
    it(`should log the error and send a 502 response`, () => {
      // Mock class that extends http.ServerResponse
      class MockServerResponse extends http.ServerResponse {
        constructor(req: http.IncomingMessage) {
          super(req)
        }
        writeHead = vi.fn()
        end = vi.fn()
      }

      const mockError = new Error(`Connection refused`)
      const mockReq = { url: `/test-path` } as http.IncomingMessage // Add url for logging
      const mockRes = new MockServerResponse(mockReq) as http.ServerResponse

      const errorHandler = gatewayProxyOptions.on?.error as (
        err: Error,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      errorHandler(mockError, mockReq, mockRes)

      expect(Logger.error).toHaveBeenCalledWith(`[Gateway] Proxy error for ${mockReq.url}:`, mockError)
      expect(mockRes.writeHead).toHaveBeenCalledWith(502, { 'Content-Type': `application/json` })
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          error: `Bad Gateway`,
          message: `Unable to reach downstream service`,
          path: mockReq.url
        })
      )
    })

    it(`should not write headers if headers have already been sent`, () => {
      const mockError = new Error(`Timeout`)
      const mockReq = { url: `/test-path` } as http.IncomingMessage // Add url for logging
      const mockRes = {
        headersSent: true,
        writeHead: vi.fn(),
        end: vi.fn()
      } as unknown as http.ServerResponse

      const errorHandler = gatewayProxyOptions.on?.error as (
        err: Error,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      errorHandler(mockError, mockReq, mockRes)

      // Assertions
      expect(Logger.error).toHaveBeenCalledWith(`[Gateway] Proxy error for ${mockReq.url}:`, mockError)
      expect(mockRes.writeHead).not.toHaveBeenCalled()
      expect(mockRes.end).not.toHaveBeenCalled()
    })

    it(`should handle net.Socket as res`, () => {
      const mockError = new Error(`Socket error`)
      const mockReq = { url: `/test-path` } as http.IncomingMessage // Add url for logging
      const mockSocket = {} as net.Socket

      const errorHandler = gatewayProxyOptions.on?.error as (
        err: Error,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      errorHandler(mockError, mockReq, mockSocket)

      expect(Logger.error).toHaveBeenCalledWith(`[Gateway] Proxy error for ${mockReq.url}:`, mockError)
    })

    it(`should include error message in response`, () => {
      class MockServerResponse extends http.ServerResponse {
        constructor(req: http.IncomingMessage) {
          super(req)
        }
        writeHead = vi.fn()
        end = vi.fn()
      }

      const mockError = new Error(`Service unavailable`)
      const mockReq = { url: `/test-path` } as http.IncomingMessage // Add url for logging
      const mockRes = new MockServerResponse(mockReq) as http.ServerResponse

      const errorHandler = gatewayProxyOptions.on?.error as (
        err: Error,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      errorHandler(mockError, mockReq, mockRes)

      expect(Logger.error).toHaveBeenCalledWith(`[Gateway] Proxy error for ${mockReq.url}:`, mockError)
      expect(mockRes.writeHead).toHaveBeenCalledWith(502, { 'Content-Type': `application/json` })
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          error: `Bad Gateway`,
          message: `Unable to reach downstream service`,
          path: mockReq.url
        })
      )
    })

    it(`should return detailed 502 Bad Gateway response with specific message and path`, () => {
      class MockServerResponse extends http.ServerResponse {
        constructor(req: http.IncomingMessage) {
          super(req)
        }
        writeHead = vi.fn()
        end = vi.fn()
      }

      const mockError = new Error(`Connection timeout from upstream`)
      const mockReq = { url: `/api/projects` } as http.IncomingMessage
      const mockRes = new MockServerResponse(mockReq) as http.ServerResponse

      const errorHandler = gatewayProxyOptions.on?.error as (
        err: Error,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      errorHandler(mockError, mockReq, mockRes)

      expect(Logger.error).toHaveBeenCalledWith(
        `[Gateway] Proxy error for ${mockReq.url}:`,
        mockError
      )
      expect(mockRes.writeHead).toHaveBeenCalledWith(502, { 'Content-Type': `application/json` })
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          error: `Bad Gateway`,
          message: `Unable to reach downstream service`,
          path: mockReq.url
        })
      )
    })
  })

  describe(`configuration structure`, () => {
    it(`should have the on property with correct handlers`, () => {
      expect(gatewayProxyOptions.on).toBeDefined()
      expect(typeof gatewayProxyOptions.on?.proxyReq).toBe(`function`)
      expect(typeof gatewayProxyOptions.on?.error).toBe(`function`)
    })

    it(`should have all required properties`, () => {
      expect(gatewayProxyOptions).toHaveProperty(`target`)
      expect(gatewayProxyOptions).toHaveProperty(`changeOrigin`)
      expect(gatewayProxyOptions).toHaveProperty(`pathRewrite`)
      expect(gatewayProxyOptions).toHaveProperty(`on`)
    })

    it(`should have a proxyRes handler for logging responses`, () => {
      expect(gatewayProxyOptions.on).toHaveProperty(`proxyRes`)
      expect(typeof gatewayProxyOptions.on?.proxyRes).toBe(`function`)
    })

    it(`should have a timeout of 30000ms`, () => {
      expect(gatewayProxyOptions).toHaveProperty(`timeout`, 30000)
    })

    it(`should have a proxyTimeout of 30000ms`, () => {
      expect(gatewayProxyOptions).toHaveProperty(`proxyTimeout`, 30000)
    })
  })
})
