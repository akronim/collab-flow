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

// Mock config
vi.mock(`../../config`, () => ({
  default: {
    nodeEnv: `test`,
    db: {
      url: `postgres://user:pass@localhost:5432/testdb`
    }
  }
}))

describe(`Database Connection`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe(`createDb`, () => {
    it(`should throw error when connection string is empty`, async () => {
      const { createDb } = await import(`../../db`)

      expect(() => createDb(``)).toThrow(`Database connection string is required`)
    })

    it(`should create connection with pool configuration`, async () => {
      const { createDb } = await import(`../../db`)

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

    it(`should use smaller default pool size for session store`, async () => {
      const { createDb } = await import(`../../db`)

      createDb(`postgres://user:pass@localhost:5432/testdb`)

      const callArgs = postgresMock.mock.calls[0][1] as { max: number }
      expect(callArgs.max).toBe(10) // Smaller than main API
    })

    it(`should return DbConnection with close method`, async () => {
      const { createDb } = await import(`../../db`)

      const connection = createDb(`postgres://user:pass@localhost:5432/testdb`)

      expect(connection).toHaveProperty(`sql`)
      expect(connection).toHaveProperty(`close`)
      expect(typeof connection.close).toBe(`function`)
    })

    it(`should allow custom pool options to override defaults`, async () => {
      const { createDb } = await import(`../../db`)

      createDb(`postgres://user:pass@localhost:5432/testdb`, { max: 5 })

      const callArgs = postgresMock.mock.calls[0][1] as { max: number }
      expect(callArgs.max).toBe(5)
    })
  })

  describe(`Pool Configuration Constants`, () => {
    it(`should export DEFAULT_POOL_CONFIG`, async () => {
      const { DEFAULT_POOL_CONFIG } = await import(`../../db`)

      expect(DEFAULT_POOL_CONFIG).toBeDefined()
      expect(DEFAULT_POOL_CONFIG).toHaveProperty(`max`)
      expect(DEFAULT_POOL_CONFIG).toHaveProperty(`idle_timeout`)
      expect(DEFAULT_POOL_CONFIG).toHaveProperty(`connect_timeout`)
    })
  })
})
