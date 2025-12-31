import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import type session from 'express-session'
import { PostgresSessionStore } from '../../services/postgresSessionStore.service'

// Mock the logger to avoid noise in tests
vi.mock(`../../utils/logger`, () => ({
  default: { log: vi.fn() }
}))

interface MockSql {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>
  mockFn: Mock
}

describe(`PostgresSessionStore`, () => {
  let store: PostgresSessionStore
  let mockSql: MockSql

  const createMockSql = (): MockSql => {
    const mockFn = vi.fn()
    // Make it callable as a tagged template literal
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => mockFn(strings, ...values)) as MockSql
    sql.mockFn = mockFn
    return sql
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSql = createMockSql()
    store = new PostgresSessionStore(mockSql as any)
  })

  const sid1 = `SID_1`
  const userA = `USER_A`

  const sessionA: session.SessionData = {
    cookie: { maxAge: 86400000 } as any,
    userId: userA,
    email: `userA@example.com`,
    name: `User A`,
    encryptedGoogleRefreshToken: `token123`
  }

  describe(`get()`, () => {
    it(`retrieves a valid session`, async () => {
      const futureDate = new Date(Date.now() + 86400000)
      mockSql.mockFn.mockResolvedValueOnce([{
        data: JSON.stringify(sessionA),
        expires_at: futureDate.toISOString()
      }])

      await new Promise<void>(resolve => {
        store.get(sid1, (err, data) => {
          expect(err).toBeNull()
          expect(data).toBeDefined()
          expect(data?.userId).toBe(userA)
          expect(data?.email).toBe(`userA@example.com`)
          resolve()
        })
      })
    })

    it(`returns null for non-existing session`, async () => {
      mockSql.mockFn.mockResolvedValueOnce([])

      await new Promise<void>(resolve => {
        store.get(`NON_EXISTENT`, (err, data) => {
          expect(err).toBeNull()
          expect(data).toBeNull()
          resolve()
        })
      })
    })

    it(`returns null and deletes expired session (on-read cleanup)`, async () => {
      const pastDate = new Date(Date.now() - 86400000)
      mockSql.mockFn
        .mockResolvedValueOnce([{
          data: JSON.stringify(sessionA),
          expires_at: pastDate.toISOString()
        }])
        .mockResolvedValueOnce([]) // DELETE query

      await new Promise<void>(resolve => {
        store.get(sid1, (err, data) => {
          expect(err).toBeNull()
          expect(data).toBeNull()
          // Verify DELETE was called
          expect(mockSql.mockFn).toHaveBeenCalledTimes(2)
          resolve()
        })
      })
    })

    it(`calls callback with error on database failure`, async () => {
      const dbError = new Error(`Database connection failed`)
      mockSql.mockFn.mockRejectedValueOnce(dbError)

      await new Promise<void>(resolve => {
        store.get(sid1, err => {
          expect(err).toBe(dbError)
          resolve()
        })
      })
    })
  })

  describe(`set()`, () => {
    it(`stores a session with UPSERT`, async () => {
      mockSql.mockFn.mockResolvedValueOnce([])

      await new Promise<void>(resolve => {
        store.set(sid1, sessionA, err => {
          expect(err).toBeUndefined()
          expect(mockSql.mockFn).toHaveBeenCalledTimes(1)
          resolve()
        })
      })
    })

    it(`calls callback with error on database failure`, async () => {
      const dbError = new Error(`Insert failed`)
      mockSql.mockFn.mockRejectedValueOnce(dbError)

      await new Promise<void>(resolve => {
        store.set(sid1, sessionA, err => {
          expect(err).toBe(dbError)
          resolve()
        })
      })
    })

    it(`handles session without userId`, async () => {
      // Cast to any to simulate a minimal session without custom fields
      const sessionNoUser = {
        cookie: { maxAge: 86400000 }
      } as session.SessionData
      mockSql.mockFn.mockResolvedValueOnce([])

      await new Promise<void>(resolve => {
        store.set(sid1, sessionNoUser, err => {
          expect(err).toBeUndefined()
          resolve()
        })
      })
    })
  })

  describe(`destroy()`, () => {
    it(`destroys a session by sid`, async () => {
      mockSql.mockFn.mockResolvedValueOnce([])

      await new Promise<void>(resolve => {
        store.destroy(sid1, err => {
          expect(err).toBeUndefined()
          expect(mockSql.mockFn).toHaveBeenCalledTimes(1)
          resolve()
        })
      })
    })

    it(`calls callback with error on database failure`, async () => {
      const dbError = new Error(`Delete failed`)
      mockSql.mockFn.mockRejectedValueOnce(dbError)

      await new Promise<void>(resolve => {
        store.destroy(sid1, err => {
          expect(err).toBe(dbError)
          resolve()
        })
      })
    })
  })

  describe(`touch()`, () => {
    it(`updates session expiry`, async () => {
      mockSql.mockFn.mockResolvedValueOnce([])

      await new Promise<void>(resolve => {
        store.touch(sid1, sessionA, err => {
          expect(err).toBeUndefined()
          expect(mockSql.mockFn).toHaveBeenCalledTimes(1)
          resolve()
        })
      })
    })

    it(`calls callback with error on database failure`, async () => {
      const dbError = new Error(`Update failed`)
      mockSql.mockFn.mockRejectedValueOnce(dbError)

      await new Promise<void>(resolve => {
        store.touch(sid1, sessionA, err => {
          expect(err).toBe(dbError)
          resolve()
        })
      })
    })
  })

  describe(`destroyAllByUserId()`, () => {
    it(`destroys all sessions for a user`, async () => {
      mockSql.mockFn.mockResolvedValueOnce([])

      await new Promise<void>(resolve => {
        store.destroyAllByUserId(userA, err => {
          expect(err).toBeUndefined()
          expect(mockSql.mockFn).toHaveBeenCalledTimes(1)
          resolve()
        })
      })
    })

    it(`calls callback with error on database failure`, async () => {
      const dbError = new Error(`Delete all failed`)
      mockSql.mockFn.mockRejectedValueOnce(dbError)

      await new Promise<void>(resolve => {
        store.destroyAllByUserId(userA, err => {
          expect(err).toBe(dbError)
          resolve()
        })
      })
    })
  })
})
