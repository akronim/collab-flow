import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request } from 'express'
import http from 'http'
import type * as net from 'net'
import { gatewayProxyOptions } from '../../middleware/gateway.middleware'
import config from '../../config'
import Logger from '../../utils/logger'

vi.mock(`../../config`, () => ({
  default: {
    collabFlowApiUrl: `http://mock-api.com`
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
    it(`should set Authorization header if present in original request`, () => {
      const mockProxyReq = {
        path: `/api/projects`,
        setHeader: vi.fn(),
        removeHeader: vi.fn() // Added to prevent TypeError
      } as unknown as http.ClientRequest

      const mockReq = {
        headers: {
          authorization: `Bearer test-token`
        },
        originalUrl: `/projects`
      } as Request

      const mockRes = {} as http.ServerResponse


      const proxyReqHandler = gatewayProxyOptions.on?.proxyReq as (
        proxyReq: http.ClientRequest,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      proxyReqHandler(mockProxyReq, mockReq, mockRes)

      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(`Authorization`, `Bearer test-token`)
      expect(Logger.log).toHaveBeenCalledWith(
        `[Gateway] Proxying request to /api/projects for original URL: /projects`
      )
    })

    it(`should not set Authorization header if not present in original request`, () => {

      const mockProxyReq = {
        path: `/api/users`,
        setHeader: vi.fn(),
        removeHeader: vi.fn() // Added to prevent TypeError
      } as unknown as http.ClientRequest

      const mockReq = {
        headers: {},
        originalUrl: `/users`
      } as Request

      const mockRes = {} as http.ServerResponse

      const proxyReqHandler = gatewayProxyOptions.on?.proxyReq as (
        proxyReq: http.ClientRequest,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      proxyReqHandler(mockProxyReq, mockReq, mockRes)

      expect(mockProxyReq.setHeader).not.toHaveBeenCalled()
      expect(Logger.log).toHaveBeenCalledWith(
        `[Gateway] Proxying request to /api/users for original URL: /users`
      )
    })

    it(`should remove the 'cookie' header from the proxy request`, () => {
      const mockProxyReq = {
        path: `/api/projects`,
        removeHeader: vi.fn(),
        setHeader: vi.fn()
      } as unknown as http.ClientRequest

      const mockReq = {
        headers: {
          cookie: `session=abc`
        },
        originalUrl: `/projects`
      } as Request

      const mockRes = {} as http.ServerResponse

      const proxyReqHandler = gatewayProxyOptions.on?.proxyReq as (
        proxyReq: http.ClientRequest,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      proxyReqHandler(mockProxyReq, mockReq, mockRes)

      expect(mockProxyReq.removeHeader).toHaveBeenCalledWith(`cookie`)
    })

    it(`should log the correct information`, () => {
      const mockProxyReq = {
        path: `/api/tasks`,
        setHeader: vi.fn(),
        removeHeader: vi.fn() // Added to prevent TypeError
      } as unknown as http.ClientRequest

      const mockReq = {
        headers: {
          authorization: `Bearer another-token`
        },
        originalUrl: `/tasks`
      } as Request

      const mockRes = {} as http.ServerResponse

      const proxyReqHandler = gatewayProxyOptions.on?.proxyReq as (
        proxyReq: http.ClientRequest,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      proxyReqHandler(mockProxyReq, mockReq, mockRes)

      expect(Logger.log).toHaveBeenCalledTimes(1)
      expect(Logger.log).toHaveBeenCalledWith(
        `[Gateway] Proxying request to /api/tasks for original URL: /tasks`
      )
    })

    it(`should forward request body for POST/PUT/PATCH requests`, () => {
      const mockProxyReq = {
        path: `/api/projects`,
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        removeHeader: vi.fn()
      } as unknown as http.ClientRequest

      const mockBody = { name: `Test Project`, description: `A description` }
      const mockReq = {
        headers: {},
        originalUrl: `/projects`,
        method: `POST`,
        body: mockBody
      } as Request

      const mockRes = {} as http.ServerResponse

      const proxyReqHandler = gatewayProxyOptions.on?.proxyReq as (
        proxyReq: http.ClientRequest,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      proxyReqHandler(mockProxyReq, mockReq, mockRes)

      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(`Content-Type`, `application/json`)
      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(`Content-Length`, Buffer.byteLength(JSON.stringify(mockBody)))
      expect(mockProxyReq.write).toHaveBeenCalledWith(JSON.stringify(mockBody))
    })

    it(`should not forward request body if expressReq.body is empty`, () => {
      const mockProxyReq = {
        path: `/api/projects`,
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        removeHeader: vi.fn()
      } as unknown as http.ClientRequest

      const mockReq = {
        headers: {},
        originalUrl: `/projects`,
        method: `POST`,
        body: {} // Empty body
      } as Request

      const mockRes = {} as http.ServerResponse

      const proxyReqHandler = gatewayProxyOptions.on?.proxyReq as (
        proxyReq: http.ClientRequest,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      proxyReqHandler(mockProxyReq, mockReq, mockRes)

      expect(mockProxyReq.write).not.toHaveBeenCalled()
      expect(mockProxyReq.setHeader).not.toHaveBeenCalledWith(`Content-Type`, expect.any(String))
      expect(mockProxyReq.setHeader).not.toHaveBeenCalledWith(`Content-Length`, expect.any(Number))
    })

    it(`should not forward request body for GET/HEAD/DELETE requests even if body present`, () => {
      const mockProxyReq = {
        path: `/api/projects`,
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        removeHeader: vi.fn()
      } as unknown as http.ClientRequest

      const mockBody = { someData: `this should not be sent` }
      const mockReq = {
        headers: {},
        originalUrl: `/projects`,
        method: `GET`, // Or HEAD, DELETE
        body: mockBody
      } as Request

      const mockRes = {} as http.ServerResponse

      const proxyReqHandler = gatewayProxyOptions.on?.proxyReq as (
        proxyReq: http.ClientRequest,
        req: http.IncomingMessage,
        res: http.ServerResponse | net.Socket
      ) => void

      proxyReqHandler(mockProxyReq, mockReq, mockRes)

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
