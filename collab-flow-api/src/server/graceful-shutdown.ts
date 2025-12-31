import type { Server } from 'http'
import Logger from '../utils/logger'

type CloseConnectionFn = () => Promise<void>

/**
 * Sets up graceful shutdown handlers for SIGTERM and SIGINT signals.
 * Ensures the HTTP server and database connections are properly closed
 * before the process exits.
 *
 * @param server - The HTTP server instance to close
 * @param closeConnection - Function to close database connections
 */
export function setupGracefulShutdown(server: Server, closeConnection: CloseConnectionFn): void {
  const shutdown = async (signal: string): Promise<void> => {
    Logger.log(`${signal} received, shutting down gracefully...`)

    try {
      // First, stop accepting new connections
      await new Promise<void>(resolve => {
        server.close(() => {
          Logger.log(`HTTP server closed`)
          resolve()
        })
      })

      // Then close database connections
      await closeConnection()
      Logger.log(`Database connections closed`)

      Logger.log(`Graceful shutdown complete`)
      process.exit(0)
    } catch (error) {
      Logger.error(`Error during shutdown:`, error)
      process.exit(1)
    }
  }

  process.on(`SIGTERM`, () => {
    void shutdown(`SIGTERM`)
  })
  process.on(`SIGINT`, () => {
    void shutdown(`SIGINT`)
  })
}
