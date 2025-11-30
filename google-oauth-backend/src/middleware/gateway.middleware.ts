import { createProxyMiddleware, type Options } from 'http-proxy-middleware'
import http from 'http'
import type * as net from 'net'
import config from '../config'
import Logger from '../utils/logger'
import { type Request } from 'express' // Import Request from express for casting

/**
 * Configuration options for the API Gateway proxy.
 * Exported to be reusable and testable.
 */
export const gatewayProxyOptions: Options = {
  target: config.collabFlowApiUrl,
  changeOrigin: true,
  timeout: 30000, // Socket timeout in milliseconds
  proxyTimeout: 30000, // Overall proxy timeout in milliseconds
  pathRewrite: (path: string) => {
    // When Express mounts `apiRouter` under `/api`, it strips the `/api` prefix from the path.
    // So, an incoming `/api/projects` becomes `/projects` by the time it reaches `gatewayProxy`.
    // The collab-flow-api, however, explicitly expects the `/api/` prefix for its routes.
    // This function re-adds the `/api/` prefix to ensure the correct path is sent to collab-flow-api.
    // It also prevents double-prefixing by checking if the path already starts with `/api/`.
    if (path === `/api` || path.startsWith(`/api/`)) {
      return path
    }
    return `/api${path}`
  },

  on: {
    proxyReq: (proxyReq, req: http.IncomingMessage, _res: http.ServerResponse | net.Socket) => {
      // Cast the incoming request to Express.Request to access augmented properties
      const expressReq = req as Request
      const authorizationHeader = expressReq.headers.authorization
      if (authorizationHeader) {
        proxyReq.setHeader(`Authorization`, authorizationHeader)
      }

      // Remove sensitive headers that shouldn't be forwarded to downstream services
      proxyReq.removeHeader(`cookie`)

      // Forward request body for POST/PUT/PATCH
      if (
        expressReq.body &&
        Object.keys(expressReq.body).length > 0 &&
        [`POST`, `PUT`, `PATCH`].includes(expressReq.method as string)
      ) {
        const bodyData = JSON.stringify(expressReq.body)
        proxyReq.setHeader(`Content-Type`, `application/json`)
        proxyReq.setHeader(`Content-Length`, Buffer.byteLength(bodyData))
        proxyReq.write(bodyData)
      }

      Logger.log(`[Gateway] Proxying request to ${proxyReq.path} for original URL: ${expressReq.originalUrl}`)
    },
    error: (err: Error, req: http.IncomingMessage, res: http.ServerResponse | net.Socket) => {
      // Cast the incoming request to Express.Request to access augmented properties
      const expressReq = req as Request
      Logger.error(`[Gateway] Proxy error for ${expressReq.url}:`, err) // Log with more context
      if (res instanceof http.ServerResponse && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': `application/json` }) // Use 502 Bad Gateway
        res.end(JSON.stringify({
          error: `Bad Gateway`,
          message: `Unable to reach downstream service`,
          path: expressReq.url // Include path for client debugging
        }))
      }
    },
    proxyRes: (proxyRes: http.IncomingMessage, req: http.IncomingMessage, _res: http.ServerResponse | net.Socket) => {
      const expressReq = req as Request
      Logger.log(`[Gateway] Response ${proxyRes.statusCode} for ${expressReq.originalUrl}`)
    }
  }
}

/**
 * The core proxy middleware for the API Gateway.
 */
export const gatewayProxy = createProxyMiddleware(gatewayProxyOptions)

