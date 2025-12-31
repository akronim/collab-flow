import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Server } from 'http'

type CloseConnectionFn = () => Promise<void>

/**
 * Helper to wait for async operations triggered by signal handlers.
 * Since handlers use `void shutdown()`, we need to wait for effects.
 */
const waitForShutdown = (): Promise<void> => new Promise(resolve => setImmediate(resolve))

describe(`Graceful Shutdown`, () => {
  let mockServer: { close: ReturnType<typeof vi.fn> }
  let mockCloseConnection: CloseConnectionFn
  let processListeners: Map<string, () => void>

  beforeEach(() => {
    vi.resetModules()
    processListeners = new Map()

    // Mock process.on to capture signal handlers
    vi.spyOn(process, `on`).mockImplementation((event: string | symbol, listener: () => void) => {
      processListeners.set(String(event), listener)
      return process
    })

    // Mock process.exit
    vi.spyOn(process, `exit`).mockImplementation(() => undefined as never)

    // Mock server
    mockServer = {
      close: vi.fn((callback?: () => void) => {
        if (callback) {
          callback()
        }
      })
    }

    // Mock database connection close
    mockCloseConnection = vi.fn().mockResolvedValue(undefined) as unknown as CloseConnectionFn
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe(`setupGracefulShutdown`, () => {
    it(`should register SIGTERM handler`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      expect(processListeners.has(`SIGTERM`)).toBe(true)
    })

    it(`should register SIGINT handler`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      expect(processListeners.has(`SIGINT`)).toBe(true)
    })

    it(`should close server on SIGTERM`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      const sigterm = processListeners.get(`SIGTERM`)
      sigterm?.()
      await waitForShutdown()

      expect(mockServer.close).toHaveBeenCalled()
    })

    it(`should close database connection on SIGTERM`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      const sigterm = processListeners.get(`SIGTERM`)
      sigterm?.()
      await waitForShutdown()

      expect(mockCloseConnection).toHaveBeenCalled()
    })

    it(`should exit with code 0 on successful shutdown`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      const sigterm = processListeners.get(`SIGTERM`)
      sigterm?.()
      await waitForShutdown()

      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it(`should close server before database connection`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)
      const callOrder: string[] = []

      mockServer.close = vi.fn((callback?: () => void) => {
        callOrder.push(`server`)
        if (callback) {
          callback()
        }
      })
      mockCloseConnection = vi.fn().mockImplementation(() => {
        callOrder.push(`db`)
        return Promise.resolve()
      }) as unknown as CloseConnectionFn

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      const sigterm = processListeners.get(`SIGTERM`)
      sigterm?.()
      await waitForShutdown()

      expect(callOrder).toEqual([`server`, `db`])
    })

    it(`should handle SIGINT the same as SIGTERM`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      const sigint = processListeners.get(`SIGINT`)
      sigint?.()
      await waitForShutdown()

      expect(mockServer.close).toHaveBeenCalled()
      expect(mockCloseConnection).toHaveBeenCalled()
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it(`should exit with code 1 if shutdown fails`, async () => {
      const { setupGracefulShutdown } = await import(`../../server/graceful-shutdown`)

      mockCloseConnection = vi.fn().mockRejectedValue(new Error(`Connection close failed`)) as unknown as CloseConnectionFn

      setupGracefulShutdown(mockServer as unknown as Server, mockCloseConnection)

      const sigterm = processListeners.get(`SIGTERM`)
      sigterm?.()
      await waitForShutdown()

      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})
