import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'

// Store mock reference for assertions
let postgresMock: Mock

// Mock postgres before importing the module under test
vi.mock(`postgres`, () => {
  const mockSql = Object.assign(
    () => Promise.resolve([{ result: 1 }]),
    {
      end: vi.fn().mockResolvedValue(undefined),
      options: {}
    }
  )
  postgresMock = vi.fn().mockReturnValue(mockSql)
  return {
    default: postgresMock
  }
})

// Mock drizzle-orm
vi.mock(`drizzle-orm/postgres-js`, () => ({
  drizzle: vi.fn().mockReturnValue({})
}))

// Mock config
vi.mock(`@/config`, () => ({
  default: {
    db: {
      url: `postgres://user:pass@localhost:5432/testdb`
    }
  }
}))

describe(`Database Connection`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module cache to get fresh imports
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe(`createDb`, () => {
    it(`should throw error when connection string is empty`, async () => {
      const { createDb } = await import(`@/db`)

      expect(() => createDb(``)).toThrow(`Database connection string is required`)
    })

    it(`should create connection with pool configuration`, async () => {
      const { createDb } = await import(`@/db`)

      createDb(`postgres://user:pass@localhost:5432/testdb`)

      expect(postgresMock).toHaveBeenCalledWith(
        `postgres://user:pass@localhost:5432/testdb`,
        expect.objectContaining({
          max: expect.any(Number),
          idle_timeout: expect.any(Number),
          connect_timeout: expect.any(Number)
        })
      )
    })

    it(`should use sensible default pool size`, async () => {
      const { createDb } = await import(`@/db`)

      createDb(`postgres://user:pass@localhost:5432/testdb`)

      const callArgs = postgresMock.mock.calls[0][1] as { max: number }
      expect(callArgs.max).toBeGreaterThanOrEqual(10)
      expect(callArgs.max).toBeLessThanOrEqual(50)
    })

    it(`should set idle timeout to prevent connection leaks`, async () => {
      const { createDb } = await import(`@/db`)

      createDb(`postgres://user:pass@localhost:5432/testdb`)

      const callArgs = postgresMock.mock.calls[0][1] as { idle_timeout: number }
      expect(callArgs.idle_timeout).toBeGreaterThanOrEqual(20)
    })

    it(`should set connect timeout for fast failure`, async () => {
      const { createDb } = await import(`@/db`)

      createDb(`postgres://user:pass@localhost:5432/testdb`)

      const callArgs = postgresMock.mock.calls[0][1] as { connect_timeout: number }
      expect(callArgs.connect_timeout).toBeGreaterThanOrEqual(5)
      expect(callArgs.connect_timeout).toBeLessThanOrEqual(30)
    })

    it(`should return DbConnection with close method`, async () => {
      const { createDb } = await import(`@/db`)

      const connection = createDb(`postgres://user:pass@localhost:5432/testdb`)

      expect(connection).toHaveProperty(`db`)
      expect(connection).toHaveProperty(`client`)
      expect(connection).toHaveProperty(`close`)
      expect(typeof connection.close).toBe(`function`)
    })

    it(`should allow custom pool options to override defaults`, async () => {
      const { createDb } = await import(`@/db`)

      createDb(`postgres://user:pass@localhost:5432/testdb`, { max: 5 })

      const callArgs = postgresMock.mock.calls[0][1] as { max: number }
      expect(callArgs.max).toBe(5)
    })
  })

  describe(`Pool Configuration Constants`, () => {
    it(`should export DEFAULT_POOL_CONFIG`, async () => {
      const { DEFAULT_POOL_CONFIG } = await import(`@/db`)

      expect(DEFAULT_POOL_CONFIG).toBeDefined()
      expect(DEFAULT_POOL_CONFIG).toHaveProperty(`max`)
      expect(DEFAULT_POOL_CONFIG).toHaveProperty(`idle_timeout`)
      expect(DEFAULT_POOL_CONFIG).toHaveProperty(`connect_timeout`)
    })
  })
})
