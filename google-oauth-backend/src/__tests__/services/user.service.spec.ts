import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FindOrCreateRequest } from '../../types'

// Mock the db module
const mockSql = vi.fn()
vi.mock(`../../db`, () => ({
  getDefaultDb: vi.fn(() => ({ sql: mockSql }))
}))

import { findOrCreateUser } from '../../services/user.service'

describe(`user.service`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe(`findOrCreateUser`, () => {
    const mockUserData: FindOrCreateRequest = {
      googleUserId: `google-123`,
      email: `test@example.com`,
      name: `Test User`,
      avatar: `https://example.com/avatar.jpg`
    }

    const mockDbUser = {
      id: `uuid-456`,
      google_user_id: `google-123`,
      name: `Test User`,
      email: `test@example.com`,
      avatar: `https://example.com/avatar.jpg`,
      role: `member`,
      title: null,
      organization: null,
      status: `active`,
      last_login: new Date(`2024-01-01T00:00:00.000Z`),
      created_at: new Date(`2024-01-01T00:00:00.000Z`),
      updated_at: new Date(`2024-01-01T00:00:00.000Z`)
    }

    it(`creates new user when email not found`, async () => {
      // First call: SELECT returns empty (no existing user)
      // Second call: INSERT returns new user
      mockSql
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockDbUser])

      const result = await findOrCreateUser(mockUserData)

      expect(result.id).toBe(`uuid-456`)
      expect(result.email).toBe(`test@example.com`)
      expect(result.googleUserId).toBe(`google-123`)
      expect(mockSql).toHaveBeenCalledTimes(2)
    })

    it(`returns existing user and updates lastLogin when found by email`, async () => {
      // SELECT returns existing user with googleUserId already linked
      mockSql
        .mockResolvedValueOnce([mockDbUser])
        .mockResolvedValueOnce([{ ...mockDbUser, last_login: new Date() }])

      const result = await findOrCreateUser(mockUserData)

      expect(result.id).toBe(`uuid-456`)
      expect(mockSql).toHaveBeenCalledTimes(2)
    })

    it(`links googleUserId when existing user doesn't have one`, async () => {
      const userWithoutGoogleId = { ...mockDbUser, google_user_id: null }
      const userWithGoogleId = { ...mockDbUser }

      mockSql
        .mockResolvedValueOnce([userWithoutGoogleId])
        .mockResolvedValueOnce([userWithGoogleId])

      const result = await findOrCreateUser(mockUserData)

      expect(result.googleUserId).toBe(`google-123`)
      expect(mockSql).toHaveBeenCalledTimes(2)
    })

    it(`handles user without avatar`, async () => {
      const dataWithoutAvatar: FindOrCreateRequest = {
        googleUserId: `google-789`,
        email: `noavatar@example.com`,
        name: `No Avatar User`
      }
      const userWithoutAvatar = {
        ...mockDbUser,
        id: `uuid-789`,
        email: `noavatar@example.com`,
        name: `No Avatar User`,
        avatar: null
      }

      mockSql
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([userWithoutAvatar])

      const result = await findOrCreateUser(dataWithoutAvatar)

      expect(result.avatar).toBeUndefined()
    })

    it(`throws on database error`, async () => {
      const dbError = new Error(`Database connection failed`)
      mockSql.mockRejectedValueOnce(dbError)

      await expect(findOrCreateUser(mockUserData)).rejects.toThrow(dbError)
    })
  })
})
